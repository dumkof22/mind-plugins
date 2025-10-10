const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Import addons
const addonModules = {
    'fullhdfilmizlesene': require('./addon-new.js'),
    'inatbox': require('./inat-new.js'),
    'dizipal': require('./dizipal.js'),
    'selcuksports': require('./selcuk.js')
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Fetch with axios (for browser-required requests)
async function fetchWithAxios(fetchOptions, requestId) {
    try {
        console.log(`🔧 [Axios] Fetching: ${fetchOptions.url.substring(0, 80)}...`);

        const config = {
            method: fetchOptions.method || 'GET',
            url: fetchOptions.url,
            headers: fetchOptions.headers || {},
            timeout: fetchOptions.timeout || 30000,
            maxRedirects: 5,
            validateStatus: () => true, // Accept all status codes
        };

        // Add body if POST
        if (fetchOptions.body) {
            config.data = fetchOptions.body;
        }

        // Better headers for CloudFlare bypass
        if (!config.headers['User-Agent']) {
            config.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        }
        if (!config.headers['Accept']) {
            config.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
        }
        if (!config.headers['Accept-Language']) {
            config.headers['Accept-Language'] = 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7';
        }
        if (!config.headers['Accept-Encoding']) {
            config.headers['Accept-Encoding'] = 'gzip, deflate, br';
        }

        const response = await axios(config);

        console.log(`✅ [Axios] Success: ${requestId} (${response.status})`);
        console.log(`📄 [Axios] Body size: ${response.data?.length || 0} bytes`);

        return {
            success: true,
            statusCode: response.status,
            body: response.data,
            headers: response.headers || {}
        };
    } catch (error) {
        console.error(`❌ [Axios] Error: ${requestId} - ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

// Request queue management
class RequestQueue {
    constructor(maxConcurrent = 3) {
        this.queue = [];
        this.active = new Map();
        this.maxConcurrent = maxConcurrent;
    }

    add(requestId, handler) {
        return new Promise((resolve, reject) => {
            this.queue.push({ requestId, handler, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.active.size >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        const item = this.queue.shift();
        this.active.set(item.requestId, item);

        try {
            const result = await item.handler();
            item.resolve(result);
        } catch (error) {
            item.reject(error);
        } finally {
            this.active.delete(item.requestId);
            this.process();
        }
    }
}

// Queue per addon
const addonQueues = {};
Object.keys(addonModules).forEach(addonId => {
    addonQueues[addonId] = new RequestQueue(3);
});

// Active parsing sessions
const activeSessions = new Map();

// Session timeout cleanup
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of activeSessions.entries()) {
        if (now - session.lastActivity > 120000) { // 2 dakika timeout
            console.log(`⏱️  Session timeout: ${sessionId}`);
            activeSessions.delete(sessionId);
        }
    }
}, 30000);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        addons: Object.keys(addonModules),
        activeSessions: activeSessions.size,
        queues: Object.fromEntries(
            Object.entries(addonQueues).map(([id, q]) => [id, {
                active: q.active.size,
                pending: q.queue.length
            }])
        )
    });
});

// Get addon manifest
app.get('/api/addon/:addonId/manifest.json', (req, res) => {
    const { addonId } = req.params;
    const addon = addonModules[addonId];

    if (!addon) {
        return res.status(404).json({ error: 'Addon not found' });
    }

    // Get manifest from addon module
    const manifest = addon.getManifest ? addon.getManifest() : addon.manifest;
    res.json(manifest);
});

// List all addons
app.get('/api/addons', (req, res) => {
    const addons = Object.keys(addonModules).map(id => {
        const addon = addonModules[id];
        const manifest = addon.getManifest ? addon.getManifest() : addon.manifest;
        return {
            id,
            manifestUrl: `${req.protocol}://${req.get('host')}/api/addon/${id}/manifest.json`,
            ...manifest
        };
    });
    res.json({ addons });
});

// Generic handler for catalog/meta/stream
async function handleAddonRequest(req, res, resourceType) {
    const { addonId } = req.params;
    const addon = addonModules[addonId];

    if (!addon) {
        return res.status(404).json({ error: 'Addon not found' });
    }

    const sessionId = req.body.sessionId || uuidv4();
    const requestData = req.body;

    console.log(`\n🎯 [${addonId}] ${resourceType.toUpperCase()} request - Session: ${sessionId}`);
    console.log(`📦 Request data:`, JSON.stringify(requestData, null, 2));

    // Set headers for streaming response
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

    // Create session
    const session = {
        sessionId,
        addonId,
        resourceType,
        requestData,
        fetchQueue: [],
        fetchResults: new Map(),
        lastActivity: Date.now(),
        res
    };

    activeSessions.set(sessionId, session);

    try {
        // Queue'ya ekle ve işle
        await addonQueues[addonId].add(sessionId, async () => {
            return await processAddonRequest(session, addon);
        });
    } catch (error) {
        console.error(`❌ [${addonId}] Error:`, error.message);
        activeSessions.delete(sessionId);
        if (!res.headersSent) {
            res.write(JSON.stringify({
                action: 'complete',
                success: false,
                error: error.message
            }) + '\n');
            res.end();
        }
    }
}

// Process addon request
async function processAddonRequest(session, addon) {
    const { resourceType, requestData, res, sessionId, addonId } = session;

    console.log(`\n⚙️  [Process] Starting ${resourceType} for ${addonId} (session: ${sessionId})`);

    // Create proxy fetch function
    const proxyFetch = createProxyFetch(session);

    try {
        let result;

        if (resourceType === 'catalog') {
            console.log(`📋 [Process] Calling handleCatalog...`);
            result = await addon.handleCatalog(requestData, proxyFetch);
            console.log(`📋 [Process] handleCatalog returned: ${JSON.stringify(result).substring(0, 200)}...`);
        } else if (resourceType === 'meta') {
            console.log(`📺 [Process] Calling handleMeta...`);
            result = await addon.handleMeta(requestData, proxyFetch);
        } else if (resourceType === 'stream') {
            console.log(`🎬 [Process] Calling handleStream...`);
            console.log(`🔍 [Process] Stream status before handler: writableEnded=${res.writableEnded}, finished=${res.finished}`);
            result = await addon.handleStream(requestData, proxyFetch);
            console.log(`🔍 [Process] Stream status after handler: writableEnded=${res.writableEnded}, finished=${res.finished}`);
            console.log(`🎬 [Process] handleStream returned ${result?.streams?.length || 0} streams`);
        }

        // Send final result via stream
        console.log(`✅ [Process] Sending complete response (session: ${sessionId})`);
        res.write(JSON.stringify({
            action: 'complete',
            success: true,
            data: result
        }) + '\n');
        res.end();
    } catch (error) {
        console.error(`❌ [Process] Error in ${resourceType}:`, error.message);
        res.write(JSON.stringify({
            action: 'complete',
            success: false,
            error: error.message
        }) + '\n');
        res.end();
    } finally {
        activeSessions.delete(session.sessionId);
        console.log(`🗑️  [Process] Session cleaned up: ${sessionId}`);
    }
}

// Create proxy fetch function for addon
function createProxyFetch(session) {
    return async function (fetchOptions) {
        const requestId = uuidv4();
        session.lastActivity = Date.now();

        console.log(`\n📤 [ProxyFetch] New fetch request: ${requestId}`);
        console.log(`   Session: ${session.sessionId}`);
        console.log(`   URL: ${fetchOptions.url}`);
        console.log(`   Method: ${fetchOptions.method || 'GET'}`);
        console.log(`   waitUntil: ${fetchOptions.waitUntil || 'none'}`);

        // YENI: waitUntil varsa backend'de axios ile direkt çek (CloudFlare bypass)
        if (fetchOptions.waitUntil) {
            console.log(`🌐 [ProxyFetch] Using backend axios (waitUntil=${fetchOptions.waitUntil})`);
            return await fetchWithAxios(fetchOptions, requestId);
        }

        console.log(`   ⏳ Waiting for Flutter to fetch...`);

        // Send fetch request to Flutter via streaming response
        // Check if stream is still writable (not if headers are sent - they're always sent in streaming)
        if (!session.res.writableEnded && !session.res.finished) {
            console.log(`📡 [ProxyFetch] Sending fetch request to Flutter...`);
            session.res.write(JSON.stringify({
                action: 'fetch',
                requestId: requestId,
                fetch: fetchOptions
            }) + '\n');
        } else {
            console.log(`⚠️  [ProxyFetch] Cannot send - response stream already closed!`);
            console.log(`   writableEnded: ${session.res.writableEnded}, finished: ${session.res.finished}`);
            // Stream kapalıysa hemen reject et
            return Promise.reject(new Error('Response stream already closed - cannot send fetch request'));
        }

        // Store fetch in queue
        const fetchPromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                console.log(`⏱️  [ProxyFetch] TIMEOUT for request: ${requestId}`);
                const index = session.fetchQueue.findIndex(f => f.requestId === requestId);
                if (index !== -1) {
                    session.fetchQueue.splice(index, 1);
                }
                reject(new Error('Fetch timeout - Flutter did not respond'));
            }, (fetchOptions.timeout || 30000) + 10000); // Extra 10s for network

            session.fetchQueue.push({
                requestId,
                resolve: (result) => {
                    clearTimeout(timeoutId);
                    console.log(`✅ [ProxyFetch] Request resolved: ${requestId}`);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeoutId);
                    console.log(`❌ [ProxyFetch] Request rejected: ${requestId}`);
                    reject(error);
                }
            });
        });

        console.log(`📝 [ProxyFetch] Added to queue. Queue size: ${session.fetchQueue.length}`);

        // Return the promise (will be resolved by parse endpoint)
        return fetchPromise;
    };
}

// Catalog endpoint
app.post('/api/addon/:addonId/catalog', (req, res) => {
    handleAddonRequest(req, res, 'catalog');
});

// Meta endpoint
app.post('/api/addon/:addonId/meta', (req, res) => {
    handleAddonRequest(req, res, 'meta');
});

// Stream endpoint
app.post('/api/addon/:addonId/stream', (req, res) => {
    handleAddonRequest(req, res, 'stream');
});

// Parse endpoint - receives fetch results from Flutter
app.post('/api/addon/:addonId/parse', (req, res) => {
    const { sessionId, requestId, success, statusCode, body, headers, error } = req.body;

    console.log(`\n📥 [Parse] Received from Flutter`);
    console.log(`   Session: ${sessionId}`);
    console.log(`   Request: ${requestId}`);
    console.log(`   Success: ${success}`);
    console.log(`   Status: ${statusCode}`);
    console.log(`   Body size: ${body ? body.length : 0} bytes`);
    console.log(`   Error: ${error || 'none'}`);

    const session = activeSessions.get(sessionId);
    if (!session) {
        console.log(`⚠️  [Parse] Session not found: ${sessionId}`);
        console.log(`   Active sessions: ${Array.from(activeSessions.keys()).join(', ')}`);
        return res.status(404).json({ error: 'Session not found' });
    }

    session.lastActivity = Date.now();

    // Find waiting fetch handler
    const fetchIndex = session.fetchQueue.findIndex(f => f.requestId === requestId);
    if (fetchIndex === -1) {
        console.log(`⚠️  [Parse] Request not found in queue: ${requestId}`);
        console.log(`   Queue: ${session.fetchQueue.map(f => f.requestId).join(', ')}`);
        return res.status(404).json({ error: 'Request not found' });
    }

    const fetchHandler = session.fetchQueue.splice(fetchIndex, 1)[0];

    // Store result
    session.fetchResults.set(requestId, { success, statusCode, body, headers, error });

    // Resolve or reject
    if (success) {
        console.log(`✅ [Parse] Resolving fetch with success`);
        fetchHandler.resolve({ statusCode, body, headers });
    } else {
        console.log(`❌ [Parse] Rejecting fetch with error: ${error}`);
        fetchHandler.reject(new Error(error || 'Fetch failed'));
    }

    res.json({ success: true });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Mind IPTV Backend Server started on port ${PORT}`);
    console.log(`📦 Loaded addons: ${Object.keys(addonModules).join(', ')}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📋 Addons list: http://localhost:${PORT}/api/addons\n`);
});

