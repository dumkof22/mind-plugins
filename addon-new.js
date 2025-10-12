const cheerio = require('cheerio');
const crypto = require('crypto');

// Manifest tanımı
const manifest = {
    id: 'community.fullhdfilmizlesene',
    version: '3.0.0',
    name: 'FullHDFilmizlesene',
    description: 'Türkçe film izleme platformu - FullHDFilmizlesene.tv için Stremio eklentisi (Instruction Mode)',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie'],
    catalogs: [
        {
            type: 'movie',
            id: 'fhd_search',
            name: 'Arama',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'movie',
            id: 'fhd_popular',
            name: 'En Çok İzlenen Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'fhd_imdb',
            name: 'IMDB Puanı Yüksek',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'fhd_action',
            name: 'Aksiyon Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'fhd_comedy',
            name: 'Komedi Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'fhd_horror',
            name: 'Korku Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'fhd_turkish',
            name: 'Yerli Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        }
    ],
    idPrefixes: ['fhd']
};

const BASE_URL = 'https://www.fullhdfilmizlesene.tv';

const CATALOG_URLS = {
    'fhd_popular': `${BASE_URL}/en-cok-izlenen-filmler-izle-hd/`,
    'fhd_imdb': `${BASE_URL}/filmizle/imdb-puani-yuksek-filmler-izle-1/`,
    'fhd_action': `${BASE_URL}/filmizle/aksiyon-filmleri-hdf-izle/`,
    'fhd_comedy': `${BASE_URL}/filmizle/komedi-filmleri-fhd-izle/`,
    'fhd_horror': `${BASE_URL}/filmizle/korku-filmleri-izle-3/`,
    'fhd_turkish': `${BASE_URL}/filmizle/yerli-filmler-hd-izle/`
};

// Yardımcı fonksiyonlar
function atob(str) {
    return Buffer.from(str, 'base64').toString('utf-8');
}

function rot13(str) {
    return str.replace(/[a-zA-Z]/g, (char) => {
        const start = char <= 'Z' ? 65 : 97;
        return String.fromCharCode(((char.charCodeAt(0) - start + 13) % 26) + start);
    });
}

function rtt(s) {
    return rot13(s);
}

function decodeLink(encoded) {
    try {
        if (!encoded || typeof encoded !== 'string') {
            console.log('⚠️  decodeLink: Invalid input:', encoded);
            return null;
        }

        const rotated = rtt(encoded);
        const decoded = atob(rotated);
        return decoded;
    } catch (e) {
        console.log('⚠️  decodeLink error:', e.message);
        return null;
    }
}

function decodeRapidVid(encodedString) {
    const reversedBase64Input = encodedString.split('').reverse().join('');
    const tString = atob(reversedBase64Input);
    let oBuilder = '';
    const key = 'K9L';

    for (let index = 0; index < tString.length; index++) {
        const keyChar = key[index % key.length];
        const offset = (keyChar.charCodeAt(0) % 5) + 1;
        const originalCharCode = tString.charCodeAt(index);
        const transformedCharCode = originalCharCode - offset;
        oBuilder += String.fromCharCode(transformedCharCode);
    }

    return atob(oBuilder);
}

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [FullHD Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 20) + 1;
    const searchQuery = args.extra?.search;

    // Unique request ID (timestamp + random)
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalog
    if (catalogId === 'fhd_search') {
        if (!searchQuery) {
            return { instructions: [] };
        }

        const requestId = `fhd-catalog-search-${Date.now()}-${randomId}`;
        return {
            instructions: [{
                requestId,
                purpose: 'catalog',
                url: `${BASE_URL}/arama/${encodeURIComponent(searchQuery)}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }]
        };
    }

    // Normal catalog
    const url = CATALOG_URLS[catalogId];
    if (!url) {
        return { instructions: [] };
    }

    const requestId = `fhd-catalog-${catalogId}-${page}-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: `${url}${page}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }]
    };
}

async function handleMeta(args) {
    const urlBase64 = args.id.replace('fhd:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `fhd-meta-${Date.now()}-${randomId}`;
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
    const urlBase64 = args.id.replace('fhd:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `fhd-stream-${Date.now()}-${randomId}`;
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

    console.log(`\n⚙️ [FullHD Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    const $ = cheerio.load(body);

    if (purpose === 'catalog') {
        const metas = [];

        $('li.film').each((i, elem) => {
            const title = $(elem).find('span.film-title').text().trim();
            const href = $(elem).find('a').attr('href');
            const poster = $(elem).find('img').attr('data-src') || $(elem).find('img').attr('src');

            if (title && href) {
                const id = 'fhd:' + Buffer.from(href).toString('base64').replace(/=/g, '');
                metas.push({
                    id: id,
                    type: 'movie',
                    name: title,
                    poster: poster || null
                });
            }
        });

        console.log(`✅ Found ${metas.length} items in catalog`);
        return { metas };
    }

    if (purpose === 'meta') {
        const title = $('div.izle-titles').text().trim();
        const poster = $('div img').attr('data-src');
        const description = $('div.ozet-ic > p').text().trim();
        const yearText = $('div.dd a.category').text();
        const year = yearText ? yearText.split(' ')[0] : null;
        const imdbRating = $('div.puanx-puan').text().split(' ').pop();

        const genres = [];
        $('a[rel="category tag"]').each((i, elem) => {
            genres.push($(elem).text());
        });

        const cast = [];
        $('div.film-info ul li:nth-child(2) a > span').each((i, elem) => {
            cast.push($(elem).text());
        });

        const meta = {
            id: fetchResult.requestId.includes('fhd:') ? fetchResult.requestId : 'fhd:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
            type: 'movie',
            name: title,
            poster: poster || null,
            background: poster || null,
            description: description || 'Açıklama mevcut değil',
            releaseInfo: year || null,
            imdbRating: imdbRating || null,
            genres: genres,
            cast: cast,
            runtime: null
        };

        console.log(`✅ Meta retrieved for: ${title}`);
        return { meta };
    }

    if (purpose === 'stream') {
        const streams = [];

        // İframe linklerini direkt ekle
        $('iframe').each((i, elem) => {
            const src = $(elem).attr('src') || $(elem).attr('data-src');
            if (src && src.startsWith('http')) {
                let streamName = 'FullHDFilmizlesene';
                if (src.includes('rapidvid.net')) {
                    streamName = 'RapidVid';
                } else if (src.includes('vidmoxy.com')) {
                    streamName = 'VidMoxy';
                } else if (src.includes('trstx.org')) {
                    streamName = 'TRsTX';
                }

                streams.push({
                    name: streamName,
                    title: `${streamName} Server (iframe)`,
                    url: src,
                    behaviorHints: {
                        notWebReady: true
                    }
                });
            }
        });

        // SCX verilerini çıkar
        const scriptContent = $('script').toArray()
            .map(el => $(el).html())
            .find(script => script && script.includes('scx = '));

        if (scriptContent) {
            const scxMatch = scriptContent.match(/scx = ({.*?});/s);
            if (scxMatch) {
                const scxData = JSON.parse(scxMatch[1]);
                const keys = ['atom', 'advid', 'advidprox', 'proton', 'fast', 'fastly', 'tr', 'en'];

                // SCX linklerini işle - ama fetch olmadan sadece decode
                for (const key of keys) {
                    if (scxData[key]?.sx?.t) {
                        const t = scxData[key].sx.t;

                        if (Array.isArray(t)) {
                            for (let idx = 0; idx < t.length; idx++) {
                                const link = t[idx];
                                const decoded = decodeLink(link);

                                if (decoded && decoded.startsWith('http')) {
                                    // Sadece iframe olarak ekle (extract etmek için ayrı fetch gerekir)
                                    streams.push({
                                        name: `${key.toUpperCase()} - ${idx + 1}`,
                                        title: `${key.toUpperCase()} Server`,
                                        url: decoded,
                                        behaviorHints: { notWebReady: true }
                                    });
                                }
                            }
                        } else if (typeof t === 'object') {
                            for (const [subKey, link] of Object.entries(t)) {
                                if (typeof link === 'string') {
                                    const decoded = decodeLink(link);

                                    if (decoded && decoded.startsWith('http')) {
                                        streams.push({
                                            name: `${key.toUpperCase()}-${subKey}`,
                                            title: `${key.toUpperCase()} Server`,
                                            url: decoded,
                                            behaviorHints: { notWebReady: true }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        console.log(`✅ Found ${streams.length} stream(s)`);
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
