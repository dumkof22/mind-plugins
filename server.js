const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Import addons
const addonModules = {
    'fullhdfilmizlesene': require('./addon-new.js'),
    'inatbox': require('./inat-new.js'),
    'dizipal': require('./dizipal.js'),
    'selcuksports': require('./selcuk-new.js')
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

console.log(`\n🚀 Mind IPTV Backend Server (Instruction-Based Architecture)`);
console.log(`📦 Loaded addons: ${Object.keys(addonModules).join(', ')}\n`);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        architecture: 'instruction-based',
        addons: Object.keys(addonModules),
        timestamp: new Date().toISOString()
    });
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

// Get addon manifest
app.get('/api/addon/:addonId/manifest.json', (req, res) => {
    const { addonId } = req.params;
    const addon = addonModules[addonId];

    if (!addon) {
        return res.status(404).json({ error: 'Addon not found' });
    }

    const manifest = addon.getManifest ? addon.getManifest() : addon.manifest;
    res.json(manifest);
});

// ============ INSTRUCTION ENDPOINTS ============

// Catalog endpoint - Returns instructions
app.post('/api/addon/:addonId/catalog', async (req, res) => {
    const { addonId } = req.params;
    const addon = addonModules[addonId];

    if (!addon) {
        return res.status(404).json({ error: 'Addon not found' });
    }

    try {
        console.log(`\n📋 [${addonId}] CATALOG instruction request`);
        console.log(`   Args:`, JSON.stringify(req.body, null, 2));

        const result = await addon.handleCatalog(req.body);

        console.log(`✅ [${addonId}] Returning ${result.instructions?.length || 0} instruction(s)`);
        res.json(result);
    } catch (error) {
        console.error(`❌ [${addonId}] Catalog error:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Meta endpoint - Returns instructions
app.post('/api/addon/:addonId/meta', async (req, res) => {
    const { addonId } = req.params;
    const addon = addonModules[addonId];

    if (!addon) {
        return res.status(404).json({ error: 'Addon not found' });
    }

    try {
        console.log(`\n📺 [${addonId}] META instruction request`);
        console.log(`   Args:`, JSON.stringify(req.body, null, 2));

        const result = await addon.handleMeta(req.body);

        console.log(`✅ [${addonId}] Returning ${result.instructions?.length || 0} instruction(s)`);
        res.json(result);
    } catch (error) {
        console.error(`❌ [${addonId}] Meta error:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Stream endpoint - Returns instructions
app.post('/api/addon/:addonId/stream', async (req, res) => {
    const { addonId } = req.params;
    const addon = addonModules[addonId];

    if (!addon) {
        return res.status(404).json({ error: 'Addon not found' });
    }

    try {
        console.log(`\n🎬 [${addonId}] STREAM instruction request`);
        console.log(`   Args:`, JSON.stringify(req.body, null, 2));

        const result = await addon.handleStream(req.body);

        console.log(`✅ [${addonId}] Returning ${result.instructions?.length || 0} instruction(s)`);
        res.json(result);
    } catch (error) {
        console.error(`❌ [${addonId}] Stream error:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============ FETCH RESULT ENDPOINT ============

// Process fetch result from Flutter
app.post('/api/fetch-result', async (req, res) => {
    const { addonId, requestId, purpose, url, status, headers, body, error, metadata } = req.body;

    console.log(`\n📥 [Fetch Result] Received from Flutter`);
    console.log(`   Addon: ${addonId}`);
    console.log(`   Request ID: ${requestId}`);
    console.log(`   Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);
    console.log(`   Status: ${status}`);
    console.log(`   Body size: ${body ? body.length : 0} bytes`);
    console.log(`   Error: ${error || 'none'}`);
    console.log(`   Metadata: ${metadata ? JSON.stringify(metadata).substring(0, 100) : 'none'}`);

    if (!addonId) {
        return res.status(400).json({ error: 'addonId required' });
    }

    const addon = addonModules[addonId];
    if (!addon) {
        return res.status(404).json({ error: 'Addon not found' });
    }

    if (!addon.processFetchResult) {
        return res.status(500).json({ error: 'Addon does not support processFetchResult' });
    }

    try {
        // Check for fetch errors
        if (error || status !== 200) {
            console.log(`⚠️ [Fetch Result] Fetch failed: ${error || `HTTP ${status}`}`);
            return res.json({
                success: false,
                error: error || `HTTP ${status}`,
                data: null
            });
        }

        // Process the fetched content (metadata dahil)
        console.log(`⚙️ [Fetch Result] Processing...`);
        const result = await addon.processFetchResult({
            requestId,
            purpose,
            url,
            status,
            headers,
            body,
            metadata  // ✅ Metadata'yı pas geç
        });

        console.log(`✅ [Fetch Result] Processed successfully`);
        if (result.metas) {
            console.log(`   📋 Found ${result.metas.length} meta(s)`);
        } else if (result.meta) {
            console.log(`   📺 Returned meta: ${result.meta.name}`);
        } else if (result.streams) {
            console.log(`   🎬 Found ${result.streams.length} stream(s)`);
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error(`❌ [Fetch Result] Processing error:`, error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌐 Health: http://localhost:${PORT}/health`);
    console.log(`📋 Addons: http://localhost:${PORT}/api/addons\n`);
});
