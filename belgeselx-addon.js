const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.belgeselx',
    version: '1.0.0',
    name: 'BelgeselX',
    description: 'Türkçe belgesel izleme platformu - BelgeselX.com için Stremio eklentisi',
    resources: ['catalog', 'meta', 'stream'],
    types: ['series'],
    catalogs: [
        {
            type: 'series',
            id: 'belgesel_search',
            name: 'Arama',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'belgesel_turk_tarihi',
            name: 'Türk Tarihi',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'belgesel_tarih',
            name: 'Tarih',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'belgesel_seyahat',
            name: 'Seyahat',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'belgesel_seri',
            name: 'Seri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'belgesel_savas',
            name: 'Savaş',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'belgesel_bilim',
            name: 'Bilim',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'belgesel_doga',
            name: 'Doğa',
            extra: [{ name: 'skip', isRequired: false }]
        }
    ],
    idPrefixes: ['belgesel']
};

const BASE_URL = 'https://belgeselx.com';

const CATALOG_URLS = {
    'belgesel_turk_tarihi': `${BASE_URL}/konu/turk-tarihi-belgeselleri`,
    'belgesel_tarih': `${BASE_URL}/konu/tarih-belgeselleri`,
    'belgesel_seyahat': `${BASE_URL}/konu/seyehat-belgeselleri`,
    'belgesel_seri': `${BASE_URL}/konu/seri-belgeseller`,
    'belgesel_savas': `${BASE_URL}/konu/savas-belgeselleri`,
    'belgesel_bilim': `${BASE_URL}/konu/bilim-belgeselleri`,
    'belgesel_doga': `${BASE_URL}/konu/doga-belgeselleri`
};

function toTitleCase(str) {
    return str.split(' ').map(word =>
        word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR')
    ).join(' ');
}

// Kotlin'deki getQualityFromName fonksiyonu (quality string'den sayısal değer çıkarır)
function getQualityFromName(qualityName) {
    if (!qualityName) return 0;

    const qualityMap = {
        '2160p': 2160,
        '1080p': 1080,
        '720p': 720,
        '480p': 480,
        '360p': 360,
        '240p': 240,
        '144p': 144,
        'FULL': 1080,
        'HD': 720,
        'SD': 480
    };

    // Önce direkt eşleşme kontrol et
    if (qualityMap[qualityName]) {
        return qualityMap[qualityName];
    }

    // Regex ile sayısal değeri çıkar
    const match = qualityName.match(/(\d+)p?/i);
    if (match) {
        return parseInt(match[1]);
    }

    return 0;
}

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [BelgeselX Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 20) + 1;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalog - Google CSE kullanıyor
    if (catalogId === 'belgesel_search') {
        if (!searchQuery) {
            return { instructions: [] };
        }

        const cx = '016376594590146270301:iwmy65ijgrm';
        const requestId = `belgesel-search-token-${Date.now()}-${randomId}`;

        // İlk olarak CSE token almamız gerekiyor
        return {
            instructions: [{
                requestId,
                purpose: 'search_get_token',
                url: `https://cse.google.com/cse.js?cx=${cx}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                metadata: { searchQuery, cx }
            }]
        };
    }

    // Normal catalog
    const url = CATALOG_URLS[catalogId];
    if (!url) {
        return { instructions: [] };
    }

    const requestId = `belgesel-catalog-${catalogId}-${page}-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: `${url}&page=${page}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }]
    };
}

async function handleMeta(args) {
    const url = Buffer.from(args.id.replace('belgesel:', ''), 'base64').toString('utf-8');

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `belgesel-meta-${Date.now()}-${randomId}`;

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
    const parts = args.id.replace('belgesel:', '').split('_');
    const urlBase64 = parts[0];
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `belgesel-stream-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            metadata: { pageUrl: url } // Referer için saklıyoruz
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, url } = fetchResult;

    console.log(`\n⚙️ [BelgeselX Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    const $ = cheerio.load(body);

    // Search - Get token
    if (purpose === 'search_get_token') {
        try {
            const cseLibVersion = body.match(/"cselibVersion":\s*"([^"]+)"/)?.[1];
            const cseToken = body.match(/"cse_token":\s*"([^"]+)"/)?.[1];
            const { searchQuery, cx } = fetchResult.metadata;

            if (cseLibVersion && cseToken) {
                const randomId = Math.random().toString(36).substring(2, 10);
                const requestId = `belgesel-search-results-${Date.now()}-${randomId}`;

                const searchUrl = `https://cse.google.com/cse/element/v1?rsz=filtered_cse&num=100&hl=tr&source=gcsc&cselibv=${cseLibVersion}&cx=${cx}&q=${encodeURIComponent(searchQuery)}&safe=off&cse_tok=${cseToken}&sort=&exp=cc%2Capo&oq=${encodeURIComponent(searchQuery)}&callback=google.search.cse.api9969&rurl=https%3A%2F%2Fbelgeselx.com%2F`;

                return {
                    instructions: [{
                        requestId,
                        purpose: 'search_results',
                        url: searchUrl,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://belgeselx.com/'
                        }
                    }]
                };
            }

            console.log('⚠️  CSE tokens not found');
            return { metas: [] };
        } catch (e) {
            console.log('⚠️  Search token error:', e.message);
            return { metas: [] };
        }
    }

    // Search Results
    if (purpose === 'search_results') {
        try {
            const titles = [...body.matchAll(/"titleNoFormatting":\s*"([^"]+)"/g)].map(m => m[1]);
            const urls = [...body.matchAll(/"unescapedUrl":\s*"([^"]+)"/g)].map(m => m[1]);
            const posterUrls = [...body.matchAll(/"ogImage":\s*"([^"]+)"/g)].map(m => m[1]);

            const metas = [];

            for (let i = 0; i < titles.length; i++) {
                const title = titles[i].split('İzle')[0].trim();
                const pageUrl = urls[i];
                const poster = posterUrls[i];

                if (pageUrl && pageUrl.includes('diziresimleri')) {
                    // URL'den dosya adını al ve .jpg uzantısını kaldır
                    const fileName = pageUrl.substring(pageUrl.lastIndexOf('/') + 1).replace(/\.(jpe?g|png|webp)$/i, '');
                    const modifiedUrl = `https://belgeselx.com/belgeseldizi/${fileName}`;

                    const id = 'belgesel:' + Buffer.from(modifiedUrl).toString('base64').replace(/=/g, '');

                    metas.push({
                        id: id,
                        type: 'series',
                        name: toTitleCase(title),
                        poster: poster || null
                    });
                }
            }

            console.log(`✅ Found ${metas.length} search results`);
            return { metas };
        } catch (e) {
            console.log('⚠️  Search results parse error:', e.message);
            return { metas: [] };
        }
    }

    // Catalog
    if (purpose === 'catalog') {
        const metas = [];

        $('div.gen-movie-contain > div.gen-info-contain > div.gen-movie-info').each((i, elem) => {
            const title = $(elem).find('div.gen-movie-info > h3 a').text().trim();
            const href = $(elem).find('div.gen-movie-info > h3 a').attr('href');
            const poster = $(elem).parent().parent().find('div.gen-movie-img > img').attr('src');

            if (title && href) {
                const id = 'belgesel:' + Buffer.from(href).toString('base64').replace(/=/g, '');
                metas.push({
                    id: id,
                    type: 'series',
                    name: toTitleCase(title),
                    poster: poster || null
                });
            }
        });

        console.log(`✅ Found ${metas.length} items in catalog`);
        return { metas };
    }

    // Meta
    if (purpose === 'meta') {
        const title = $('h2.gen-title').text().trim();
        const poster = $('div.gen-tv-show-top img').attr('src');
        const description = $('div.gen-single-tv-show-info p').text().trim();

        const genres = [];
        $('div.gen-socail-share a[href*="belgeselkanali"]').each((i, elem) => {
            const genre = $(elem).attr('href').split('/').pop().replace(/-/g, ' ');
            genres.push(toTitleCase(genre));
        });

        const videos = [];
        let counter = 0;

        $('div.gen-movie-contain').each((i, elem) => {
            const epName = $(elem).find('div.gen-movie-info h3 a').text().trim();
            const epHref = $(elem).find('div.gen-movie-info h3 a').attr('href');
            const seasonName = $(elem).find('div.gen-single-meta-holder ul li').text().trim();

            let epEpisode = seasonName.match(/Bölüm (\d+)/)?.[1];
            const epSeason = seasonName.match(/Sezon (\d+)/)?.[1] || 1;

            if (!epEpisode) {
                epEpisode = counter++;
            }

            if (epName && epHref) {
                const episodeId = Buffer.from(epHref).toString('base64').replace(/=/g, '');
                videos.push({
                    id: `belgesel:${episodeId}`,
                    title: epName,
                    season: parseInt(epSeason),
                    episode: parseInt(epEpisode)
                });
            }
        });

        const meta = {
            id: fetchResult.requestId.includes('belgesel:') ? fetchResult.requestId : 'belgesel:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
            type: 'series',
            name: toTitleCase(title),
            poster: poster || null,
            background: poster || null,
            description: description || 'Açıklama mevcut değil',
            genres: genres,
            videos: videos
        };

        console.log(`✅ Meta retrieved: ${title} with ${videos.length} episodes`);
        return { meta };
    }

    // Stream
    if (purpose === 'stream') {
        const streams = [];

        try {
            // Sayfa kaynağından ilk fnc_addWatch içeren div elemanının data-episode numarasını al
            const firstEpisodeId = body.match(/<div[^>]*class=["'][^"']*fnc_addWatch[^"']*["'][^>]*data-episode=["'](\d+)["']/)?.[1];

            if (!firstEpisodeId) {
                console.log('⚠️  Episode ID not found');
                return { streams: [] };
            }

            console.log(`📌 Episode ID: ${firstEpisodeId}`);

            const randomId = Math.random().toString(36).substring(2, 10);
            const requestId = `belgesel-iframe-${Date.now()}-${randomId}`;

            return {
                instructions: [{
                    requestId,
                    purpose: 'stream_iframe',
                    url: `https://belgeselx.com/video/data/new4.php?id=${firstEpisodeId}`,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': url
                    },
                    metadata: { pageUrl: fetchResult.metadata?.pageUrl || url } // Referer için
                }]
            };
        } catch (e) {
            console.log('⚠️  Stream error:', e.message);
            return { streams: [] };
        }
    }

    // Stream iframe - Extract videos
    if (purpose === 'stream_iframe') {
        const streams = [];

        try {
            // file:"URL", label: "QUALITY" formatını parse et
            const videoRegex = /file:"([^"]+)",\s*label:\s*"([^"]+)"/g;
            let match;

            while ((match = videoRegex.exec(body)) !== null) {
                const videoUrl = match[1];
                let quality = match[2];
                let sourceName = 'BelgeselX';

                // Kotlin'deki gibi FULL quality kontrolü
                if (quality === 'FULL') {
                    quality = '1080p';
                    sourceName = 'Google';
                }

                // Quality name'den kalite değerini al (Kotlin: getQualityFromName)
                const qualityValue = getQualityFromName(quality);

                streams.push({
                    name: sourceName,
                    title: `${sourceName} - ${quality}`,
                    url: videoUrl,
                    type: 'video', // ExtractorLinkType.VIDEO
                    behaviorHints: {
                        notWebReady: false,
                        bingeGroup: `belgeselx-${quality}`
                    },
                    // Kotlin'deki referer header
                    headers: {
                        'Referer': fetchResult.metadata?.pageUrl || url
                    }
                });

                console.log(`   ✅ Added stream: ${sourceName} - ${quality} (${qualityValue}p)`);
            }

            console.log(`✅ Extracted ${streams.length} stream(s)`);
        } catch (e) {
            console.log('⚠️  Stream iframe error:', e.message);
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

