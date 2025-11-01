const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.4kfilmizlesene',
    version: '1.0.0',
    name: '4KFilmİzlesene',
    description: 'Türkçe ve yabancı filmler 4K kalitede - 4KFilmİzlesene platformu',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie'],
    catalogs: [
        {
            type: 'movie',
            id: '4kfi_yeni_eklenenler',
            name: 'Yeni Eklenenler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: '4kfi_aile',
            name: 'Aile Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: '4kfi_aksiyon',
            name: 'Aksiyon',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: '4kfi_animasyon',
            name: 'Animasyon',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: '4kfi_belgesel',
            name: 'Belgesel',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: '4kfi_bilim_kurgu',
            name: 'Bilim Kurgu',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: '4kfi_komedi',
            name: 'Komedi',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: '4kfi_korku',
            name: 'Korku',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: '4kfi_yerli',
            name: 'Yerli Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: '4kfi_search',
            name: 'Arama',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['4kfi']
};

const BASE_URL = 'https://www.4kfilmizlesene.us';

// Katalog URL'leri
const CATALOG_URLS = {
    '4kfi_yeni_eklenenler': `${BASE_URL}/`,
    '4kfi_aile': `${BASE_URL}/tur/aile-filmleri/`,
    '4kfi_aksiyon': `${BASE_URL}/tur/aksiyon-filmleri/`,
    '4kfi_animasyon': `${BASE_URL}/tur/animasyon-filmleri/`,
    '4kfi_belgesel': `${BASE_URL}/tur/belgesel/`,
    '4kfi_bilim_kurgu': `${BASE_URL}/tur/bilim-kurgu-filmleri/`,
    '4kfi_komedi': `${BASE_URL}/tur/komedi-filmleri/`,
    '4kfi_korku': `${BASE_URL}/tur/korku/`,
    '4kfi_yerli': `${BASE_URL}/tur/yerli-film-izle/`
};

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [4KFilmIzlesene Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 18) + 1;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalog
    if (catalogId === '4kfi_search' && searchQuery) {
        const requestId = `4kfi-search-${Date.now()}-${randomId}`;
        return {
            instructions: [{
                requestId,
                purpose: 'catalog_search',
                url: `${BASE_URL}/?s=${encodeURIComponent(searchQuery)}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
                }
            }]
        };
    }

    // Normal catalog
    const baseUrl = CATALOG_URLS[catalogId];
    if (!baseUrl) {
        return { instructions: [] };
    }

    const url = page > 1 ? `${baseUrl}page/${page}` : baseUrl;
    const requestId = `4kfi-catalog-${catalogId}-${page}-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            metadata: { catalogId }
        }]
    };
}

async function handleMeta(args) {
    const url = Buffer.from(args.id.replace('4kfi:', ''), 'base64').toString('utf-8');

    console.log(`📺 [4KFilmIzlesene Meta] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `4kfi-meta-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        }]
    };
}

async function handleStream(args) {
    const url = Buffer.from(args.id.replace('4kfi:', ''), 'base64').toString('utf-8');

    console.log(`🎬 [4KFilmIzlesene Stream] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `4kfi-stream-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata } = fetchResult;

    console.log(`\n⚙️ [4KFilmIzlesene Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    // Catalog ve Catalog Search
    if (purpose === 'catalog' || purpose === 'catalog_search') {
        try {
            const $ = cheerio.load(body);
            const metas = [];

            $('div.film-box').each((i, elem) => {
                const title = $(elem).find('div.name').text().trim();
                if (!title) return;

                const href = $(elem).find('a').attr('href');
                if (!href) return;

                const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

                // Poster - önce data-lazy-src sonra src
                let posterUrl = $(elem).find('div.img img').attr('data-lazy-src');
                if (!posterUrl || posterUrl === '') {
                    posterUrl = $(elem).find('div.img img').attr('src');
                }

                // IMDB Puanı
                const rating = $(elem).find('span.align-right').text().trim();

                const id = '4kfi:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                metas.push({
                    id: id,
                    type: 'movie',
                    name: title,
                    poster: posterUrl || null,
                    imdbRating: rating || null
                });
            });

            console.log(`✅ Found ${metas.length} items in catalog`);
            return { metas };
        } catch (error) {
            console.log('❌ Catalog parse error:', error.message);
            return { metas: [] };
        }
    }

    // Meta
    if (purpose === 'meta') {
        try {
            const $ = cheerio.load(body);

            const orgTitle = $('div.film h1').text().trim();
            if (!orgTitle) {
                return { meta: null };
            }

            const altTitle = $('div.original-name span').text().trim();
            const title = altTitle ? `${orgTitle} - ${altTitle}` : orgTitle;

            const poster = $('div.img img').attr('data-lazy-src');
            const description = $('div.description').text().trim();

            // Yapım Yılı
            const year = $('span[itemprop="dateCreated"]').text().trim();

            // Türler
            const tags = [];
            $('div.category a[href*="-filmleri/"]').each((i, elem) => {
                tags.push($(elem).text().trim());
            });

            // IMDB Puanı
            const rating = $('div.imdb-count').text().split(' ')[0]?.trim();

            // Oyuncular
            const actors = [];
            $('div.actors').each((i, elem) => {
                const actorName = $(elem).text().trim();
                if (actorName) actors.push(actorName);
            });

            // Trailer
            const trailerYtId = $('div.container iframe').attr('src');
            let trailer = null;
            if (trailerYtId) {
                const ytMatch = trailerYtId.match(/youtube\.com\/embed\/([^?]+)/);
                if (ytMatch) {
                    trailer = `https://www.youtube.com/watch?v=${ytMatch[1]}`;
                }
            }

            const meta = {
                id: '4kfi:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                type: 'movie',
                name: title,
                poster: poster || null,
                background: poster || null,
                description: description || 'Açıklama mevcut değil',
                releaseInfo: year || null,
                imdbRating: rating || null,
                genres: tags.length > 0 ? tags : undefined,
                cast: actors.length > 0 ? actors : undefined,
                trailer: trailer
            };

            console.log(`✅ Meta retrieved: ${title}`);
            return { meta };
        } catch (error) {
            console.log('❌ Meta parse error:', error.message);
            return { meta: null };
        }
    }

    // Stream
    if (purpose === 'stream') {
        try {
            const $ = cheerio.load(body);

            // iframe src'yi al
            let iframeSrc = $('div.video-content iframe').attr('src');

            if (!iframeSrc) {
                console.log('❌ No iframe found');
                return { streams: [] };
            }

            // Tam URL yap
            if (!iframeSrc.startsWith('http')) {
                iframeSrc = iframeSrc.startsWith('//') ? `https:${iframeSrc}` : `${BASE_URL}${iframeSrc}`;
            }

            console.log(`✅ Iframe found: ${iframeSrc.substring(0, 80)}...`);

            // Extractor kontrolü - TauVideo, Odnoklassniki, SibNet, Drive vb.
            const videoExtractors = require('./video-extractors');

            // TauVideo
            if (iframeSrc.includes('tau-video')) {
                return videoExtractors.getTauVideoInstructions(iframeSrc, url, '4KFilmIzlesene');
            }

            // Odnoklassniki (ok.ru)
            if (iframeSrc.includes('ok.ru')) {
                return videoExtractors.getOdnoklassnikiInstructions(iframeSrc, url, '4KFilmIzlesene');
            }

            // SibNet
            if (iframeSrc.includes('sibnet')) {
                return videoExtractors.getSibNetInstructions(iframeSrc, url, '4KFilmIzlesene');
            }

            // Google Drive
            if (iframeSrc.includes('drive.google.com')) {
                return videoExtractors.getDriveInstructions(iframeSrc, url, '4KFilmIzlesene');
            }

            // Genel iframe extraction
            const randomId = Math.random().toString(36).substring(2, 10);
            const requestId = `4kfi-iframe-extract-${Date.now()}-${randomId}`;

            return {
                instructions: [{
                    requestId,
                    purpose: 'iframe_extract',
                    url: iframeSrc,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': url
                    },
                    metadata: { streamName: '4KFilmIzlesene', originalUrl: url }
                }]
            };
        } catch (error) {
            console.log('❌ Stream error:', error.message);
            return { streams: [] };
        }
    }

    // Iframe extraction
    if (purpose === 'iframe_extract') {
        try {
            const streams = [];
            const streamName = metadata?.streamName || '4KFilmIzlesene';

            // M3U8 pattern'lerini ara
            let m3uMatch = body.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/);
            if (!m3uMatch) m3uMatch = body.match(/"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
            if (!m3uMatch) m3uMatch = body.match(/source:\s*["']([^"']+\.m3u8[^"']*)["']/);
            if (!m3uMatch) m3uMatch = body.match(/(https?:\/\/[^\s"'<>()]+\.m3u8[^\s"'<>()]*)/);

            if (m3uMatch) {
                const m3uUrl = m3uMatch[1] || m3uMatch[0];

                console.log(`✅ M3U8 found: ${m3uUrl.substring(0, 80)}...`);

                streams.push({
                    name: streamName,
                    title: streamName,
                    url: m3uUrl,
                    type: 'm3u8',
                    behaviorHints: {
                        notWebReady: false
                    }
                });
            } else {
                console.log('❌ No M3U8 found in iframe');
            }

            return { streams };
        } catch (error) {
            console.log('❌ Iframe extraction error:', error.message);
            return { streams: [] };
        }
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

