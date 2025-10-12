const crypto = require('crypto');

// Configuration
const CONFIG = {
    contentUrl: 'https://dizibox.cfd',
    aesKey: 'ywevqtjrurkwtqgz',
    userAgent: 'speedrestapi'
};

// Manifest
const manifest = {
    id: 'com.keyiflerolsun.inatbox',
    version: '3.0.0',
    name: 'InatBox',
    description: 'Turkish TV channels, movies and series streaming (Instruction Mode)',
    logo: 'https://via.placeholder.com/150',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series', 'tv'],
    catalogs: [
        { type: 'tv', id: 'spor', name: 'Spor Kanalları' },
        { type: 'tv', id: 'cable', name: 'Kanallar Liste 1' },
        { type: 'tv', id: 'list2', name: 'Kanallar Liste 2' },
        { type: 'tv', id: 'sinema', name: 'Sinema Kanalları' },
        { type: 'tv', id: 'belgesel', name: 'Belgesel Kanalları' },
        { type: 'tv', id: 'ulusal', name: 'Ulusal Kanallar' },
        { type: 'tv', id: 'haber', name: 'Haber Kanalları' },
        { type: 'tv', id: 'cocuk', name: 'Çocuk Kanalları' },
        { type: 'tv', id: 'dini', name: 'Dini Kanallar' },
        { type: 'movie', id: 'exxen', name: 'EXXEN' },
        { type: 'movie', id: 'gain', name: 'Gain' },
        { type: 'movie', id: 'max', name: 'Max-BluTV' },
        { type: 'movie', id: 'netflix', name: 'Netflix' },
        { type: 'movie', id: 'disney', name: 'Disney+' },
        { type: 'movie', id: 'amazon', name: 'Amazon Prime' },
        { type: 'movie', id: 'hbo', name: 'HBO Max' },
        { type: 'movie', id: 'tabii', name: 'Tabii' },
        { type: 'movie', id: 'mubi', name: 'Mubi' },
        { type: 'movie', id: 'tod', name: 'TOD' },
        { type: 'series', id: 'yabanci-dizi', name: 'Yabancı Diziler' },
        { type: 'series', id: 'yerli-dizi', name: 'Yerli Diziler' },
        { type: 'movie', id: 'yerli-film', name: 'Yerli Filmler' },
        { type: 'movie', id: '4k-film', name: '4K Film İzle' }
    ],
    idPrefixes: ['inatbox']
};

// Catalog URL mapping
const catalogUrls = {
    spor: 'https://boxyz.cfd/CDN/001_STR/boxyz.cfd/spor_v2.php',
    cable: `${CONFIG.contentUrl}/tv/cable.php`,
    list2: `${CONFIG.contentUrl}/tv/list2.php`,
    sinema: `${CONFIG.contentUrl}/tv/sinema.php`,
    belgesel: `${CONFIG.contentUrl}/tv/belgesel.php`,
    ulusal: `${CONFIG.contentUrl}/tv/ulusal.php`,
    haber: `${CONFIG.contentUrl}/tv/haber.php`,
    cocuk: `${CONFIG.contentUrl}/tv/cocuk.php`,
    dini: `${CONFIG.contentUrl}/tv/dini.php`,
    exxen: `${CONFIG.contentUrl}/ex/index.php`,
    gain: `${CONFIG.contentUrl}/ga/index.php`,
    max: `${CONFIG.contentUrl}/max/index.php`,
    netflix: `${CONFIG.contentUrl}/nf/index.php`,
    disney: `${CONFIG.contentUrl}/dsny/index.php`,
    amazon: `${CONFIG.contentUrl}/amz/index.php`,
    hbo: `${CONFIG.contentUrl}/hb/index.php`,
    tabii: `${CONFIG.contentUrl}/tbi/index.php`,
    mubi: `${CONFIG.contentUrl}/film/mubi.php`,
    tod: `${CONFIG.contentUrl}/ccc/index.php`,
    'yabanci-dizi': `${CONFIG.contentUrl}/yabanci-dizi/index.php`,
    'yerli-dizi': `${CONFIG.contentUrl}/yerli-dizi/index.php`,
    'yerli-film': `${CONFIG.contentUrl}/film/yerli-filmler.php`,
    '4k-film': `${CONFIG.contentUrl}/film/4k-film-exo.php`
};

// AES Decryption
function decryptAES(encryptedData, key) {
    try {
        const algorithm = 'aes-128-cbc';
        const keyBuffer = Buffer.from(key, 'utf8');
        const ivBuffer = Buffer.from(key, 'utf8');

        // First decryption
        const decipher1 = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
        let decrypted1 = decipher1.update(encryptedData.split(':')[0], 'base64', 'utf8');
        decrypted1 += decipher1.final('utf8');

        // Second decryption
        const decipher2 = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
        let decrypted2 = decipher2.update(decrypted1.split(':')[0], 'base64', 'utf8');
        decrypted2 += decipher2.final('utf8');

        return decrypted2;
    } catch (error) {
        console.error('❌ Decryption error:', error.message);
        return null;
    }
}

// Content validation
function isContentAllowed(item) {
    const type = item.diziType || item.chType;
    return type !== 'link' && type !== 'web';
}

// VK URL fix
function vkSourceFix(url) {
    if (url && url.startsWith('act')) {
        return `https://vk.com/al_video.php?${url}`;
    }
    return url;
}

// Build stream object with headers and metadata
function buildStreamObject(chContent) {
    const streamUrl = chContent.chUrl;
    const streamName = chContent.chName;

    // Parse headers
    const headers = {};
    try {
        if (chContent.chHeaders !== 'null') {
            const headersArray = JSON.parse(chContent.chHeaders);
            if (Array.isArray(headersArray) && headersArray.length > 0) {
                const headersObj = headersArray[0];
                Object.assign(headers, headersObj);
            }
        }

        // Parse chReg for cookie
        if (chContent.chReg !== 'null') {
            const regArray = JSON.parse(chContent.chReg);
            if (Array.isArray(regArray) && regArray.length > 0) {
                const regObj = regArray[0];
                if (regObj.playSH2) {
                    headers['Cookie'] = regObj.playSH2;
                }
            }
        }
    } catch (error) {
        console.warn('⚠️ Failed to parse headers/reg:', error.message);
    }

    // Determine stream type
    let behaviorHints = {};
    if (streamUrl.includes('.m3u8')) {
        behaviorHints.notWebReady = true;
        behaviorHints.bingeGroup = 'inatbox-m3u8';
    } else if (streamUrl.includes('.mpd')) {
        behaviorHints.notWebReady = true;
        behaviorHints.bingeGroup = 'inatbox-dash';
    }

    // Build stream object
    const stream = {
        name: streamName,
        title: streamName,
        url: streamUrl
    };

    // Add headers if present
    if (Object.keys(headers).length > 0) {
        stream.behaviorHints = {
            ...behaviorHints,
            headers: headers
        };
    } else if (Object.keys(behaviorHints).length > 0) {
        stream.behaviorHints = behaviorHints;
    }

    return stream;
}

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    const catalogId = args.id;
    const url = catalogUrls[catalogId];

    console.log(`\n📋 [InatBox Catalog] Generating instructions for: ${catalogId}`);

    if (!url) {
        console.warn('⚠️ No URL found for catalog:', catalogId);
        return { instructions: [] };
    }

    const urlObj = new URL(url);
    const hostName = urlObj.host;

    const requestBody = `1=${CONFIG.aesKey}&0=${CONFIG.aesKey}`;
    const contentLength = Buffer.byteLength(requestBody, 'utf8').toString();

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `inat-catalog-${catalogId}-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: url,
            method: 'POST',
            headers: {
                'Cache-Control': 'no-cache',
                'Content-Length': contentLength,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Host': hostName,
                'Referer': 'https://speedrestapi.com/',
                'X-Requested-With': 'com.bp.box',
                'User-Agent': CONFIG.userAgent
            },
            body: requestBody
        }]
    };
}

async function handleMeta(args) {
    const itemData = Buffer.from(args.id.replace('inatbox:', ''), 'base64').toString('utf8');
    const item = JSON.parse(itemData);

    console.log('📺 [InatBox Meta] Generating instructions for:', item.diziName || item.chName);

    const instructions = [];

    if (item.diziType) {
        // Series or movie
        const url = item.diziUrl;
        const urlObj = new URL(url);
        const hostName = urlObj.host;

        const requestBody = `1=${CONFIG.aesKey}&0=${CONFIG.aesKey}`;
        const contentLength = Buffer.byteLength(requestBody, 'utf8').toString();

        const randomId = Math.random().toString(36).substring(2, 10);
        instructions.push({
            requestId: `inat-meta-${Date.now()}-${randomId}`,
            purpose: 'meta',
            url: url,
            method: 'POST',
            headers: {
                'Cache-Control': 'no-cache',
                'Content-Length': contentLength,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Host': hostName,
                'Referer': 'https://speedrestapi.com/',
                'X-Requested-With': 'com.bp.box',
                'User-Agent': CONFIG.userAgent
            },
            body: requestBody,
            metadata: { originalItem: item } // Pass original item for meta building
        });
    }

    return { instructions, metadata: { originalItem: item } };
}

async function handleStream(args) {
    const itemData = Buffer.from(args.id.replace('inatbox:', ''), 'base64').toString('utf8');
    const item = JSON.parse(itemData);

    console.log('🎬 [InatBox Stream] Generating instructions for:', item.chName || item.diziName);

    const instructions = [];

    // Determine URL to fetch
    let fetchUrl = null;

    if (item.diziType === 'film') {
        fetchUrl = item.diziUrl;
    } else if (item.chType === 'tekli_regex_lb_sh_3' || item.chType === 'cable_sh') {
        fetchUrl = item.chUrl;
    } else {
        // Direct stream - no fetch needed
        return {
            instructions: [],
            metadata: { directItem: item }
        };
    }

    if (fetchUrl) {
        const urlObj = new URL(fetchUrl);
        const hostName = urlObj.host;
        const requestBody = `1=${CONFIG.aesKey}&0=${CONFIG.aesKey}`;
        const contentLength = Buffer.byteLength(requestBody, 'utf8').toString();

        const randomId = Math.random().toString(36).substring(2, 10);
        instructions.push({
            requestId: `inat-stream-${Date.now()}-${randomId}`,
            purpose: 'stream',
            url: fetchUrl,
            method: 'POST',
            headers: {
                'Cache-Control': 'no-cache',
                'Content-Length': contentLength,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Host': hostName,
                'Referer': 'https://speedrestapi.com/',
                'X-Requested-With': 'com.bp.box',
                'User-Agent': CONFIG.userAgent
            },
            body: requestBody,
            metadata: { originalItem: item }
        });
    }

    return { instructions, metadata: { originalItem: item } };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, metadata } = fetchResult;

    console.log(`\n⚙️ [InatBox Process] Purpose: ${purpose}`);

    // Handle direct stream case (no fetch needed)
    if (purpose === 'stream' && metadata?.directItem) {
        const item = metadata.directItem;
        const chContent = {
            chName: item.chName || item.diziName,
            chUrl: vkSourceFix(item.chUrl),
            chImg: item.chImg || item.diziImg,
            chHeaders: item.chHeaders || 'null',
            chReg: item.chReg || 'null',
            chType: item.chType || 'live_url'
        };

        const streamObj = buildStreamObject(chContent);
        console.log(`✅ Direct stream for: ${chContent.chName}`);
        return { streams: [streamObj] };
    }

    // Parse response (may be encrypted)
    let data = null;

    // Check if response is HTML error page
    if (body.trim().startsWith('<!DOCTYPE') || body.trim().startsWith('<html')) {
        console.error('❌ Server returned HTML page (likely 404 or error)');
        return purpose === 'catalog' ? { metas: [] } : { streams: [] };
    }

    // Try parsing as plain JSON first
    try {
        data = JSON.parse(body);
        console.log('✅ Response is plain JSON');
    } catch (jsonError) {
        // Not plain JSON, try to decrypt
        console.log('🔐 Response is encrypted, attempting decrypt...');
        try {
            const decrypted = decryptAES(body, CONFIG.aesKey);
            if (decrypted) {
                data = JSON.parse(decrypted);
                console.log('✅ Decryption successful');
            }
        } catch (decryptError) {
            console.error('❌ Decryption failed:', decryptError.message);
            return purpose === 'catalog' ? { metas: [] } : { streams: [] };
        }
    }

    if (!data) {
        return purpose === 'catalog' ? { metas: [] } : { streams: [] };
    }

    if (purpose === 'catalog') {
        if (!Array.isArray(data)) {
            console.warn('⚠️ Data is not an array:', typeof data);
            return { metas: [] };
        }

        const metas = data
            .filter(item => isContentAllowed(item))
            .map(item => {
                if (item.diziType) {
                    return {
                        id: `inatbox:${Buffer.from(JSON.stringify(item)).toString('base64')}`,
                        type: item.diziType === 'dizi' ? 'series' : 'movie',
                        name: item.diziName,
                        poster: item.diziImg,
                        description: item.diziDetay,
                        releaseInfo: item.diziYear || ''
                    };
                } else if (item.chName) {
                    const isLive = item.chType === 'live_url' || item.chType === 'cable_sh' || item.chType === 'tekli_regex_lb_sh_3';
                    return {
                        id: `inatbox:${Buffer.from(JSON.stringify(item)).toString('base64')}`,
                        type: isLive ? 'tv' : 'movie',
                        name: item.chName,
                        poster: item.chImg,
                        posterShape: isLive ? 'square' : 'poster'
                    };
                }
                return null;
            })
            .filter(Boolean);

        console.log(`✅ Processed ${metas.length} items`);
        return { metas };
    }

    if (purpose === 'meta') {
        const item = metadata?.originalItem;

        if (item.diziType === 'dizi' && Array.isArray(data)) {
            // Series with seasons - need more fetches (not yet implemented)
            console.log('⚠️ Series with seasons requires additional fetches (not yet implemented)');
            return {
                meta: {
                    id: `inatbox:${Buffer.from(JSON.stringify(item)).toString('base64')}`,
                    type: 'series',
                    name: item.diziName,
                    poster: item.diziImg,
                    description: item.diziDetay
                }
            };
        } else {
            // Movie or direct content
            return {
                meta: {
                    id: `inatbox:${Buffer.from(JSON.stringify(item)).toString('base64')}`,
                    type: item.diziType ? 'movie' : 'tv',
                    name: item.diziName || item.chName,
                    poster: item.diziImg || item.chImg,
                    description: item.diziDetay
                }
            };
        }
    }

    if (purpose === 'stream') {
        const item = metadata?.originalItem;

        let chContent = null;

        if (item.diziType === 'film' && Array.isArray(data) && data.length > 0) {
            chContent = {
                chName: item.diziName,
                chUrl: vkSourceFix(data[0].chUrl),
                chImg: item.diziImg,
                chHeaders: data[0].chHeaders || 'null',
                chReg: data[0].chReg || 'null',
                chType: data[0].chType
            };
        } else if ((item.chType === 'tekli_regex_lb_sh_3' || item.chType === 'cable_sh') && data) {
            const nestedItem = Array.isArray(data) ? data[0] : data;
            chContent = {
                chName: item.chName,
                chUrl: vkSourceFix(nestedItem.chUrl || item.chUrl),
                chImg: item.chImg,
                chHeaders: nestedItem.chHeaders || item.chHeaders || 'null',
                chReg: nestedItem.chReg || item.chReg || 'null',
                chType: nestedItem.chType || item.chType
            };
        } else {
            // Direct
            chContent = {
                chName: item.chName || item.diziName,
                chUrl: vkSourceFix(item.chUrl),
                chImg: item.chImg || item.diziImg,
                chHeaders: item.chHeaders || 'null',
                chReg: item.chReg || 'null',
                chType: item.chType || 'live_url'
            };
        }

        if (!chContent || !chContent.chUrl) {
            console.error('❌ No URL found');
            return { streams: [] };
        }

        // Process headers and build stream object
        const streamObj = buildStreamObject(chContent);

        console.log(`✅ Found stream for: ${chContent.chName}`);
        return { streams: [streamObj] };
    }

    return { ok: true };
}

// Export functions
module.exports = {
    manifest,
    getManifest: () => manifest,
    handleCatalog,
    handleMeta,
    handleStream,
    processFetchResult
};
