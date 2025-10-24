// inat-new.js (düzeltilmiş)
const crypto = require('crypto');

// --- CONFIG ---
const CONFIG = {
    contentUrl: 'https://diziboox.sbs/CDN/001/dizibox',
    aesKey: 'ywevqtjrurkwtqgz',
    userAgent: 'speedrestapi'
};

// --- MANIFEST ---
const manifest = {
    id: 'com.keyiflerolsun.inatbox',
    version: '3.0.5',
    name: 'InatBox',
    description: 'Turkish TV channels, movies and series streaming (Instruction Mode) - Kotlin mekanizması ile uyumlu',
    logo: 'https://via.placeholder.com/150',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series', 'tv'],
    catalogs: [
        // TV lists - Her katalog için extra parametresi eklendi
        { type: 'tv', id: 'spor', name: '📺 Spor Kanalları', extra: [] },
        { type: 'tv', id: 'list1', name: '📺 Kanallar Liste 1', extra: [] },
        { type: 'tv', id: 'list2', name: '📺 Kanallar Liste 2', extra: [] },
        { type: 'tv', id: 'list3', name: '📺 Kanallar Liste 3', extra: [] },
        { type: 'tv', id: 'sinema', name: '🎬 Sinema Kanalları', extra: [] },
        { type: 'tv', id: 'belgesel', name: '📚 Belgesel Kanalları', extra: [] },
        { type: 'tv', id: 'ulusal', name: '🇹🇷 Ulusal Kanallar', extra: [] },
        { type: 'tv', id: 'haber', name: '📰 Haber Kanalları', extra: [] },
        { type: 'tv', id: 'eba', name: '🎓 Eba Kanalları', extra: [] },
        { type: 'tv', id: 'cocuk', name: '🧸 Çocuk Kanalları', extra: [] },
        { type: 'tv', id: 'dini', name: '🕌 Dini Kanallar', extra: [] },

        // Movie/Streaming services
        { type: 'movie', id: 'exxen', name: '🎬 EXXEN', extra: [] },
        { type: 'movie', id: 'gain', name: '🎬 Gain', extra: [] },
        { type: 'movie', id: 'disney', name: '🎬 Disney+', extra: [] },
        { type: 'movie', id: 'amazon', name: '🎬 Amazon Prime', extra: [] },
        { type: 'movie', id: 'hbo', name: '🎬 HBO Max', extra: [] },
        { type: 'movie', id: 'tabii', name: '🎬 Tabii', extra: [] },
        { type: 'movie', id: 'mubi', name: '🎬 Mubi', extra: [] },
        { type: 'movie', id: 'tod', name: '🎬 TOD', extra: [] },

        // Series / films
        { type: 'series', id: 'yabanci-dizi', name: '📺 Yabancı Diziler', extra: [] },
        { type: 'series', id: 'yerli-dizi', name: '📺 Yerli Diziler', extra: [] },
        { type: 'movie', id: 'yerli-film', name: '🎬 Yerli Filmler', extra: [] },
        { type: 'movie', id: '4k-film', name: '🎬 4K Film İzle', extra: [] },

        // SEARCH katalogu (Stremio aramaları için)
        { type: 'movie', id: 'inat_search', name: '🔍 Arama', extra: [{ name: 'search', isRequired: true }] }
    ],
    idPrefixes: ['inatbox']
};

// --- URL MAP ---
const catalogUrls = {
    spor: 'https://boxbc.icu/CDN/001_STR/boxbc.icu/spor_v2.php',
    list1: `https://diziboox.sbs/CDN/001/dizibox/tv/list1.php`,
    list2: `https://diziboox.sbs/CDN/001/dizibox/tv/list2.php`,
    list3: `https://diziboox.sbs/CDN/001/dizibox/tv/list3.php`,
    sinema: `https://diziboox.sbs/CDN/001/dizibox/tv/sinema.php`,
    belgesel: `https://diziboox.sbs/CDN/001/dizibox/tv/belgesel.php`,
    ulusal: `https://diziboox.sbs/CDN/001/dizibox/tv/ulusal.php`,
    haber: `https://diziboox.sbs/CDN/001/dizibox/tv/haber.php`,
    eba: `https://diziboox.sbs/CDN/001/dizibox/tv/eba.php`,
    cocuk: `https://diziboox.sbs/CDN/001/dizibox/tv/cocuk.php`,
    dini: `https://diziboox.sbs/CDN/001/dizibox/tv/dini.php`,
    exxen: `https://diziboox.sbs/CDN/001/dizibox/ex/index.php`,
    gain: `https://diziboox.sbs/CDN/001/dizibox/ga/index.php`,
    disney: `https://diziboox.sbs/CDN/001/dizibox/dsny/index.php`,
    amazon: `https://diziboox.sbs/CDN/001/dizibox/amz/index.php`,
    hbo: `https://diziboox.sbs/CDN/001/dizibox/hb/index.php`,
    tabii: `https://diziboox.sbs/CDN/001/dizibox/tbi/index.php`,
    mubi: `https://diziboox.sbs/CDN/001/dizibox/film/mubi.php`,
    tod: `https://boxbc.icu/CDN/001_STR/boxbc.icu/ccc/index.php`,
    'yabanci-dizi': `https://diziboox.sbs/CDN/001/dizibox/yabanci-dizi/index.php`,
    'yerli-dizi': `https://diziboox.sbs/CDN/001/dizibox/yerli-dizi/index.php`,
    'yerli-film': `https://diziboox.sbs/CDN/001/dizibox/film/yerli-filmler.php`,
    '4k-film': `https://diziboox.sbs/CDN/001/dizibox/film/4k-film-exo.php`
};

// --- HELPERS ---
function buildRequestBody(extraFields = {}) {
    // Kotlin kodundaki gibi - sadece aesKey gönder, ekstra parametre yok
    const base = { '1': CONFIG.aesKey, '0': CONFIG.aesKey };
    // Search için özel durum
    if (extraFields.q) {
        base.q = extraFields.q;
    }
    return Object.entries(base).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

function safeLog(...args) {
    try { console.log(...args); } catch (e) { }
}

// --- AES Decrypt (kullanılabilir bırakıldı) ---
function decryptAES(encryptedData, key) {
    try {
        const algorithm = 'aes-128-cbc';
        const keyBuffer = Buffer.from(key, 'utf8');
        const ivBuffer = Buffer.from(key, 'utf8');

        const decipher1 = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
        let decrypted1 = decipher1.update(encryptedData.split(':')[0], 'base64', 'utf8');
        decrypted1 += decipher1.final('utf8');

        const decipher2 = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
        let decrypted2 = decipher2.update(decrypted1.split(':')[0], 'base64', 'utf8');
        decrypted2 += decipher2.final('utf8');

        return decrypted2;
    } catch (error) {
        safeLog('❌ Decryption error:', error.message);
        return null;
    }
}

function isContentAllowed(item) {
    const type = item.diziType || item.chType;
    return type !== 'link' && type !== 'web';
}

function vkSourceFix(url) {
    if (url && url.startsWith('act')) {
        return `https://vk.com/al_video.php?${url}`;
    }
    return url;
}

// --- HANDLERS ---

async function handleCatalog(args) {
    const catalogId = args.id;
    const extra = args.extra || {};
    const searchQuery = extra.search;

    safeLog(`\n📋 [InatBox Catalog] ========================================`);
    safeLog(`📋 [InatBox Catalog] Catalog ID: ${catalogId}`);
    safeLog(`📋 [InatBox Catalog] Type: ${args.type || 'unknown'}`);
    safeLog(`📋 [InatBox Catalog] Search Query: "${searchQuery || 'none'}"`);
    safeLog(`📋 [InatBox Catalog] Extra: ${JSON.stringify(extra)}`);
    safeLog(`📋 [InatBox Catalog] ========================================`);

    // --- Search ---
    if (catalogId === 'inat_search' || searchQuery) {
        if (!searchQuery) {
            safeLog('⚠️ Search requested but no query provided.');
            return { instructions: [] };
        }

        const requestId = `inat-search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const searchUrl = `${CONFIG.contentUrl}/search.php`;
        const body = buildRequestBody({ q: searchQuery });

        return {
            instructions: [{
                requestId,
                purpose: 'catalog_search',
                url: searchUrl,
                method: 'POST',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Content-Length': Buffer.byteLength(body, 'utf8').toString(),
                    'Host': new URL(searchUrl).host,
                    'Referer': 'https://speedrestapi.com/',
                    'X-Requested-With': 'com.bp.box',
                    'User-Agent': CONFIG.userAgent
                },
                body
            }]
        };
    }

    // --- Normal katalog ---
    const baseUrl = catalogUrls[catalogId];
    if (!baseUrl) {
        safeLog(`❌ [InatBox Catalog] No URL mapped for catalogId: ${catalogId}`);
        safeLog(`❌ [InatBox Catalog] Available catalogs: ${Object.keys(catalogUrls).join(', ')}`);
        return { instructions: [] };
    }

    safeLog(`✅ [InatBox Catalog] URL found: ${baseUrl}`);

    // Kotlin kodundaki gibi - tüm kataloglar için aynı basit body
    const requestBody = buildRequestBody();
    const requestId = `inat-catalog-${catalogId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    safeLog(`📤 [InatBox Catalog] Creating instruction for: ${catalogId}`);

    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: baseUrl,
            method: 'POST',
            headers: {
                'Cache-Control': 'no-cache',
                'Content-Length': Buffer.byteLength(requestBody, 'utf8').toString(),
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Host': new URL(baseUrl).host,
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
    let item = null;
    try { item = JSON.parse(itemData); } catch (e) { safeLog('⚠️ meta parse error', e.message); }

    if (!item) return { instructions: [] };

    safeLog('📺 [InatBox Meta] for', item.diziName || item.chName);

    const body = buildRequestBody();

    // 🎬 Dizi veya film detay isteği
    if (item.diziType && item.diziUrl) {
        const requestId = `inat-meta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const urlObj = new URL(item.diziUrl);
        return {
            instructions: [{
                requestId,
                purpose: item.diziType === 'dizi' ? 'meta_series_seasons' : 'meta',
                url: item.diziUrl,
                method: 'POST',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Content-Length': Buffer.byteLength(body, 'utf8').toString(),
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Host': urlObj.host,
                    'Referer': 'https://speedrestapi.com/',
                    'X-Requested-With': 'com.bp.box',
                    'User-Agent': CONFIG.userAgent
                },
                body,
                metadata: { originalItem: item }
            }],
            metadata: { originalItem: item }
        };
    }

    // 📺 Kanal için direkt meta döndür (instruction gerekmez, metadata kullan)
    if (item.chUrl && item.chType) {
        // TV kanalları için backend isteği yapmaya gerek yok, direkt meta döndür
        return { instructions: [], metadata: { originalItem: item, isChannel: true } };
    }

    return { instructions: [], metadata: { originalItem: item } };
}


async function handleStream(args) {
    const itemData = Buffer.from(args.id.replace('inatbox:', ''), 'base64').toString('utf8');
    let item = null;
    try { item = JSON.parse(itemData); } catch (e) { safeLog('⚠️ stream parse error', e.message); }

    if (!item) return { instructions: [] };

    safeLog('🎬 [InatBox Stream] for', item.chName || item.diziName);

    // Kotlin loadChContentLinks line 333-399 mantığı
    let fetchUrl = null;
    let needsExtraction = false;

    if (item.diziType === 'film') {
        // Film için POST → JSON → ilk item'ın chUrl'i için extractor gerekir
        fetchUrl = item.diziUrl;
        needsExtraction = true;
    } else if (item.chType === 'tekli_regex_lb_sh_3') {
        // Kotlin line 337-353: POST → JSON → ilk item
        fetchUrl = item.chUrl;
        needsExtraction = true;
    } else if (item.chType && (item.chType.includes('tekli_regex') || item.chType === 'cable_sh')) {
        // Kotlin line 354: direkt extractor (GET ile HTML parse)
        // Bu embed URL'leri (dzen.ru, vk.com, etc.) için HTML fetch gerekir
        safeLog(`🔍 [Stream] Creating extractor instruction for: ${item.chType}`);
        const extractUrl = vkSourceFix(item.chUrl || item.url);
        return {
            instructions: [{
                requestId: `inat-extract-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                purpose: 'stream_extract',
                url: extractUrl,
                method: 'GET',
                headers: {
                    'Accept': '*/*',
                    'Referer': item.chHeaders?.[0]?.Referer || 'https://speedrestapi.com/',
                    'User-Agent': item.chHeaders?.[0]?.UserAgent || CONFIG.userAgent || 'Mozilla/5.0',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                metadata: { originalItem: item, extractorNeeded: true }
            }],
            metadata: { originalItem: item, extractorNeeded: true }
        };
    }
    // Direkt stream varsa (live_url)
    else if (item.chType === 'live_url' && (item.chUrl || item.url)) {
        safeLog(`📺 [InatBox Stream] Direct live stream type: ${item.chType}`);
        return { instructions: [], metadata: { directItem: item } };
    }

    // Film veya tekli_regex_lb_sh_3 için POST isteği
    if (fetchUrl) {
        const urlObj = new URL(fetchUrl);
        const body = buildRequestBody();
        const requestId = `inat-stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return {
            instructions: [{
                requestId,
                purpose: needsExtraction ? 'stream_fetch_for_extract' : 'stream',
                url: fetchUrl,
                method: 'POST',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Content-Length': Buffer.byteLength(body, 'utf8').toString(),
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Host': urlObj.host,
                    'Referer': 'https://speedrestapi.com/',
                    'X-Requested-With': 'com.bp.box',
                    'User-Agent': CONFIG.userAgent
                },
                body,
                metadata: { originalItem: item, needsExtraction }
            }],
            metadata: { originalItem: item, needsExtraction }
        };
    }

    return { instructions: [] };
}

// --- PROCESS FETCH RESULTS ---
// InatBox - Düzeltilmiş Catalog Handler
// HDFilmCehennemi tarzında tüm kataloglardan veri alabilir hale getirildi

async function processFetchResult(fetchResult) {
    const { purpose, body, metadata, url, addonManifestUrl } = fetchResult;
    safeLog(`\n⚙️ [InatBox Process] purpose=${purpose} url=${url?.substring(0, 120)}`);

    // Body yoksa ama metadata varsa (direkt stream için - SADECE live_url)
    if (!body && metadata) {
        safeLog('📦 [InatBox Process] No body but metadata exists');

        // Stream handler için direkt item'ı işle
        // NOT: SADECE live_url için! Diğerleri instruction kullanır
        if (metadata.directItem) {
            const item = metadata.directItem;

            // Sadece live_url tipini işle
            if (item.chType !== 'live_url') {
                safeLog(`⚠️ [InatBox Process] ${item.chType} should use instruction, not direct stream`);
                return { streams: [] };
            }

            safeLog('📺 [InatBox Process] Processing direct live stream (live_url type)');

            let streamUrl = item.chUrl || item.url;
            let streamHeaders = item.chHeaders || [];
            let chReg = item.chReg || null;

            if (!streamUrl) {
                safeLog('❌ No stream URL in direct item');
                return { streams: [] };
            }

            // VK source fix (Kotlin kodundaki gibi)
            streamUrl = vkSourceFix(streamUrl);

            // Headers kontrolü ve normalize et (Kotlin mantığı)
            let headersObject = {};

            // chHeaders'ı parse et
            try {
                if (Array.isArray(streamHeaders) && streamHeaders.length > 0) {
                    const firstHeader = streamHeaders[0];
                    if (typeof firstHeader === 'object' && firstHeader !== null) {
                        Object.assign(headersObject, firstHeader);
                    }
                } else if (typeof streamHeaders === 'string' && streamHeaders !== 'null') {
                    const parsed = JSON.parse(streamHeaders);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        Object.assign(headersObject, parsed[0]);
                    } else if (typeof parsed === 'object') {
                        Object.assign(headersObject, parsed);
                    }
                } else if (typeof streamHeaders === 'object' && streamHeaders !== null) {
                    Object.assign(headersObject, streamHeaders);
                }
            } catch (e) {
                safeLog('⚠️ Error parsing chHeaders:', e.message);
            }

            // chReg'den Cookie ekle (Kotlin'deki gibi)
            try {
                if (chReg && chReg !== 'null') {
                    if (typeof chReg === 'string') {
                        const regParsed = JSON.parse(chReg);
                        if (Array.isArray(regParsed) && regParsed.length > 0 && regParsed[0].playSH2) {
                            headersObject['Cookie'] = regParsed[0].playSH2;
                        }
                    } else if (Array.isArray(chReg) && chReg.length > 0 && chReg[0].playSH2) {
                        headersObject['Cookie'] = chReg[0].playSH2;
                    }
                }
            } catch (e) {
                safeLog('⚠️ Error parsing chReg:', e.message);
            }

            // Varsayılan headers ekle (eğer yoksa)
            if (Object.keys(headersObject).length === 0) {
                headersObject = {
                    'User-Agent': CONFIG.userAgent || 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36',
                    'Referer': 'https://speedrestapi.com/',
                    'X-Requested-With': 'com.bp.box'
                };
            } else {
                // Eksik zorunlu header'ları ekle
                if (!headersObject['User-Agent']) {
                    headersObject['User-Agent'] = CONFIG.userAgent || 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36';
                }
                if (!headersObject['Referer']) {
                    headersObject['Referer'] = 'https://speedrestapi.com/';
                }
            }

            // Stream tipini belirle
            let streamType = 'unknown';
            if (streamUrl.includes('.m3u8')) {
                streamType = 'm3u8';
            } else if (streamUrl.includes('.mpd')) {
                streamType = 'dash';
            }

            const streams = [{
                url: streamUrl,
                name: item.diziName || item.chName || 'InatBox Stream',
                title: item.diziName || item.chName || 'InatBox Stream',
                behaviorHints: {
                    notWebReady: false,
                    httpHeaders: [headersObject]
                },
                addonName: 'inatbox',
                addonManifestUrl
            }];

            safeLog(`✅ Generated ${streams.length} direct stream(s) - type: ${streamType}`);
            return { streams };
        }
    }

    if (!body) {
        return purpose === 'catalog' || purpose === 'catalog_search'
            ? { metas: [] }
            : { streams: [] };
    }

    // HTML kontrolü - stream_extract için HTML BEKLENEN bir durumdur!
    const isHTML = typeof body === 'string' && (body.trim().startsWith('<!DOCTYPE') || body.trim().startsWith('<html'));

    // stream_extract için HTML'i direkt işle, decrypt etme!
    if (purpose === 'stream_extract') {
        if (!isHTML) {
            safeLog('⚠️ [Extractor] Expected HTML but got something else');
            // Yine de denemeye devam et
        }
        // HTML body'yi direkt extractor'a gönder (data = null kalacak)
        safeLog('📄 [Extractor] Processing HTML response (no decryption needed)');
    } else {
        // Diğer purpose'lar için hata kontrolü
        if (isHTML) {
            safeLog('❌ Server returned HTML page - likely error.');
            return purpose === 'catalog' || purpose === 'catalog_search'
                ? { metas: [] }
                : { streams: [] };
        }
    }

    // JSON parse veya AES decrypt (SADECE stream_extract DEĞİLSE)
    let data = null;
    if (purpose !== 'stream_extract') {
        try {
            data = JSON.parse(body);
            safeLog('✅ Parsed JSON response');
        } catch (jsonErr) {
            safeLog('🔐 Attempting to decrypt response...');
            try {
                const decrypted = decryptAES(body, CONFIG.aesKey);
                if (decrypted) {
                    data = JSON.parse(decrypted);
                    safeLog('✅ Decryption + JSON parse successful');
                }
            } catch (e) {
                safeLog('❌ Decrypt/parse failed:', e.message);
                return purpose === 'catalog' || purpose === 'catalog_search'
                    ? { metas: [] }
                    : { streams: [] };
            }
        }

        if (!data) {
            safeLog('⚠️ No data after parsing');
            return purpose === 'catalog' || purpose === 'catalog_search'
                ? { metas: [] }
                : { streams: [] };
        }
    }

    // ============ CATALOG HANDLER (HDFilmCehennemi tarzı) ============
    if (purpose === 'catalog' || purpose === 'catalog_search') {
        safeLog(`\n🔄 [Catalog Processing] Starting catalog processing...`);

        // Veriyi array'e dönüştür (çeşitli format desteği)
        let items = [];

        if (Array.isArray(data)) {
            items = data;
            safeLog(`📦 [Catalog] Data is array: ${items.length} items`);
        } else if (data.results && Array.isArray(data.results)) {
            items = data.results;
            safeLog(`📦 [Catalog] Data.results: ${items.length} items`);
        } else if (data.channels && Array.isArray(data.channels)) {
            items = data.channels;
            safeLog(`📦 [Catalog] Data.channels: ${items.length} items`);
        } else if (data.items && Array.isArray(data.items)) {
            items = data.items;
            safeLog(`📦 [Catalog] Data.items: ${items.length} items`);
        } else if (data.data && Array.isArray(data.data)) {
            items = data.data;
            safeLog(`📦 [Catalog] Data.data: ${items.length} items`);
        } else if (typeof data === 'object') {
            // Object ise değerleri array'e çevir
            items = Object.values(data).filter(v => typeof v === 'object' && v !== null);
            safeLog(`📦 [Catalog] Object.values: ${items.length} items`);
        }

        safeLog(`📦 [Catalog] Total raw items: ${items.length}`);
        safeLog(`📋 [Catalog] Processing items (filtering link/web types like Kotlin)...`);

        // Her item'ı meta'ya dönüştür
        const metas = [];

        let skippedCount = 0;
        let processedCount = 0;

        items.forEach((item, index) => {
            try {
                // Kotlin kodundaki gibi link ve web tiplerini filtrele
                if (!isContentAllowed(item)) {
                    if (index < 3) { // İlk 3 atlanan için log
                        safeLog(`⏭️ Skipping item ${index}: type=${item.diziType || item.chType}`);
                    }
                    skippedCount++;
                    return;
                }

                // Temel bilgileri çıkar
                const name = item.diziName || item.chName || item.name || item.title || 'Unknown';
                const poster = item.diziImg || item.chImg || item.img || item.poster || null;

                // ID oluştur (tüm item'ı base64'e çevir)
                const id = `inatbox:${Buffer.from(JSON.stringify(item)).toString('base64')}`;

                // Tip belirle (Kotlin'deki gibi)
                let type = 'movie'; // varsayılan
                if (item.diziType === 'dizi') {
                    type = 'series';
                } else if (item.diziType === 'film') {
                    type = 'movie';
                } else if (item.chType) {
                    // live_url ve spor kanalları kesinlikle TV
                    // tekli_regex tipleri genelde movie/episode (film veya dizi bölümü)
                    // Kotlin: parseLiveStreamLoadResponse sadece live_url için, diğerleri parseMovieResponse
                    if (item.chType === 'live_url' || item.chType === 'tekli_regex_lb_sh_3') {
                        type = 'tv';
                    } else {
                        // tekli_regex, tekli_regex_no_sh, cable_sh -> movie olarak işle
                        // (episode ise zaten meta'da series altında gösterilecek)
                        type = 'movie';
                    }
                }

                // Poster shape belirle (TV kanalları için square, diğerleri poster)
                const posterShape = type === 'tv' ? 'square' : 'poster';

                // Meta objesi oluştur
                const meta = {
                    id,
                    type,
                    name,
                    poster,
                    posterShape,
                    description: item.diziDetay || item.description || '',
                    releaseInfo: item.diziYear || item.year || '',
                    addonName: 'inatbox',
                    addonManifestUrl
                };

                metas.push(meta);
                processedCount++;

            } catch (itemError) {
                safeLog(`⚠️ Error processing item ${index}:`, itemError.message);
            }
        });

        safeLog(`\n📊 [Catalog Summary]`);
        safeLog(`   - Total raw items: ${items.length}`);
        safeLog(`   - Skipped (link/web types): ${skippedCount}`);
        safeLog(`   - Successfully processed: ${processedCount}`);
        safeLog(`   - Final metas: ${metas.length}`);
        safeLog(`✅ [Catalog] Returning ${metas.length} catalog metas\n`);

        return { metas };
    }

    // ============ STREAM EXTRACT (HTML Parse - Kotlin Extractors) ============
    if (purpose === 'stream_extract') {
        safeLog('🔍 [Extractor] Processing page for video URL extraction');
        const item = metadata?.originalItem;
        if (!item) {
            safeLog('⚠️ No original item in metadata');
            return { streams: [] };
        }

        const sourceUrl = item.chUrl || item.url;
        const streams = [];

        // Eğer URL zaten .m3u8 veya .mpd ise, direkt stream olarak döndür
        if (sourceUrl.includes('.m3u8') || sourceUrl.includes('.mpd')) {
            safeLog(`✅ [Extractor] Direct stream URL detected: ${sourceUrl.includes('.m3u8') ? 'M3U8' : 'MPD'}`);

            // Headers'ı Kotlin mantığıyla normalize et (line 359-372)
            let headersObject = {};

            // chHeaders'ı parse et
            try {
                const chHeaders = item.chHeaders;
                if (chHeaders && chHeaders !== 'null') {
                    let parsedHeaders = chHeaders;
                    if (typeof chHeaders === 'string') {
                        parsedHeaders = JSON.parse(chHeaders);
                    }
                    if (Array.isArray(parsedHeaders) && parsedHeaders.length > 0) {
                        Object.assign(headersObject, parsedHeaders[0]);
                    } else if (typeof parsedHeaders === 'object') {
                        Object.assign(headersObject, parsedHeaders);
                    }
                }
            } catch (e) {
                safeLog('⚠️ Error parsing chHeaders:', e.message);
            }

            // chReg'den Cookie ekle (Kotlin line 368-372)
            try {
                const chReg = item.chReg;
                if (chReg && chReg !== 'null') {
                    let parsedReg = chReg;
                    if (typeof chReg === 'string') {
                        parsedReg = JSON.parse(chReg);
                    }
                    if (Array.isArray(parsedReg) && parsedReg.length > 0 && parsedReg[0].playSH2) {
                        headersObject['Cookie'] = parsedReg[0].playSH2;
                    }
                }
            } catch (e) {
                safeLog('⚠️ Error parsing chReg:', e.message);
            }

            // Varsayılan headers ekle (eğer hiç yoksa)
            if (Object.keys(headersObject).length === 0) {
                headersObject = {
                    'User-Agent': CONFIG.userAgent,
                    'Referer': ''
                };
            }

            streams.push({
                url: sourceUrl,
                name: item.chName || 'Direct Stream',
                title: item.chName || 'Direct Stream',
                behaviorHints: {
                    notWebReady: false,
                    httpHeaders: [headersObject]
                },
                addonName: 'inatbox',
                addonManifestUrl
            });

            safeLog(`✅ [Extractor] Generated 1 direct stream (headers: ${Object.keys(headersObject).join(', ')})`);
            return { streams };
        }

        // HTML body'den extraction için devam et
        safeLog('🔍 [Extractor] Attempting HTML/embed page extraction');

        // DzenRu Extractor - Kotlin: DzenRuExtractor.kt line 8-67
        if (sourceUrl.includes('dzen.ru')) {
            safeLog('🔍 [Extractor] Using DzenRu extractor');
            const regex = /\{"url":"([^"]*)","type":"([^"]*)"\}/gi;
            let match;

            while ((match = regex.exec(body)) !== null) {
                const videoUrl = match[1];
                const type = match[2];

                // Kalite belirleme (Kotlin line 36-51)
                const qualityMatch = videoUrl.match(/=(\w+)$/);
                const qualityMap = {
                    'tiny': '256p', 'lowest': '426p', 'low': '640p',
                    'medium': '852p', 'high': '1280p', 'fullhd': '1920p'
                };
                const quality = qualityMatch ? qualityMap[qualityMatch[1]] || 'Unknown' : 'Unknown';

                safeLog(`✅ [DzenRu] Found: ${quality} - ${videoUrl.substring(0, 80)}...`);

                streams.push({
                    url: videoUrl,
                    name: `${item.chName || 'Dzen'} - ${quality}`,
                    title: `${item.chName || 'Dzen'} - ${quality}`,
                    behaviorHints: {
                        notWebReady: false,
                        httpHeaders: [{ 'Referer': 'https://dzen.ru/' }]
                    },
                    addonName: 'inatbox',
                    addonManifestUrl
                });
            }
        }
        // VK Extractor - Kotlin: VkExtractor.kt line 7-38
        else if (sourceUrl.includes('vk.com')) {
            safeLog('🔍 [Extractor] Using VK extractor');
            const m3u8Regex = /"([^"]*m3u8[^"]*)"/g;
            const match = m3u8Regex.exec(body);

            if (match && match[1]) {
                const videoUrl = match[1].replace(/\\\//g, '/');
                safeLog(`✅ [VK] Found: ${videoUrl.substring(0, 80)}...`);

                streams.push({
                    url: videoUrl,
                    name: item.chName || 'VK Stream',
                    title: item.chName || 'VK Stream',
                    behaviorHints: {
                        notWebReady: false,
                        httpHeaders: [{ 'Referer': 'https://vk.com/' }]
                    },
                    addonName: 'inatbox',
                    addonManifestUrl
                });
            }
        }
        // Yandex Disk Extractor - Kotlin: DiskYandexComTrExtractor.kt line 8-54
        else if (sourceUrl.includes('disk.yandex.com')) {
            safeLog('🔍 [Extractor] Using Yandex Disk extractor');
            const regex = /https?:\/\/[^\s"]*?master-playlist\.m3u8/g;
            const match = regex.exec(body);

            if (match) {
                const videoUrl = match[0];
                safeLog(`✅ [Yandex] Found: ${videoUrl.substring(0, 80)}...`);

                streams.push({
                    url: videoUrl,
                    name: item.chName || 'Yandex Disk',
                    title: item.chName || 'Yandex Disk',
                    behaviorHints: {
                        notWebReady: false,
                        httpHeaders: [{ 'Referer': '' }]
                    },
                    addonName: 'inatbox',
                    addonManifestUrl
                });
            }
        }
        // Dzen CDN Extractor - Kotlin: DzenExtractor.kt line 6-42
        else if (sourceUrl.includes('cdn.dzen.ru')) {
            safeLog('🔍 [Extractor] Using Dzen CDN extractor');
            const type = sourceUrl.includes('.m3u8') ? 'm3u8' : sourceUrl.includes('.mpd') ? 'dash' : null;

            if (type) {
                safeLog(`✅ [Dzen CDN] Found ${type.toUpperCase()}: ${sourceUrl.substring(0, 80)}...`);

                streams.push({
                    url: sourceUrl,
                    name: item.chName || 'Dzen CDN',
                    title: item.chName || 'Dzen CDN',
                    behaviorHints: {
                        notWebReady: false,
                        httpHeaders: [{ 'Referer': '' }]
                    },
                    addonName: 'inatbox',
                    addonManifestUrl
                });
            }
        }
        // CDN JWPlayer - Kotlin: CDNJWPlayer.kt (direkt m3u8)
        else if (sourceUrl.includes('cdn.jwplayer.com') || sourceUrl.includes('.m3u8')) {
            safeLog('🔍 [Extractor] CDN JWPlayer (direct m3u8)');
            streams.push({
                url: sourceUrl,
                name: item.chName || 'CDN Stream',
                title: item.chName || 'CDN Stream',
                behaviorHints: {
                    notWebReady: false,
                    httpHeaders: [{ 'Referer': '' }]
                },
                addonName: 'inatbox',
                addonManifestUrl
            });
        }

        if (streams.length === 0) {
            safeLog('⚠️ [Extractor] No extractor matched, trying generic fallback');
            safeLog(`📄 [Extractor] Source URL: ${sourceUrl.substring(0, 100)}...`);
            safeLog(`📄 [Extractor] Body size: ${body.length} bytes`);
            safeLog(`📄 [Extractor] Body preview: ${body.substring(0, 200)}...`);

            // chReg kontrolü - Kotlin'deki gibi Regex1 ile parse et
            const chReg = item.chReg;
            let extractedUrl = null;

            if (chReg && chReg.length > 0) {
                const regexPattern = chReg[0].Regex1;
                safeLog(`🔍 [Extractor] Trying regex pattern: ${regexPattern}`);

                if (regexPattern && regexPattern !== 'null') {
                    try {
                        // Regex pattern'i uygula
                        const regex = new RegExp(regexPattern, 'gi');
                        const match = regex.exec(body);

                        if (match && match[1]) {
                            extractedUrl = match[1];
                            safeLog(`✅ [Extractor] Regex extracted URL: ${extractedUrl.substring(0, 80)}...`);
                        } else {
                            safeLog('⚠️ [Extractor] Regex did not match');
                        }
                    } catch (e) {
                        safeLog(`⚠️ [Extractor] Regex error: ${e.message}`);
                    }
                }
            }

            // Eğer regex ile URL çıkarılamazsa, source URL'i kullan
            const finalUrl = extractedUrl || sourceUrl;
            safeLog(`📄 [Extractor] Using ${extractedUrl ? 'extracted' : 'source'} URL as generic stream: ${finalUrl.substring(0, 80)}...`);

            // Headers'ı normalize et
            let headersArray = item.chHeaders || [];
            if (typeof headersArray === 'string' && headersArray !== 'null') {
                try {
                    headersArray = JSON.parse(headersArray);
                } catch (e) {
                    headersArray = [];
                }
            }
            if (!Array.isArray(headersArray)) {
                headersArray = [headersArray];
            }
            if (headersArray.length === 0) {
                headersArray = [{
                    'Referer': '',
                    'User-Agent': CONFIG.userAgent
                }];
            }

            streams.push({
                url: finalUrl,
                name: item.chName || 'Generic Stream',
                title: item.chName || 'Generic Stream',
                behaviorHints: {
                    notWebReady: false,
                    httpHeaders: headersArray
                },
                addonName: 'inatbox',
                addonManifestUrl
            });

            safeLog(`✅ [Extractor] Generated 1 generic fallback stream`);
        } else {
            safeLog(`✅ [Extractor] Generated ${streams.length} stream(s)`);
        }

        return { streams };
    }

    // ============ STREAM FETCH FOR EXTRACT (POST → JSON → Create Extractor Instruction) ============
    if (purpose === 'stream_fetch_for_extract') {
        safeLog('🔍 [Stream] POST response received, extracting first item for extractor');
        const item = metadata?.originalItem;
        if (!item || !data) {
            safeLog('⚠️ No original item or data');
            return { streams: [] };
        }

        // Kotlin line 345-352: İlk item'ı al
        let firstItem = null;
        if (Array.isArray(data) && data.length > 0) {
            firstItem = data[0];
        } else if (typeof data === 'object') {
            firstItem = data;
        }

        if (!firstItem || !firstItem.chUrl) {
            safeLog('❌ No chUrl in first item');
            return { streams: [] };
        }

        // Kotlin line 347-351: Metadata'yı koru
        const extractItem = {
            chName: item.chName || item.diziName,
            chUrl: vkSourceFix(firstItem.chUrl),
            chImg: item.chImg || item.diziImg,
            chHeaders: firstItem.chHeaders || item.chHeaders || [],
            chReg: firstItem.chReg || item.chReg || null,
            chType: item.chType || item.diziType
        };

        safeLog(`🔍 [Stream] Creating extractor instruction for: ${extractItem.chUrl.substring(0, 80)}...`);

        // Yeni extractor instruction oluştur
        return {
            instructions: [{
                requestId: `inat-extract-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                purpose: 'stream_extract',
                url: extractItem.chUrl,
                method: 'GET',
                headers: {
                    'Accept': '*/*',
                    'Referer': extractItem.chHeaders?.[0]?.Referer || 'https://speedrestapi.com/',
                    'User-Agent': extractItem.chHeaders?.[0]?.UserAgent || CONFIG.userAgent || 'Mozilla/5.0',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                metadata: { originalItem: extractItem, extractorNeeded: true }
            }]
        };
    }

    // ============ META HANDLER ============
    if (purpose === 'meta' || purpose === 'meta_series_seasons' || purpose === 'meta_series_episodes') {
        const item = metadata?.originalItem;
        if (!item) {
            safeLog('⚠️ No original item in metadata');
            return { meta: null };
        }

        // Kanal için direkt meta
        if (metadata?.isChannel) {
            safeLog('📺 [InatBox Meta] Channel - returning direct meta');
            const id = `inatbox:${Buffer.from(JSON.stringify(item)).toString('base64')}`;
            return {
                meta: {
                    id,
                    type: 'tv',
                    name: item.chName || 'Unknown',
                    poster: item.chImg || null,
                    description: '',
                    addonName: 'inatbox',
                    addonManifestUrl
                }
            };
        }

        const id = `inatbox:${Buffer.from(JSON.stringify(item)).toString('base64')}`;

        // Tip belirle
        let type = 'movie';
        if (item.diziType === 'dizi') {
            type = 'series';
        } else if (item.diziType === 'film') {
            type = 'movie';
        } else if (item.chType) {
            type = 'tv';
        }

        const meta = {
            id,
            type,
            name: item.diziName || item.chName || 'Unknown',
            poster: item.diziImg || item.chImg || null,
            description: item.diziDetay || '',
            releaseInfo: item.diziYear || '',
            addonName: 'inatbox',
            addonManifestUrl
        };

        // ======== DİZİ - SEZON LİSTESİ ========
        if (purpose === 'meta_series_seasons' && type === 'series' && Array.isArray(data)) {
            safeLog(`📺 [Meta] Series detected, fetching episodes for ${data.length} seasons`);

            // Her sezon için bölüm isteği oluştur
            const episodeInstructions = [];
            data.forEach((season, seasonIndex) => {
                if (season.diziUrl) {
                    const body = buildRequestBody();
                    const urlObj = new URL(season.diziUrl);
                    const requestId = `inat-season-${seasonIndex + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

                    episodeInstructions.push({
                        requestId,
                        purpose: 'meta_series_episodes',
                        url: season.diziUrl,
                        method: 'POST',
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Content-Length': Buffer.byteLength(body, 'utf8').toString(),
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'Host': urlObj.host,
                            'Referer': 'https://speedrestapi.com/',
                            'X-Requested-With': 'com.bp.box',
                            'User-Agent': CONFIG.userAgent
                        },
                        body,
                        metadata: {
                            originalItem: item,
                            seasonNumber: seasonIndex + 1,
                            seasonName: season.diziName
                        }
                    });
                }
            });

            // İlk sezonun posterını kullan
            if (data[0] && data[0].diziImg) {
                meta.poster = data[0].diziImg;
            }

            safeLog(`📋 [Meta] Creating ${episodeInstructions.length} season fetch instructions`);
            return {
                instructions: episodeInstructions,
                partialMeta: meta
            };
        }

        // ======== DİZİ - BÖLÜM LİSTESİ ========
        if (purpose === 'meta_series_episodes' && Array.isArray(data)) {
            const seasonNumber = metadata?.seasonNumber || 1;
            safeLog(`📺 [Meta] Processing ${data.length} episodes for season ${seasonNumber}`);

            const videos = [];
            data.forEach((episode, idx) => {
                if (episode.chName || episode.diziName) {
                    const episodeId = `inatbox:${Buffer.from(JSON.stringify(episode)).toString('base64')}`;
                    videos.push({
                        id: episodeId,
                        title: episode.chName || episode.diziName,
                        thumbnail: episode.chImg || episode.diziImg || null,
                        season: seasonNumber,
                        episode: idx + 1
                    });
                }
            });

            safeLog(`✅ [Meta] Season ${seasonNumber}: ${videos.length} episodes`);
            // Backend expects 'meta' object with 'videos' inside for nested instructions
            return {
                meta: {
                    videos: videos
                }
            };
        }

        // ======== FİLM ========
        if (type === 'movie' && item.diziType === 'film') {
            safeLog('🎬 [Meta] Movie type - meta ready');
            // Film için response'ta stream bilgileri var, meta hazır
            return { meta };
        }

        // Default
        return { meta };
    }

    // ============ STREAM HANDLER (Deprecated - artık extractor kullanıyoruz) ============
    // Not: Bu handler artık film/series için kullanılmıyor, sadece live_url için geçerli
    // Film ve series için stream_extract handler'ı kullanılıyor
    if (purpose === 'stream') {
        safeLog('⚠️ [Stream] Old stream handler called - this should not happen for tekli_regex types');
        return { streams: [] };
    }

    return { ok: true };
}

// Helper function - VK source düzeltme
function vkSourceFix(url) {
    if (url && url.startsWith('act')) {
        return `https://vk.com/al_video.php?${url}`;
    }
    return url;
}

// Safe logging
function safeLog(...args) {
    try {
        console.log(...args);
    } catch (e) {
        // Sessizce hata yut
    }
}
// Export
module.exports = {
    manifest,
    getManifest: () => manifest,
    handleCatalog,
    handleMeta,
    handleStream,
    processFetchResult
};
