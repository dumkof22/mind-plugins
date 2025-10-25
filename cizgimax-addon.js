const cheerio = require('cheerio');
const crypto = require('crypto');

// Manifest tanımı
const manifest = {
    id: 'community.cizgimax',
    version: '1.0.0',
    name: 'CizgiMax',
    description: 'Türkçe çizgi film izleme platformu - CizgiMax.online için Stremio eklentisi',
    resources: ['catalog', 'meta', 'stream'],
    types: ['series'],
    catalogs: [
        {
            type: 'series',
            id: 'cizgi_search',
            name: 'Arama',
            extra: [
                { name: 'search', isRequired: true }
            ]
        },
        {
            type: 'series',
            id: 'cizgi_latest',
            name: 'Son Eklenenler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgi_aile',
            name: 'Aile',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgi_aksiyon',
            name: 'Aksiyon',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgi_animasyon',
            name: 'Animasyon',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgi_bilimkurgu',
            name: 'Bilim Kurgu',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgi_cocuklar',
            name: 'Çocuklar',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgi_komedi',
            name: 'Komedi',
            extra: [{ name: 'skip', isRequired: false }]
        }
    ],
    idPrefixes: ['cizgimax']
};

const BASE_URL = 'https://cizgimax.online';

const CATALOG_PARAMS = {
    'cizgi_latest': '?orderby=date&order=DESC',
    'cizgi_aile': '?s_type&tur[0]=aile&orderby=date&order=DESC',
    'cizgi_aksiyon': '?s_type&tur[0]=aksiyon-macera&orderby=date&order=DESC',
    'cizgi_animasyon': '?s_type&tur[0]=animasyon&orderby=date&order=DESC',
    'cizgi_bilimkurgu': '?s_type&tur[0]=bilim-kurgu-fantazi&orderby=date&order=DESC',
    'cizgi_cocuklar': '?s_type&tur[0]=cocuklar&orderby=date&order=DESC',
    'cizgi_komedi': '?s_type&tur[0]=komedi&orderby=date&order=DESC'
};

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [CizgiMax Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 20) + 1;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalog
    if (catalogId === 'cizgi_search') {
        if (!searchQuery) {
            return { instructions: [] };
        }

        const requestId = `cizgimax-search-${Date.now()}-${randomId}`;
        return {
            instructions: [{
                requestId,
                purpose: 'catalog_search',
                url: `${BASE_URL}/ajaxservice/index.php?qr=${encodeURIComponent(searchQuery)}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }]
        };
    }

    // Normal catalog
    const params = CATALOG_PARAMS[catalogId];
    if (!params) {
        return { instructions: [] };
    }

    const requestId = `cizgimax-catalog-${catalogId}-${page}-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: `${BASE_URL}/diziler/page/${page}${params}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }]
    };
}

async function handleMeta(args) {
    const url = Buffer.from(args.id.replace('cizgimax:', ''), 'base64').toString('utf-8');

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `cizgimax-meta-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }]
    };
}

async function handleStream(args) {
    const parts = args.id.replace('cizgimax:', '').split('_');
    const urlBase64 = parts[0];
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `cizgimax-stream-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, url } = fetchResult;

    console.log(`\n⚙️ [CizgiMax Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    const $ = cheerio.load(body);

    // Catalog Search
    if (purpose === 'catalog_search') {
        try {
            const data = JSON.parse(body);
            const results = data.data?.result || [];

            const metas = results.filter(result => {
                // Bölüm ve sezon linklerini filtrele
                return !result.s_name.includes('.Bölüm') &&
                    !result.s_name.includes('.Sezon') &&
                    !result.s_name.includes('-Sezon') &&
                    !result.s_name.includes('-izle');
            }).map(result => ({
                id: 'cizgimax:' + Buffer.from(result.s_link).toString('base64').replace(/=/g, ''),
                type: 'series',
                name: result.s_name,
                poster: result.s_image || null
            }));

            console.log(`✅ Found ${metas.length} search results`);
            return { metas };
        } catch (e) {
            console.log('⚠️  Search parse error:', e.message);
            return { metas: [] };
        }
    }

    // Catalog
    if (purpose === 'catalog') {
        const metas = [];

        $('ul.filter-results li').each((i, elem) => {
            const title = $(elem).find('h2.truncate').text().trim();
            const href = $(elem).find('div.poster-subject a').attr('href');
            const poster = $(elem).find('div.poster-media img').attr('data-src');

            if (title && href) {
                const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                const id = 'cizgimax:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                metas.push({
                    id: id,
                    type: 'series',
                    name: title,
                    poster: poster || null
                });
            }
        });

        console.log(`✅ Found ${metas.length} items in catalog`);
        return { metas };
    }

    // Meta
    if (purpose === 'meta') {
        const title = $('h1.page-title').text().trim();
        const poster = $('img.series-profile-thumb').attr('src');
        const description = $('p#tv-series-desc').text().trim();
        const rating = $('div.color-imdb').text().trim();

        const genres = [];
        $('div.genre-item a').each((i, elem) => {
            genres.push($(elem).text().trim());
        });

        const videos = [];

        $('div.asisotope div.ajax_post').each((i, elem) => {
            const epName = $(elem).find('span.episode-names').text().trim();
            const epHref = $(elem).find('a').attr('href');
            const seasonName = $(elem).find('span.season-name').text().trim();

            const epEpisode = epName.match(/(\d+)\.Bölüm/)?.[1];
            const epSeason = seasonName.match(/(\d+)\.Sezon/)?.[1] || 1;

            if (epName && epHref) {
                const fullUrl = epHref.startsWith('http') ? epHref : `${BASE_URL}${epHref}`;
                const episodeId = Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                videos.push({
                    id: `cizgimax:${episodeId}`,
                    title: epName,
                    season: parseInt(epSeason),
                    episode: epEpisode ? parseInt(epEpisode) : null
                });
            }
        });

        const meta = {
            id: fetchResult.requestId.includes('cizgimax:') ? fetchResult.requestId : 'cizgimax:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
            type: 'series',
            name: title,
            poster: poster || null,
            background: poster || null,
            description: description || 'Açıklama mevcut değil',
            genres: genres,
            imdbRating: rating || null,
            videos: videos
        };

        console.log(`✅ Meta retrieved: ${title} with ${videos.length} episodes`);
        return { meta };
    }

    // Stream - Extract iframe links
    if (purpose === 'stream') {
        const instructions = [];

        $('ul.linkler li').each((i, elem) => {
            const iframe = $(elem).find('a').attr('data-frame');

            if (iframe && iframe.startsWith('http')) {
                const randomId = Math.random().toString(36).substring(2, 10);
                const requestId = `cizgimax-extract-${Date.now()}-${randomId}`;

                let extractPurpose = null;
                let streamName = 'CizgiMax';

                if (iframe.includes('sibnet.ru')) {
                    extractPurpose = 'extract_sibnet';
                    streamName = 'SibNet';
                } else if (iframe.includes('cizgiduo.online')) {
                    extractPurpose = 'extract_cizgiduo';
                    streamName = 'CizgiDuo';
                } else if (iframe.includes('cizgipass')) {
                    extractPurpose = 'extract_cizgipass';
                    streamName = 'CizgiPass';
                } else if (iframe.includes('drive.google.com')) {
                    extractPurpose = 'extract_drive';
                    streamName = 'Google Drive';
                }

                if (extractPurpose) {
                    instructions.push({
                        requestId,
                        purpose: extractPurpose,
                        url: iframe,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': url
                        },
                        metadata: { streamName }
                    });
                }
            }
        });

        console.log(`✅ Found ${instructions.length} extractor(s)`);

        if (instructions.length > 0) {
            return { instructions };
        }

        return { streams: [] };
    }

    // ========== EXTRACTORS ==========

    // SibNet Extractor
    if (purpose === 'extract_sibnet') {
        const streams = [];
        const streamName = fetchResult.metadata?.streamName || 'SibNet';

        try {
            const m3uMatch = body.match(/player\.src\(\[\{src:\s*"([^"]+)"/);
            if (m3uMatch) {
                const m3uPath = m3uMatch[1];
                const m3uUrl = `https://video.sibnet.ru${m3uPath}`;

                streams.push({
                    name: streamName,
                    title: streamName,
                    url: m3uUrl,
                    behaviorHints: {
                        notWebReady: false
                    }
                });

                console.log(`✅ SibNet: URL extracted - ${m3uUrl.substring(0, 60)}...`);
            } else {
                console.log('⚠️  SibNet: No m3u link found');
            }
        } catch (e) {
            console.log('⚠️  SibNet extraction error:', e.message);
        }

        return { streams };
    }

    // CizgiDuo/CizgiPass Extractor (AES encrypted)
    if (purpose === 'extract_cizgiduo' || purpose === 'extract_cizgipass') {
        const streams = [];
        const streamName = fetchResult.metadata?.streamName || 'CizgiDuo';

        try {
            const bePlayerMatch = body.match(/bePlayer\('([^']+)',\s*'(\{[^}]+\})'\);/);

            if (bePlayerMatch) {
                const bePlayerPass = bePlayerMatch[1];
                const bePlayerData = bePlayerMatch[2];

                // AES Decryption (Kotlin AesHelper.cryptoAESHandler ile aynı)
                const key = Buffer.from(bePlayerPass, 'utf-8');
                const decipher = crypto.createDecipheriv('aes-128-cbc', key.slice(0, 16), Buffer.alloc(16, 0));
                decipher.setAutoPadding(true);
                
                let decrypted = decipher.update(bePlayerData, 'base64', 'utf8');
                decrypted += decipher.final('utf8');
                decrypted = decrypted.replace(/\\/g, '');

                console.log(`✅ ${streamName}: Decrypted data`);

                const m3uMatch = decrypted.match(/video_location":"([^"]+)"/);
                if (m3uMatch) {
                    const m3uUrl = m3uMatch[1];

                    streams.push({
                        name: streamName,
                        title: streamName,
                        url: m3uUrl,
                        behaviorHints: {
                            notWebReady: false
                        }
                    });

                    console.log(`✅ ${streamName}: URL extracted - ${m3uUrl.substring(0, 60)}...`);
                } else {
                    console.log(`⚠️  ${streamName}: No video_location found in decrypted data`);
                }
            }
        } catch (e) {
            console.log(`⚠️  ${streamName} extraction error:`, e.message);
        }

        return { streams };
    }

    // Google Drive Extractor (gdplayer.vip API kullanarak - Kotlin ile aynı)
    if (purpose === 'extract_drive') {
        const streams = [];
        const streamName = fetchResult.metadata?.streamName || 'Google Drive';

        try {
            const urlId = url.match(/\/d\/([^/]+)\//)?.[1];

            if (urlId) {
                const randomId = Math.random().toString(36).substring(2, 10);
                const requestId = `drive-gdplayer-${Date.now()}-${randomId}`;

                return {
                    instructions: [{
                        requestId,
                        purpose: 'extract_drive_gdplayer',
                        url: 'https://gdplayer.vip/api/video',
                        method: 'POST',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: `file_id=${urlId}&subtitle=`,
                        metadata: { streamName, urlId }
                    }]
                };
            }

            console.log('⚠️  Drive: No urlId found');
        } catch (e) {
            console.log('⚠️  Drive extraction error:', e.message);
        }

        return { streams };
    }

    // Google Drive - gdplayer.vip API response
    if (purpose === 'extract_drive_gdplayer') {
        const streams = [];
        const streamName = fetchResult.metadata?.streamName || 'Google Drive';

        try {
            const data = JSON.parse(body);
            const embedUrl = data.data?.embed_url;

            if (embedUrl) {
                const randomId = Math.random().toString(36).substring(2, 10);
                const requestId = `drive-embed-${Date.now()}-${randomId}`;

                return {
                    instructions: [{
                        requestId,
                        purpose: 'extract_drive_embed',
                        url: embedUrl,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://gdplayer.vip/'
                        },
                        metadata: { streamName }
                    }]
                };
            }

            console.log('⚠️  Drive: No embed_url found in API response');
        } catch (e) {
            console.log('⚠️  Drive gdplayer API error:', e.message);
        }

        return { streams };
    }

    // Google Drive - Parse embed page and get video URLs
    if (purpose === 'extract_drive_embed') {
        const streams = [];
        const streamName = fetchResult.metadata?.streamName || 'Google Drive';

        try {
            const $ = cheerio.load(body);
            const ngInit = $('body[ng-init]').attr('ng-init');

            if (ngInit) {
                const initMatch = ngInit.match(/init\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)'\)/);

                if (initMatch) {
                    const playUrl = initMatch[2];
                    const keyHex = initMatch[3];

                    const randomId = Math.random().toString(36).substring(2, 10);
                    const requestId = `drive-qualities-${Date.now()}-${randomId}`;

                    return {
                        instructions: [{
                            requestId,
                            purpose: 'extract_drive_qualities',
                            url: `${playUrl}/?video_id=${keyHex}&action=get_video`,
                            method: 'GET',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': 'https://gdplayer.vip/'
                            },
                            metadata: { streamName, playUrl, keyHex }
                        }]
                    };
                }
            }

            console.log('⚠️  Drive: No ng-init found in embed page');
        } catch (e) {
            console.log('⚠️  Drive embed parse error:', e.message);
        }

        return { streams };
    }

    // Google Drive - Extract quality URLs
    if (purpose === 'extract_drive_qualities') {
        const streams = [];
        const streamName = fetchResult.metadata?.streamName || 'Google Drive';
        const playUrl = fetchResult.metadata?.playUrl;
        const keyHex = fetchResult.metadata?.keyHex;

        try {
            const data = JSON.parse(body);
            const qualities = data.qualities || [];

            qualities.forEach(q => {
                const quality = q.quality;
                const videoUrl = `${playUrl}/?video_id=${keyHex}&quality=${quality}&action=p`;

                streams.push({
                    name: `${streamName} ${quality}p`,
                    title: `${streamName} ${quality}p`,
                    url: videoUrl,
                    behaviorHints: {
                        notWebReady: false
                    }
                });

                console.log(`✅ Drive: ${quality}p URL extracted`);
            });

            if (streams.length === 0) {
                console.log('⚠️  Drive: No qualities found');
            }
        } catch (e) {
            console.log('⚠️  Drive qualities error:', e.message);
        }

        return { streams };
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

