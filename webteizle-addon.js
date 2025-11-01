const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.webteizle',
    version: '1.0.0',
    name: 'WebteIzle',
    description: 'Türkçe film izleme platformu - HD kalitede filmler, çoklu server seçenekleri',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie'],
    catalogs: [
        {
            type: 'movie',
            id: 'webteizle_guncel',
            name: 'Güncel Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'webteizle_yeni',
            name: 'Yeni Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'webteizle_tavsiye',
            name: 'Tavsiye Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'webteizle_aksiyon',
            name: 'Aksiyon',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'webteizle_komedi',
            name: 'Komedi',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'webteizle_korku',
            name: 'Korku',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'webteizle_search',
            name: 'Arama',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['webteizle']
};

const BASE_URL = 'https://webteizle1.xyz';

// Katalog URL'leri
const CATALOG_URLS = {
    'webteizle_guncel': `${BASE_URL}/film-izle/`,
    'webteizle_yeni': `${BASE_URL}/yeni-filmler/`,
    'webteizle_tavsiye': `${BASE_URL}/tavsiye-filmler/`,
    'webteizle_aksiyon': `${BASE_URL}/filtre/`,
    'webteizle_komedi': `${BASE_URL}/filtre/`,
    'webteizle_korku': `${BASE_URL}/filtre/`
};

const GENRE_PARAMS = {
    'webteizle_aksiyon': 'tur=Aksiyon',
    'webteizle_komedi': 'tur=Komedi',
    'webteizle_korku': 'tur=Korku'
};

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [WebteIzle Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 18) + 1;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalog
    if (catalogId === 'webteizle_search' && searchQuery) {
        // Turkish characters için ISO-8859-9 encode
        const encodedQuery = encodeURIComponent(searchQuery);
        const requestId = `webteizle-search-${Date.now()}-${randomId}`;

        return {
            instructions: [{
                requestId,
                purpose: 'catalog_search',
                url: `${BASE_URL}/filtre?a=${encodedQuery}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': BASE_URL + '/'
                }
            }]
        };
    }

    // Normal catalog
    const baseUrl = CATALOG_URLS[catalogId];
    if (!baseUrl) {
        return { instructions: [] };
    }

    let url;
    if (GENRE_PARAMS[catalogId]) {
        url = `${baseUrl}${page}?${GENRE_PARAMS[catalogId]}`;
    } else {
        url = `${baseUrl}${page}`;
    }

    const requestId = `webteizle-catalog-${catalogId}-${page}-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            metadata: { catalogId }
        }]
    };
}

async function handleMeta(args) {
    const url = Buffer.from(args.id.replace('webteizle:', ''), 'base64').toString('utf-8');

    console.log(`📺 [WebteIzle Meta] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `webteizle-meta-${Date.now()}-${randomId}`;

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
    const url = Buffer.from(args.id.replace('webteizle:', ''), 'base64').toString('utf-8');

    console.log(`🎬 [WebteIzle Stream] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `webteizle-stream-${Date.now()}-${randomId}`;

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

    console.log(`\n⚙️ [WebteIzle Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    // Catalog ve Catalog Search
    if (purpose === 'catalog' || purpose === 'catalog_search') {
        try {
            const $ = cheerio.load(body);
            const metas = [];

            $('div.golgever').each((i, elem) => {
                const title = $(elem).find('div.filmname').text().trim();
                if (!title) return;

                const href = $(elem).find('a').attr('href');
                if (!href) return;

                const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                const posterUrl = $(elem).find('img').attr('data-src');

                const id = 'webteizle:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                metas.push({
                    id: id,
                    type: 'movie',
                    name: title,
                    poster: posterUrl || null
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

            const ogTitle = $('[property="og:title"]').attr('content');
            const title = ogTitle ? ogTitle.replace(' izle', '').trim() : null;

            if (!title) {
                return { meta: null };
            }

            const poster = $('div.card img').attr('data-src');

            // Yapım Yılı
            const yearText = $('td:contains("Vizyon")').next().text().trim();
            const year = yearText ? parseInt(yearText.split(' ').pop()) : null;

            const description = $('blockquote').text().trim();

            // Türler
            const tags = [];
            $('a[itemgroup="genre"]').each((i, elem) => {
                tags.push($(elem).text().trim());
            });

            // IMDB Puanı
            const ratingText = $('div.detail').text().trim();
            const rating = ratingText ? ratingText.replace(',', '.') : null;

            // Süre
            const durationText = $('td:contains("Süre")').next().text().trim();
            const duration = durationText ? `${durationText.split(' ')[0]} dk` : null;

            // Trailer
            const trailerYtId = $('button#fragman').attr('data-ytid');
            const trailer = trailerYtId ? `https://www.youtube.com/watch?v=${trailerYtId}` : null;

            // Oyuncular
            const actors = [];
            $('div[data-tab="oyuncular"] a').each((i, elem) => {
                const actorName = $(elem).find('span').text().trim();
                if (actorName) actors.push(actorName);
            });

            const meta = {
                id: 'webteizle:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                type: 'movie',
                name: title,
                poster: poster || null,
                background: poster || null,
                description: description || 'Açıklama mevcut değil',
                releaseInfo: year ? year.toString() : null,
                imdbRating: rating || null,
                genres: tags.length > 0 ? tags : undefined,
                runtime: duration,
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

            // Film ID'yi al
            const filmId = $('button#wip').attr('data-id');
            if (!filmId) {
                console.log('❌ No film ID found');
                return { streams: [] };
            }

            console.log(`📺 Film ID: ${filmId}`);

            // Dil seçeneklerini kontrol et
            const dilList = [];
            if ($('div.golge a[href*=dublaj]').length > 0) {
                dilList.push('0'); // Dublaj
            }
            if ($('div.golge a[href*=altyazi]').length > 0) {
                dilList.push('1'); // Altyazı
            }

            if (dilList.length === 0) {
                dilList.push('0'); // Varsayılan
            }

            // Her dil için instruction oluştur
            const instructions = [];
            dilList.forEach(dil => {
                const dilAd = dil === '0' ? 'Dublaj' : 'Altyazı';
                const randomId = Math.random().toString(36).substring(2, 10);

                instructions.push({
                    requestId: `webteizle-player-${dil}-${Date.now()}-${randomId}`,
                    purpose: 'stream_player',
                    url: `${BASE_URL}/ajax/dataAlternatif3.asp`,
                    method: 'POST',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `filmid=${filmId}&dil=${dil}&s=&b=&bot=0`,
                    metadata: { dilAd, filmId, originalUrl: url }
                });
            });

            return { instructions };
        } catch (error) {
            console.log('❌ Stream error:', error.message);
            return { streams: [] };
        }
    }

    // Stream Player (get embed list)
    if (purpose === 'stream_player') {
        try {
            const playerData = JSON.parse(body);
            const embeds = playerData?.data || [];

            if (embeds.length === 0) {
                console.log('⚠️  No embeds found');
                return { streams: [] };
            }

            // Her embed için instruction oluştur
            const instructions = [];
            embeds.forEach((embed, index) => {
                const randomId = Math.random().toString(36).substring(2, 10);
                const dilAd = metadata?.dilAd || 'Unknown';

                instructions.push({
                    requestId: `webteizle-embed-${index}-${Date.now()}-${randomId}`,
                    purpose: 'stream_embed',
                    url: `${BASE_URL}/ajax/dataEmbed.asp`,
                    method: 'POST',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `id=${embed.id}`,
                    metadata: {
                        streamName: `WebteIzle ${dilAd} Server ${index + 1}`,
                        originalUrl: metadata?.originalUrl
                    }
                });
            });

            return { instructions };
        } catch (error) {
            console.log('❌ Player parse error:', error.message);
            return { streams: [] };
        }
    }

    // Stream Embed (extract iframe)
    if (purpose === 'stream_embed') {
        try {
            const $ = cheerio.load(body);
            let iframe = $('iframe').attr('src');

            // Eğer iframe yoksa, script içinden çıkar
            if (!iframe) {
                const scriptContent = body;

                // vidmoly pattern
                const vidmolyMatch = scriptContent.match(/vidmoly\('([\d\w]+)',/);
                if (vidmolyMatch) {
                    const vidId = vidmolyMatch[1];
                    iframe = `https://vidmoly.to/embed-${vidId}.html`;
                } else {
                    // DzenRu pattern
                    const hasDzen = /_0x5c93/.test(scriptContent);
                    if (hasDzen) {
                        const dzenMatch = scriptContent.match(/var\s+vid\s*=\s*['"]([^'"]+)['"]/);
                        if (dzenMatch) {
                            iframe = `https://dzen.ru/embed/${dzenMatch[1]}`;
                        }
                    }
                }
            }

            if (!iframe) {
                console.log('❌ No iframe found in embed');
                return { streams: [] };
            }

            const fullIframeUrl = iframe.startsWith('http') ? iframe : `${BASE_URL}${iframe}`;

            console.log(`✅ Iframe found: ${fullIframeUrl.substring(0, 80)}...`);

            // Extractor kontrolü
            const videoExtractors = require('./video-extractors');

            // DzenRu
            if (fullIframeUrl.includes('dzen.ru')) {
                return videoExtractors.getDzenRuInstructions(fullIframeUrl, url, metadata?.streamName || 'WebteIzle');
            }

            // Vidmoly ve diğer generic iframe'ler
            const randomId = Math.random().toString(36).substring(2, 10);
            return {
                instructions: [{
                    requestId: `webteizle-extract-${Date.now()}-${randomId}`,
                    purpose: 'stream_extract',
                    url: fullIframeUrl,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': BASE_URL + '/'
                    },
                    metadata: metadata
                }]
            };
        } catch (error) {
            console.log('❌ Embed error:', error.message);
            return { streams: [] };
        }
    }

    // Stream Extract
    if (purpose === 'stream_extract') {
        try {
            const streams = [];
            const streamName = metadata?.streamName || 'WebteIzle';

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
                console.log('❌ No M3U8 found');
            }

            return { streams };
        } catch (error) {
            console.log('❌ Stream extraction error:', error.message);
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

