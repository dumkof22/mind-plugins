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

function hexDecode(hexString) {
    // VidMoxy için hex decode
    const bytes = hexString.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
    return String.fromCharCode(...bytes);
}

function getAndUnpack(packedJS) {
    // Basit unpacker - p,a,c,k,e,d formatı için
    try {
        const regex = /eval\(function\(p,a,c,k,e,.*?\)\s*\{.*?return p\}.*?\('(.+?)',(\d+),(\d+),'(.+?)'/s;
        const match = regex.exec(packedJS);
        if (!match) return packedJS;

        const [, p, a, c, k] = match;
        const keys = k.split('|');

        let result = p;
        for (let i = keys.length - 1; i >= 0; i--) {
            if (keys[i]) {
                const regex = new RegExp('\\b' + i.toString(36) + '\\b', 'g');
                result = result.replace(regex, keys[i]);
            }
        }
        return result;
    } catch (e) {
        return packedJS;
    }
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
        const instructions = []; // Embed sayfaları için ek fetch'ler

        // İframe linklerini kontrol et ve gerekirse extract için instruction ekle
        $('iframe').each((i, elem) => {
            const src = $(elem).attr('src') || $(elem).attr('data-src');
            if (src && src.startsWith('http')) {
                let streamName = 'FullHDFilmizlesene';
                let needsExtraction = false;

                if (src.includes('rapidvid.net')) {
                    streamName = 'RapidVid';
                    needsExtraction = true;
                } else if (src.includes('vidmoxy.com')) {
                    streamName = 'VidMoxy';
                    needsExtraction = true;
                } else if (src.includes('trstx.org')) {
                    streamName = 'TRsTX';
                    needsExtraction = true;
                } else if (src.includes('sobreatsesuyp.com')) {
                    streamName = 'Sobreatsesuyp';
                    needsExtraction = true;
                } else if (src.includes('turbo.imgz.me')) {
                    streamName = 'TurboImgz';
                    needsExtraction = true;
                } else if (src.includes('turkeyplayer.com')) {
                    streamName = 'TurkeyPlayer';
                    needsExtraction = true;
                }

                if (needsExtraction) {
                    // Extraction için instruction ekle
                    const randomId = Math.random().toString(36).substring(2, 10);
                    const requestId = `fhd-extract-${streamName}-${Date.now()}-${randomId}`;
                    instructions.push({
                        requestId,
                        purpose: `extract_${streamName.toLowerCase()}`,
                        url: src,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': url
                        }
                    });
                } else {
                    // Direkt iframe olarak ekle
                    streams.push({
                        name: streamName,
                        title: `${streamName} Server (iframe)`,
                        url: src,
                        behaviorHints: {
                            notWebReady: true
                        }
                    });
                }
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

                // SCX linklerini işle ve extract edilecekleri belirle
                for (const key of keys) {
                    if (scxData[key]?.sx?.t) {
                        const t = scxData[key].sx.t;

                        if (Array.isArray(t)) {
                            for (let idx = 0; idx < t.length; idx++) {
                                const link = t[idx];
                                const decoded = decodeLink(link);

                                if (decoded && decoded.startsWith('http')) {
                                    // URL'yi kontrol et ve gerekirse extraction için instruction ekle
                                    let streamName = `${key.toUpperCase()} - ${idx + 1}`;
                                    let needsExtraction = false;
                                    let extractType = '';

                                    if (decoded.includes('rapidvid.net')) {
                                        needsExtraction = true;
                                        extractType = 'rapidvid';
                                    } else if (decoded.includes('vidmoxy.com')) {
                                        needsExtraction = true;
                                        extractType = 'vidmoxy';
                                    } else if (decoded.includes('trstx.org')) {
                                        needsExtraction = true;
                                        extractType = 'trstx';
                                    } else if (decoded.includes('sobreatsesuyp.com')) {
                                        needsExtraction = true;
                                        extractType = 'sobreatsesuyp';
                                    } else if (decoded.includes('turbo.imgz.me')) {
                                        needsExtraction = true;
                                        extractType = 'turboimgz';
                                    } else if (decoded.includes('turkeyplayer.com')) {
                                        needsExtraction = true;
                                        extractType = 'turkeyplayer';
                                    }

                                    if (needsExtraction) {
                                        const randomId = Math.random().toString(36).substring(2, 10);
                                        const requestId = `fhd-extract-${extractType}-${Date.now()}-${randomId}`;
                                        instructions.push({
                                            requestId,
                                            purpose: `extract_${extractType}`,
                                            url: decoded,
                                            method: 'GET',
                                            headers: {
                                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                                'Referer': url
                                            },
                                            metadata: { streamName }
                                        });
                                    } else {
                                        streams.push({
                                            name: streamName,
                                            title: `${key.toUpperCase()} Server`,
                                            url: decoded,
                                            behaviorHints: { notWebReady: true }
                                        });
                                    }
                                }
                            }
                        } else if (typeof t === 'object') {
                            for (const [subKey, link] of Object.entries(t)) {
                                if (typeof link === 'string') {
                                    const decoded = decodeLink(link);

                                    if (decoded && decoded.startsWith('http')) {
                                        let streamName = `${key.toUpperCase()}-${subKey}`;
                                        let needsExtraction = false;
                                        let extractType = '';

                                        if (decoded.includes('rapidvid.net')) {
                                            needsExtraction = true;
                                            extractType = 'rapidvid';
                                        } else if (decoded.includes('vidmoxy.com')) {
                                            needsExtraction = true;
                                            extractType = 'vidmoxy';
                                        } else if (decoded.includes('trstx.org')) {
                                            needsExtraction = true;
                                            extractType = 'trstx';
                                        } else if (decoded.includes('sobreatsesuyp.com')) {
                                            needsExtraction = true;
                                            extractType = 'sobreatsesuyp';
                                        } else if (decoded.includes('turbo.imgz.me')) {
                                            needsExtraction = true;
                                            extractType = 'turboimgz';
                                        } else if (decoded.includes('turkeyplayer.com')) {
                                            needsExtraction = true;
                                            extractType = 'turkeyplayer';
                                        }

                                        if (needsExtraction) {
                                            const randomId = Math.random().toString(36).substring(2, 10);
                                            const requestId = `fhd-extract-${extractType}-${Date.now()}-${randomId}`;
                                            instructions.push({
                                                requestId,
                                                purpose: `extract_${extractType}`,
                                                url: decoded,
                                                method: 'GET',
                                                headers: {
                                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                                    'Referer': url
                                                },
                                                metadata: { streamName }
                                            });
                                        } else {
                                            streams.push({
                                                name: streamName,
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
        }

        console.log(`✅ Found ${streams.length} stream(s) and ${instructions.length} extraction(s)`);

        // Eğer extraction instruction'ları varsa, bunları da döndür
        if (instructions.length > 0) {
            return { streams, instructions };
        }

        return { streams };
    }

    // ============ EXTRACTOR HANDLERS ============

    // RapidVid extraction
    if (purpose === 'extract_rapidvid') {
        const streams = [];
        const streamName = fetchResult.metadata?.streamName || 'RapidVid';

        try {
            const scriptMatch = body.match(/jwSetup\.sources\s*=\s*\[.*?av\('([^']+)'\)/s);
            if (scriptMatch) {
                const encodedValue = scriptMatch[1];
                const m3u8Url = decodeRapidVid(encodedValue);

                streams.push({
                    name: streamName,
                    title: `${streamName}`,
                    url: m3u8Url,
                    type: 'm3u8',
                    behaviorHints: {
                        notWebReady: false
                    }
                });
            }
        } catch (e) {
            console.log('⚠️  RapidVid extraction error:', e.message);
        }

        console.log(`✅ RapidVid extracted: ${streams.length} stream(s)`);
        return { streams };
    }

    // VidMoxy extraction
    if (purpose === 'extract_vidmoxy') {
        const streams = [];
        const streamName = fetchResult.metadata?.streamName || 'VidMoxy';

        try {
            // Method 1: Hex encoded file (\\x formatında)
            let fileMatch = body.match(/file:\s*"([^"]+)"/);
            if (fileMatch && fileMatch[1].includes('\\x')) {
                const extractedValue = fileMatch[1];
                const hexParts = extractedValue.split('\\x').filter(x => x.length > 0);
                const bytes = hexParts.map(hex => parseInt(hex, 16));
                const decoded = String.fromCharCode(...bytes);

                if (decoded && decoded.startsWith('http')) {
                    streams.push({
                        name: streamName,
                        title: `${streamName}`,
                        url: decoded,
                        type: 'm3u8',
                        behaviorHints: { notWebReady: false }
                    });
                }
            } else {
                // Method 2: Packed JS
                const evaljwMatch = body.match(/\};\s*(eval\(function[\s\S]*?)var played = \d+;/);
                if (evaljwMatch) {
                    let jwSetup = getAndUnpack(getAndUnpack(evaljwMatch[1]));
                    jwSetup = jwSetup.replace(/\\\\/g, '\\');

                    const fileMatch2 = jwSetup.match(/file:"([^"]+)"/);
                    if (fileMatch2) {
                        const extractedValue = fileMatch2[1];
                        // \\x pattern'ini ayır
                        const hexParts = extractedValue.split('\\x').filter(x => x.length > 0);
                        const bytes = hexParts.map(hex => {
                            // İlk iki karakter hex değeri
                            const hexValue = hex.substring(0, 2);
                            return parseInt(hexValue, 16);
                        });
                        const decoded = String.fromCharCode(...bytes);

                        if (decoded && decoded.startsWith('http')) {
                            streams.push({
                                name: streamName,
                                title: `${streamName}`,
                                url: decoded,
                                type: 'm3u8',
                                behaviorHints: { notWebReady: false }
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.log('⚠️  VidMoxy extraction error:', e.message);
        }

        console.log(`✅ VidMoxy extracted: ${streams.length} stream(s)`);
        return { streams };
    }

    // TurboImgz extraction
    if (purpose === 'extract_turboimgz') {
        const streams = [];
        const streamName = fetchResult.metadata?.streamName || 'TurboImgz';

        try {
            const fileMatch = body.match(/file:\s*"([^"]+)"/);
            if (fileMatch) {
                streams.push({
                    name: streamName,
                    title: `${streamName}`,
                    url: fileMatch[1],
                    type: 'm3u8',
                    behaviorHints: { notWebReady: false }
                });
            }
        } catch (e) {
            console.log('⚠️  TurboImgz extraction error:', e.message);
        }

        console.log(`✅ TurboImgz extracted: ${streams.length} stream(s)`);
        return { streams };
    }

    // TurkeyPlayer extraction
    if (purpose === 'extract_turkeyplayer') {
        const streams = [];
        const streamName = fetchResult.metadata?.streamName || 'TurkeyPlayer';

        try {
            const videoMatch = body.match(/var\s+video\s*=\s*({.*?});/s);
            if (videoMatch) {
                const videoData = JSON.parse(videoMatch[1]);
                const masterUrl = `https://watch.turkeyplayer.com/m3u8/8/${videoData.md5}/master.txt?s=1&id=${videoData.id}&cache=1`;

                streams.push({
                    name: streamName,
                    title: `${streamName}`,
                    url: masterUrl,
                    type: 'm3u8',
                    behaviorHints: { notWebReady: false }
                });
            }
        } catch (e) {
            console.log('⚠️  TurkeyPlayer extraction error:', e.message);
        }

        console.log(`✅ TurkeyPlayer extracted: ${streams.length} stream(s)`);
        return { streams };
    }

    // TRsTX ve Sobreatsesuyp için POST request gerekli - instruction chain gerekir
    if (purpose === 'extract_trstx' || purpose === 'extract_sobreatsesuyp') {
        const instructions = [];
        const streamName = fetchResult.metadata?.streamName || (purpose === 'extract_trstx' ? 'TRsTX' : 'Sobreatsesuyp');
        const mainUrl = purpose === 'extract_trstx' ? 'https://trstx.org' : 'https://sobreatsesuyp.com';

        try {
            const fileMatch = body.match(/file":"([^"]+)"/);
            if (fileMatch) {
                const file = fileMatch[1].replace(/\\/g, '');
                const postLink = `${mainUrl}/${file}`;

                const randomId = Math.random().toString(36).substring(2, 10);
                const requestId = `fhd-post-${purpose}-${Date.now()}-${randomId}`;

                instructions.push({
                    requestId,
                    purpose: `post_${purpose.replace('extract_', '')}`,
                    url: postLink,
                    method: 'POST',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': url
                    },
                    metadata: { streamName, mainUrl }
                });
            }
        } catch (e) {
            console.log(`⚠️  ${streamName} extraction error:`, e.message);
        }

        return { instructions };
    }

    // TRsTX/Sobreatsesuyp POST response handler
    if (purpose === 'post_trstx' || purpose === 'post_sobreatsesuyp') {
        const instructions = [];
        const streamName = fetchResult.metadata?.streamName || (purpose === 'post_trstx' ? 'TRsTX' : 'Sobreatsesuyp');
        const mainUrl = fetchResult.metadata?.mainUrl || (purpose === 'post_trstx' ? 'https://trstx.org' : 'https://sobreatsesuyp.com');

        try {
            const postJson = JSON.parse(body);
            if (Array.isArray(postJson) && postJson.length > 1) {
                for (let i = 1; i < postJson.length; i++) {
                    const item = postJson[i];
                    if (item.file && item.title) {
                        const fileUrl = `${mainUrl}/playlist/${item.file.substring(1)}.txt`;

                        const randomId = Math.random().toString(36).substring(2, 10);
                        const requestId = `fhd-playlist-${purpose}-${Date.now()}-${randomId}`;

                        instructions.push({
                            requestId,
                            purpose: `playlist_${purpose.replace('post_', '')}`,
                            url: fileUrl,
                            method: 'POST',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': url
                            },
                            metadata: { streamName: `${streamName} - ${item.title}` }
                        });
                    }
                }
            }
        } catch (e) {
            console.log(`⚠️  ${streamName} POST parsing error:`, e.message);
        }

        return { instructions };
    }

    // TRsTX/Sobreatsesuyp playlist handler
    if (purpose === 'playlist_trstx' || purpose === 'playlist_sobreatsesuyp') {
        const streams = [];
        const streamName = fetchResult.metadata?.streamName || 'TRsTX/Sobreatsesuyp';

        try {
            const m3u8Url = body.trim();
            if (m3u8Url.startsWith('http')) {
                streams.push({
                    name: streamName,
                    title: streamName,
                    url: m3u8Url,
                    type: 'm3u8',
                    behaviorHints: { notWebReady: false }
                });
            }
        } catch (e) {
            console.log(`⚠️  ${streamName} playlist error:`, e.message);
        }

        console.log(`✅ ${streamName} extracted: ${streams.length} stream(s)`);
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
