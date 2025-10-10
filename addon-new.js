const cheerio = require('cheerio');
const crypto = require('crypto');

// Manifest tanımı
const manifest = {
    id: 'community.fullhdfilmizlesene',
    version: '2.0.0',
    name: 'FullHDFilmizlesene',
    description: 'Türkçe film izleme platformu - FullHDFilmizlesene.tv için Stremio eklentisi (Proxy Mode)',
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

// Catalog name to ID mapping (Flutter sends catalog names)
const CATALOG_NAME_TO_ID = {
    'En Çok İzlenen Filmler': 'fhd_popular',
    'IMDB Puanı Yüksek': 'fhd_imdb',
    'Aksiyon Filmleri': 'fhd_action',
    'Komedi Filmleri': 'fhd_comedy',
    'Korku Filmleri': 'fhd_horror',
    'Yerli Filmler': 'fhd_turkish',
    'Arama': 'fhd_search'
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

// ============ CATALOG HANDLER ============
async function handleCatalog(args, proxyFetch) {
    console.log('\n🎯 [Catalog Handler] Starting...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    try {
        let catalogId = args.id;

        // Convert catalog name to ID if needed
        if (CATALOG_NAME_TO_ID[catalogId]) {
            console.log(`🔄 Converting catalog name "${catalogId}" to ID "${CATALOG_NAME_TO_ID[catalogId]}"`);
            catalogId = CATALOG_NAME_TO_ID[catalogId];
        }

        const skip = parseInt(args.extra?.skip || 0);
        const page = Math.floor(skip / 20) + 1;
        const searchQuery = args.extra?.search;

        console.log(`📊 Catalog ID: ${catalogId}, Page: ${page}`);

        // Search catalog
        if (catalogId === 'fhd_search' && searchQuery) {
            console.log(`🔍 Searching for: ${searchQuery}`);
            const searchUrl = `${BASE_URL}/arama/${encodeURIComponent(searchQuery)}`;

            const response = await proxyFetch({
                url: searchUrl,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 20000,
                waitUntil: 'domcontentloaded'
            });

            const $ = cheerio.load(response.body);
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

            console.log(`✅ Found ${metas.length} search results`);
            return { metas };
        }

        // Normal catalog
        const url = CATALOG_URLS[catalogId];
        if (!url) {
            console.log(`⚠️  Unknown catalog ID: ${catalogId}`);
            return { metas: [] };
        }

        const fullUrl = `${url}${page}`;
        console.log(`🌐 Fetching URL: ${fullUrl}`);

        const response = await proxyFetch({
            url: fullUrl,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 20000,
            waitUntil: 'domcontentloaded'
        });

        console.log(`📦 ProxyFetch returned: ${response ? 'SUCCESS' : 'NULL'}`);

        const $ = cheerio.load(response.body);
        const metas = [];

        $('li.film').each((i, elem) => {
            const title = $(elem).find('span.film-title').text();
            const href = $(elem).find('a').attr('href');
            const poster = $(elem).find('img').attr('data-src');

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
    } catch (error) {
        console.error('❌ Catalog error:', error.message);
        return { metas: [] };
    }
}

// ============ META HANDLER ============
async function handleMeta(args, proxyFetch) {
    try {
        const urlBase64 = args.id.replace('fhd:', '');
        const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

        const response = await proxyFetch({
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 20000,
            waitUntil: 'domcontentloaded'
        });

        const $ = cheerio.load(response.body);

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
            id: args.id,
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
    } catch (error) {
        console.error('❌ Meta error:', error.message);
        return { meta: null };
    }
}

// ============ STREAM HANDLER ============
async function handleStream(args, proxyFetch) {
    try {
        console.log(`\n🎬 Stream request for: ${args.id}`);
        const urlBase64 = args.id.replace('fhd:', '');
        const url = Buffer.from(urlBase64, 'base64').toString('utf-8');
        console.log(`📄 Movie URL: ${url}`);

        const response = await proxyFetch({
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000,
            waitUntil: 'domcontentloaded'
        });

        const $ = cheerio.load(response.body);
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

        if (!scriptContent) {
            console.log(`ℹ️  No SCX data found, returning ${streams.length} iframe streams`);
            return { streams };
        }

        const scxMatch = scriptContent.match(/scx = ({.*?});/s);
        if (!scxMatch) {
            console.log(`ℹ️  SCX found but couldn't parse`);
            return { streams };
        }

        const scxData = JSON.parse(scxMatch[1]);
        const keys = ['atom', 'advid', 'advidprox', 'proton', 'fast', 'fastly', 'tr', 'en'];

        // SCX linklerini işle
        for (const key of keys) {
            if (scxData[key]?.sx?.t) {
                const t = scxData[key].sx.t;

                if (Array.isArray(t)) {
                    for (let idx = 0; idx < t.length; idx++) {
                        const link = t[idx];
                        const decoded = decodeLink(link);

                        if (!decoded || !decoded.startsWith('http')) {
                            continue;
                        }

                        // Extract stream from decoded URL
                        const extractedStreams = await extractStream(decoded, key, proxyFetch);
                        streams.push(...extractedStreams);
                    }
                } else if (typeof t === 'object') {
                    for (const [subKey, link] of Object.entries(t)) {
                        if (typeof link === 'string') {
                            const decoded = decodeLink(link);

                            if (!decoded || !decoded.startsWith('http')) {
                                continue;
                            }

                            const extractedStreams = await extractStream(decoded, `${key}-${subKey}`, proxyFetch);
                            streams.push(...extractedStreams);
                        }
                    }
                }
            }
        }

        console.log(`✅ Found ${streams.length} total streams`);
        return { streams };
    } catch (error) {
        console.error('❌ Stream error:', error.message);
        return { streams: [] };
    }
}

// ============ STREAM EXTRACTORS ============
async function extractStream(url, key, proxyFetch) {
    try {
        if (url.includes('rapidvid.net')) {
            return await extractRapidVid(url, proxyFetch);
        } else if (url.includes('vidmoxy.com')) {
            return await extractVidMoxy(url, proxyFetch);
        } else if (url.includes('trstx.org')) {
            return await extractTRsTX(url, proxyFetch);
        } else if (url.includes('turbo.imgz.me')) {
            return await extractTurboImgz(url, key, proxyFetch);
        } else if (url.includes('turkeyplayer.com')) {
            return await extractTurkeyPlayer(url, proxyFetch);
        }

        // Fallback - return as iframe
        return [{
            name: key.toUpperCase(),
            title: `${key.toUpperCase()} Server`,
            url: url,
            behaviorHints: { notWebReady: true }
        }];
    } catch (e) {
        console.error(`❌ Extract error for ${key}:`, e.message);
        return [];
    }
}

async function extractRapidVid(url, proxyFetch) {
    try {
        console.log(`🔍 [RapidVid] Extracting: ${url.substring(0, 60)}...`);

        const response = await proxyFetch({
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL
            },
            timeout: 20000
        });

        const avMatch = response.body.match(/av\('([^']+)'\)/);
        if (!avMatch) {
            console.log(`⚠️  [RapidVid] No av() function found`);
            return [];
        }

        const m3u8Url = decodeRapidVid(avMatch[1]);

        if (!m3u8Url || !m3u8Url.startsWith('http')) {
            console.log(`⚠️  [RapidVid] Invalid decoded URL`);
            return [];
        }

        console.log(`✅ [RapidVid] Extracted M3U8`);
        return [{
            name: 'RapidVid',
            title: 'RapidVid - M3U8',
            url: m3u8Url
        }];
    } catch (e) {
        console.error('❌ [RapidVid] Error:', e.message);
        return [];
    }
}

async function extractVidMoxy(url, proxyFetch) {
    try {
        console.log(`🔍 [VidMoxy] Extracting: ${url.substring(0, 60)}...`);

        const response = await proxyFetch({
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL
            },
            timeout: 20000
        });

        let extractedValue = response.body.match(/file": "(.*)",/);
        let decoded = null;

        if (extractedValue && extractedValue[1]) {
            const hex = extractedValue[1];
            const bytes = hex.split('\\x').filter(x => x).map(x => {
                const parsed = parseInt(x, 16);
                return isNaN(parsed) ? 0 : parsed;
            });
            decoded = Buffer.from(bytes).toString('utf-8');
        }

        if (decoded && (decoded.startsWith('http') || decoded.startsWith('//'))) {
            const finalUrl = decoded.startsWith('//') ? 'https:' + decoded : decoded;
            console.log(`✅ [VidMoxy] Extracted M3U8`);
            return [{
                name: 'VidMoxy',
                title: 'VidMoxy - M3U8',
                url: finalUrl
            }];
        }

        return [];
    } catch (e) {
        console.error('❌ [VidMoxy] Error:', e.message);
        return [];
    }
}

async function extractTRsTX(url, proxyFetch) {
    try {
        console.log(`🔍 [TRsTX] Extracting: ${url.substring(0, 60)}...`);

        const response = await proxyFetch({
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL
            },
            timeout: 20000
        });

        const fileMatch = response.body.match(/file":"([^"]+)"/);
        if (!fileMatch) {
            console.log(`⚠️  [TRsTX] No file pattern found`);
            return [];
        }

        const file = fileMatch[1].replace(/\\/g, '');
        const postLink = `https://trstx.org/${file}`;

        const postData = await proxyFetch({
            url: postLink,
            method: 'POST',
            headers: { 'Referer': BASE_URL },
            timeout: 20000
        });

        const streams = [];
        const rawList = JSON.parse(postData.body);

        if (Array.isArray(rawList) && rawList.length > 1) {
            const vidLinks = new Set();

            for (let i = 1; i < rawList.length; i++) {
                const item = rawList[i];
                if (item.file && item.title) {
                    const fileUrl = `https://trstx.org/playlist/${item.file.substring(1)}.txt`;
                    const videoData = await proxyFetch({
                        url: fileUrl,
                        method: 'POST',
                        headers: { 'Referer': BASE_URL },
                        timeout: 15000
                    });

                    if (!vidLinks.has(videoData.body)) {
                        vidLinks.add(videoData.body);
                        streams.push({
                            name: `TRsTX - ${item.title}`,
                            title: `TRsTX - ${item.title}`,
                            url: videoData.body
                        });
                    }
                }
            }
        }

        console.log(`✅ [TRsTX] Extracted ${streams.length} streams`);
        return streams;
    } catch (e) {
        console.error('❌ [TRsTX] Error:', e.message);
        return [];
    }
}

async function extractTurboImgz(url, key, proxyFetch) {
    try {
        console.log(`🔍 [TurboImgz] Extracting: ${url.substring(0, 60)}...`);

        const response = await proxyFetch({
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL
            },
            timeout: 20000
        });

        const videoMatch = response.body.match(/file: "(.*)",/);
        if (!videoMatch) {
            console.log(`⚠️  [TurboImgz] No file pattern found`);
            return [];
        }

        const videoUrl = videoMatch[1];
        console.log(`✅ [TurboImgz] Extracted M3U8`);

        return [{
            name: `TurboImgz - ${key.toUpperCase()}`,
            title: `TurboImgz - ${key.toUpperCase()}`,
            url: videoUrl
        }];
    } catch (e) {
        console.error('❌ [TurboImgz] Error:', e.message);
        return [];
    }
}

async function extractTurkeyPlayer(url, proxyFetch) {
    try {
        console.log(`🔍 [TurkeyPlayer] Extracting: ${url.substring(0, 60)}...`);

        const response = await proxyFetch({
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL
            },
            timeout: 20000
        });

        const videoJsonMatch = response.body.match(/var\s+video\s*=\s*(\{.*?\});/s);
        if (!videoJsonMatch) {
            console.log(`⚠️  [TurkeyPlayer] No video JSON found`);
            return [];
        }

        const videoData = JSON.parse(videoJsonMatch[1]);
        const masterUrl = `https://watch.turkeyplayer.com/m3u8/8/${videoData.md5}/master.txt?s=1&id=${videoData.id}&cache=1`;

        console.log(`✅ [TurkeyPlayer] Built master URL`);
        return [{
            name: 'TurkeyPlayer',
            title: 'TurkeyPlayer - M3U8',
            url: masterUrl
        }];
    } catch (e) {
        console.error('❌ [TurkeyPlayer] Error:', e.message);
        return [];
    }
}

// Export functions
module.exports = {
    manifest,
    getManifest: () => manifest,
    handleCatalog,
    handleMeta,
    handleStream
};

