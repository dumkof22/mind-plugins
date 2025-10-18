const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Load config
let addonConfig = {};
const configPath = path.join(__dirname, 'addon-config.json');

function loadConfig() {
    try {
        const data = fs.readFileSync(configPath, 'utf8');
        addonConfig = JSON.parse(data);
        console.log('✅ Addon config loaded');
    } catch (error) {
        console.error('❌ Error loading config:', error.message);
        addonConfig = { adminPassword: 'admin123', addons: {} };
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(configPath, JSON.stringify(addonConfig, null, 2));
        console.log('✅ Addon config saved');
    } catch (error) {
        console.error('❌ Error saving config:', error.message);
    }
}

loadConfig();

// Import addons
const addonModules = {
    // Mevcut eklentiler
    'fullhdfilmizlesene': require('./addon-new.js'),
    'inatbox': require('./inat-new.js'),
    'dizipal': require('./dizipal.js'),
    'selcuksports': require('./selcuk-new.js'),

    // Yeni Türkçe içerik eklentileri
    'animecix': require('./animecix-addon.js'),
    'belgeselx': require('./belgeselx-addon.js'),
    'canlitv': require('./canlitv-addon.js'),
    'cizgimax': require('./cizgimax-addon.js'),
    'dizibox': require('./dizibox-addon.js'),
    'hdfilmcehennemi': require('./hdfilmcehennemi-addon.js')
};

// Import video extractors (opsiyonel - eğer direkt kullanmak isterseniz)
const videoExtractors = require('./video-extractors.js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));  // ✅ BURAYA EKLEYIN

// Admin authentication middleware
function checkAuth(req, res, next) {
    const password = req.headers['x-admin-password'] || req.body.password || req.query.password;
    if (password !== addonConfig.adminPassword) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Geçersiz şifre' });
    }
    next();
}

console.log(`\n🚀 Mind IPTV Backend Server (Instruction-Based Architecture)`);
console.log(`📦 Loaded ${Object.keys(addonModules).length} addon(s):\n`);

// Kategorilere göre listeleme
const addonCategories = {
    '🎬 Film & Dizi': ['fullhdfilmizlesene', 'hdfilmcehennemi', 'dizibox', 'dizipal'],
    '🎌 Anime': ['animecix'],
    '🎨 Çizgi Film': ['cizgimax'],
    '📚 Belgesel': ['belgeselx'],
    '📺 Canlı TV': ['inatbox', 'canlitv'],
    '⚽ Spor': ['selcuksports']
};

Object.entries(addonCategories).forEach(([category, ids]) => {
    const loadedAddons = ids.filter(id => addonModules[id]);
    if (loadedAddons.length > 0) {
        console.log(`   ${category}: ${loadedAddons.join(', ')}`);
    }
});

console.log(`\n🔧 Video Extractors: TauVideo, Odnoklassniki, SibNet, Drive, CizgiDuo/Pass\n`);

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

// List addons by category (yeni eklentileri kategorize etmek için)
app.get('/api/addons/categories', (req, res) => {
    const categories = {
        'Filmler & Diziler': ['fullhdfilmizlesene', 'hdfilmcehennemi', 'dizibox'],
        'Anime': ['animecix'],
        'Çizgi Film': ['cizgimax'],
        'Belgesel': ['belgeselx'],
        'Canlı TV': ['inatbox', 'canlitv'],
        'Spor': ['selcuksports'],
        'Dizi': ['dizipal']
    };

    const result = Object.entries(categories).map(([category, addonIds]) => ({
        category,
        addons: addonIds.map(id => {
            const addon = addonModules[id];
            const manifest = addon?.getManifest ? addon.getManifest() : addon?.manifest;
            return {
                id,
                name: manifest?.name,
                description: manifest?.description
            };
        }).filter(a => a.name)
    }));

    res.json({ categories: result });
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

        // Önce addon'un kendi processFetchResult'ını dene
        let result = await addon.processFetchResult({
            requestId,
            purpose,
            url,
            status,
            headers,
            body,
            metadata  // ✅ Metadata'yı pas geç
        });

        // Eğer addon handle edemediyse (ok: true dönüyorsa) ve extractor purpose'u ise
        // global video extractor'ları dene
        if (result.ok === true && !result.streams && !result.instructions && !result.metas && !result.meta) {
            const isExtractor = purpose && purpose.startsWith('extract_');
            if (isExtractor && videoExtractors.processVideoExtractor) {
                console.log(`🔧 [Fetch Result] Trying global video extractor for: ${purpose}`);
                result = await videoExtractors.processVideoExtractor({
                    requestId,
                    purpose,
                    url,
                    status,
                    headers,
                    body,
                    metadata
                });
            }
        }

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

// ============ ADMIN ENDPOINTS ============

// Get all addon configs
app.get('/api/admin/config', checkAuth, (req, res) => {
    res.json({
        success: true,
        config: addonConfig
    });
});

// Update specific addon config
app.post('/api/admin/addon/:addonId/config', checkAuth, (req, res) => {
    const { addonId } = req.params;
    const { baseUrl, headers, cookies, enabled } = req.body;

    if (!addonModules[addonId]) {
        return res.status(404).json({ error: 'Addon not found' });
    }

    if (!addonConfig.addons[addonId]) {
        addonConfig.addons[addonId] = {};
    }

    if (baseUrl !== undefined) addonConfig.addons[addonId].baseUrl = baseUrl;
    if (headers !== undefined) addonConfig.addons[addonId].headers = headers;
    if (cookies !== undefined) addonConfig.addons[addonId].cookies = cookies;
    if (enabled !== undefined) addonConfig.addons[addonId].enabled = enabled;

    saveConfig();

    res.json({
        success: true,
        message: `${addonId} yapılandırması güncellendi`,
        config: addonConfig.addons[addonId]
    });
});

// Update admin password
app.post('/api/admin/password', checkAuth, (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: 'Şifre en az 4 karakter olmalıdır' });
    }

    addonConfig.adminPassword = newPassword;
    saveConfig();

    res.json({
        success: true,
        message: 'Admin şifresi güncellendi'
    });
});

// Restart server
app.post('/api/admin/restart', checkAuth, (req, res) => {
    res.json({
        success: true,
        message: 'Sunucu yeniden başlatılıyor...'
    });

    console.log('\n🔄 Server restart requested by admin...');
    setTimeout(() => {
        process.exit(0); // PM2 veya diğer process manager'lar otomatik restart yapacak
    }, 1000);
});

// Stop all addons
app.post('/api/admin/stop', checkAuth, (req, res) => {
    Object.keys(addonConfig.addons).forEach(addonId => {
        addonConfig.addons[addonId].enabled = false;
    });
    saveConfig();

    res.json({
        success: true,
        message: 'Tüm eklentiler durduruldu'
    });
});

// Start all addons
app.post('/api/admin/start', checkAuth, (req, res) => {
    Object.keys(addonConfig.addons).forEach(addonId => {
        addonConfig.addons[addonId].enabled = true;
    });
    saveConfig();

    res.json({
        success: true,
        message: 'Tüm eklentiler başlatıldı'
    });
});

// Get addon stats
app.get('/api/admin/stats', checkAuth, (req, res) => {
    const stats = {
        totalAddons: Object.keys(addonModules).length,
        enabledAddons: Object.values(addonConfig.addons).filter(a => a.enabled).length,
        disabledAddons: Object.values(addonConfig.addons).filter(a => !a.enabled).length,
        addons: {}
    };

    Object.keys(addonModules).forEach(addonId => {
        const addon = addonModules[addonId];
        const manifest = addon.getManifest ? addon.getManifest() : addon.manifest;
        stats.addons[addonId] = {
            name: manifest.name,
            enabled: addonConfig.addons[addonId]?.enabled ?? true,
            baseUrl: addonConfig.addons[addonId]?.baseUrl || 'N/A'
        };
    });

    res.json({
        success: true,
        stats
    });
});

// Start server
let server;
const PORT = process.env.PORT || 3000;
server = app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌐 Health: http://localhost:${PORT}/health`);
    console.log(`📋 Addons: http://localhost:${PORT}/api/addons`);
    console.log(`🔐 Admin Panel: http://localhost:${PORT}/admin.html\n`);
});
