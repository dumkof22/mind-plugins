const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { getWithBypass, postWithBypass } = require('./cloudflare-bypass');

// Manifest tanımı
const manifest = {
    id: 'community.fullhdfilmizlesene',
    version: '1.0.0',
    name: 'FullHDFilmizlesene',
    description: 'Türkçe film izleme platformu - FullHDFilmizlesene.tv için Stremio eklentisi',
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

const builder = new addonBuilder(manifest);
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

        // İlk önce rot13 uygula
        const rotated = rtt(encoded);

        // Sonra base64 decode et
        const decoded = atob(rotated);

        return decoded;
    } catch (e) {
        console.log('⚠️  decodeLink error:', e.message, 'Input:', encoded?.substring(0, 30));
        return null;
    }
}

// RapidVid decoder
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

// Catalog handler
builder.defineCatalogHandler(async (args) => {
    try {
        const catalogId = args.id;
        const skip = parseInt(args.extra?.skip || 0);
        const page = Math.floor(skip / 20) + 1;
        const searchQuery = args.extra?.search;

        // Search catalog
        if (catalogId === 'fhd_search' && searchQuery) {
            console.log(`Searching for: ${searchQuery}`);

            // FullHDFilmizlesene.tv arama URL'i
            const searchUrl = `${BASE_URL}/arama/${encodeURIComponent(searchQuery)}`;

            const html = await getWithBypass(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                waitUntil: 'domcontentloaded'
            });

            const $ = cheerio.load(html);
            const metas = [];

            // Arama sonuçlarını çek
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

            console.log(`Found ${metas.length} search results for "${searchQuery}"`);
            return { metas };
        }

        // Normal catalog
        const url = CATALOG_URLS[catalogId];
        if (!url) {
            return { metas: [] };
        }

        const html = await getWithBypass(`${url}${page}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            waitUntil: 'domcontentloaded'
        });

        const $ = cheerio.load(html);
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

        return { metas };
    } catch (error) {
        console.error('Catalog error:', error.message);
        return { metas: [] };
    }
});

// Meta handler
builder.defineMetaHandler(async (args) => {
    try {
        const urlBase64 = args.id.replace('fhd:', '');
        const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

        const html = await getWithBypass(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            waitUntil: 'domcontentloaded'
        });

        const $ = cheerio.load(html);

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

        return { meta };
    } catch (error) {
        console.error('Meta error:', error.message);
        return { meta: null };
    }
});

// Extractor fonksiyonları
async function extractTRsTX(url, referer) {
    try {
        console.log(`🔍 [TRsTX] Fetching: ${url}`);
        const html = await getWithBypass(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': referer
            },
            timeout: 20000,
            waitUntil: 'domcontentloaded'
        });

        const fileMatch = html.match(/file":"([^"]+)"/);
        if (!fileMatch) {
            console.log(`⚠️  [TRsTX] No file pattern found`);
            return [];
        }

        const file = fileMatch[1].replace(/\\/g, '');
        const postLink = `https://trstx.org/${file}`;
        console.log(`🔍 [TRsTX] Posting to: ${postLink}`);

        const postData = await postWithBypass(postLink, '', {
            headers: { 'Referer': referer },
            timeout: 20000
        });

        const streams = [];
        const rawList = JSON.parse(postData);

        if (Array.isArray(rawList) && rawList.length > 1) {
            console.log(`🔍 [TRsTX] Found ${rawList.length - 1} video entries`);
            const vidLinks = new Set();

            for (let i = 1; i < rawList.length; i++) {
                const item = rawList[i];
                if (item.file && item.title) {
                    const fileUrl = `https://trstx.org/playlist/${item.file.substring(1)}.txt`;
                    const videoData = await postWithBypass(fileUrl, '', {
                        headers: { 'Referer': referer },
                        timeout: 15000
                    });

                    if (!vidLinks.has(videoData)) {
                        vidLinks.add(videoData);
                        console.log(`✅ [TRsTX] Extracted: ${item.title} - ${videoData.substring(0, 60)}...`);
                        streams.push({
                            name: `TRsTX - ${item.title}`,
                            title: `TRsTX - ${item.title}`,
                            url: videoData
                        });
                    }
                }
            }
        }

        console.log(`✅ [TRsTX] Total streams extracted: ${streams.length}`);
        return streams;
    } catch (e) {
        console.error('❌ [TRsTX] Extraction error:', e.message);
        return [];
    }
}

async function extractVidMoxy(url, referer) {
    try {
        console.log(`🔍 [VidMoxy] Fetching: ${url}`);
        const html = await getWithBypass(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': referer
            },
            timeout: 20000,
            waitUntil: 'domcontentloaded'
        });

        // Kotlin'deki gibi: önce basit file pattern'ini dene
        let extractedValue = html.match(/file": "(.*)",/);
        let decoded = null;

        if (extractedValue && extractedValue[1]) {
            const hex = extractedValue[1];
            console.log(`🔍 [VidMoxy] Found hex string: ${hex.substring(0, 50)}...`);

            // Hex string'i decode et (\\x formatında)
            const bytes = hex.split('\\x').filter(x => x).map(x => {
                const parsed = parseInt(x, 16);
                return isNaN(parsed) ? 0 : parsed;
            });
            decoded = Buffer.from(bytes).toString('utf-8');
            console.log(`✅ [VidMoxy] Decoded from hex: ${decoded?.substring(0, 80)}...`);
        } else {
            // Kotlin'deki alternatif yol: eval(function...) varsa unpacking yap
            console.log(`🔍 [VidMoxy] Trying eval(function) method...`);
            const evaljwSetup = html.match(/\};\s*(eval\(function[\s\S]*?)var played = \d+;/);

            if (evaljwSetup && evaljwSetup[1]) {
                console.log(`⚠️  [VidMoxy] Found packed code, but unpacking not fully supported yet`);
                // Not: getAndUnpack fonksiyonu gerekli, şimdilik basit pattern deneyelim
                const simpleMatch = html.match(/file":"(.*)","label/);
                if (simpleMatch && simpleMatch[1]) {
                    const hexValue = simpleMatch[1].replace(/\\\\x/g, '');
                    const bytes = hexValue.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
                    decoded = Buffer.from(bytes).toString('utf-8');
                    console.log(`✅ [VidMoxy] Decoded from packed: ${decoded?.substring(0, 80)}...`);
                }
            }
        }

        if (decoded && (decoded.startsWith('http') || decoded.startsWith('//'))) {
            const finalUrl = decoded.startsWith('//') ? 'https:' + decoded : decoded;
            console.log(`✅ [VidMoxy] Successfully extracted M3U8 URL: ${finalUrl.substring(0, 80)}...`);
            return [{
                name: 'VidMoxy',
                title: 'VidMoxy - M3U8',
                url: finalUrl
            }];
        }

        console.log(`⚠️  [VidMoxy] No valid URL found`);
        return [];
    } catch (e) {
        console.error('❌ [VidMoxy] Extraction error:', e.message);
        return [];
    }
}

async function extractSobreatsesuyp(url, referer) {
    try {
        console.log(`🔍 [Sobreatsesuyp] Fetching: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': referer
            },
            timeout: 20000
        });

        const fileMatch = response.data.match(/file":"([^"]+)"/);
        if (!fileMatch) {
            console.log(`⚠️  [Sobreatsesuyp] No file pattern found`);
            return [];
        }

        const file = fileMatch[1].replace(/\\/g, '');
        const postLink = `https://sobreatsesuyp.com/${file}`;
        console.log(`🔍 [Sobreatsesuyp] Posting to: ${postLink}`);

        const postResponse = await axios.post(postLink, {}, {
            headers: { 'Referer': referer },
            timeout: 20000
        });

        const streams = [];
        const rawList = JSON.parse(postResponse.data);

        if (Array.isArray(rawList) && rawList.length > 1) {
            console.log(`🔍 [Sobreatsesuyp] Found ${rawList.length - 1} video entries`);

            for (let i = 1; i < rawList.length; i++) {
                const item = rawList[i];
                if (item.file && item.title) {
                    const fileUrl = `https://sobreatsesuyp.com/playlist/${item.file.substring(1)}.txt`;
                    const videoResponse = await axios.post(fileUrl, {}, {
                        headers: { 'Referer': referer },
                        timeout: 15000
                    });

                    console.log(`✅ [Sobreatsesuyp] Extracted: ${item.title} - ${videoResponse.data.substring(0, 60)}...`);
                    streams.push({
                        name: `Sobreatsesuyp - ${item.title}`,
                        title: `Sobreatsesuyp - ${item.title}`,
                        url: videoResponse.data
                    });
                }
            }
        }

        console.log(`✅ [Sobreatsesuyp] Total streams extracted: ${streams.length}`);
        return streams;
    } catch (e) {
        console.error('❌ [Sobreatsesuyp] Extraction error:', e.message);
        return [];
    }
}

async function extractTurboImgz(url, key, referer) {
    try {
        console.log(`🔍 [TurboImgz] Fetching: ${url} (key: ${key})`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': referer
            },
            timeout: 20000
        });

        // Kotlin'deki gibi: file: "..." pattern'ini ara
        const videoMatch = response.data.match(/file: "(.*)",/);
        if (!videoMatch) {
            console.log(`⚠️  [TurboImgz] No file pattern found`);
            return [];
        }

        const videoUrl = videoMatch[1];
        console.log(`✅ [TurboImgz] Successfully extracted M3U8: ${videoUrl.substring(0, 80)}...`);

        return [{
            name: `TurboImgz - ${key.toUpperCase()}`,
            title: `TurboImgz - ${key.toUpperCase()}`,
            url: videoUrl
        }];
    } catch (e) {
        console.error('❌ [TurboImgz] Extraction error:', e.message);
        return [];
    }
}

async function extractTurkeyPlayer(url, referer) {
    try {
        console.log(`🔍 [TurkeyPlayer] Fetching: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': referer
            },
            timeout: 20000
        });

        // Kotlin'deki gibi: var video = {...} JSON'unu bul
        const videoJsonMatch = response.data.match(/var\s+video\s*=\s*(\{.*?\});/s);
        if (!videoJsonMatch) {
            console.log(`⚠️  [TurkeyPlayer] No video JSON found`);
            return [];
        }

        const videoData = JSON.parse(videoJsonMatch[1]);
        const masterUrl = `https://watch.turkeyplayer.com/m3u8/8/${videoData.md5}/master.txt?s=1&id=${videoData.id}&cache=1`;

        console.log(`✅ [TurkeyPlayer] Successfully built master URL: ${masterUrl}`);
        return [{
            name: 'TurkeyPlayer',
            title: 'TurkeyPlayer - M3U8',
            url: masterUrl
        }];
    } catch (e) {
        console.error('❌ [TurkeyPlayer] Extraction error:', e.message);
        return [];
    }
}

async function extractRapidVid(url, referer, fallbackToIframe = true) {
    try {
        console.log(`🔍 [RapidVid] Fetching: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Connection': 'keep-alive'
            },
            timeout: 20000
        });

        // Kotlin'deki gibi: jwSetup.sources içindeki av('...') fonksiyonunu bul
        const avMatch = response.data.match(/av\('([^']+)'\)/);
        if (!avMatch) {
            console.log(`⚠️  [RapidVid] No av() function found in response`);
            if (fallbackToIframe) {
                console.log(`🔄 [RapidVid] Falling back to iframe URL`);
                return [{
                    name: 'RapidVid',
                    title: 'RapidVid Server (iframe)',
                    url: url,
                    behaviorHints: {
                        notWebReady: true
                    }
                }];
            }
            return [];
        }

        console.log(`🔍 [RapidVid] Found encoded string: ${avMatch[1].substring(0, 30)}...`);
        // Kotlin'deki decodeSecret fonksiyonu ile aynı mantık
        const m3u8Url = decodeRapidVid(avMatch[1]);

        if (!m3u8Url || !m3u8Url.startsWith('http')) {
            console.log(`⚠️  [RapidVid] Decoding failed or invalid URL: ${m3u8Url}`);
            if (fallbackToIframe) {
                console.log(`🔄 [RapidVid] Falling back to iframe URL`);
                return [{
                    name: 'RapidVid',
                    title: 'RapidVid Server (iframe)',
                    url: url,
                    behaviorHints: {
                        notWebReady: true
                    }
                }];
            }
            return [];
        }

        console.log(`✅ [RapidVid] Successfully extracted M3U8 URL: ${m3u8Url.substring(0, 80)}...`);
        return [{
            name: 'RapidVid',
            title: 'RapidVid - M3U8',
            url: m3u8Url
        }];
    } catch (e) {
        console.error('❌ [RapidVid] Extraction error:', e.message);
        if (fallbackToIframe) {
            console.log(`🔄 [RapidVid] Falling back to iframe URL due to error`);
            return [{
                name: 'RapidVid',
                title: 'RapidVid Server (iframe)',
                url: url,
                behaviorHints: {
                    notWebReady: true
                }
            }];
        }
        return [];
    }
}

// Stream handler
builder.defineStreamHandler(async (args) => {
    try {
        console.log(`\n🎬 [FullHDFilmizlesene] Stream request for: ${args.id}`);
        const urlBase64 = args.id.replace('fhd:', '');
        const url = Buffer.from(urlBase64, 'base64').toString('utf-8');
        console.log(`📄 Fetching page: ${url}`);

        const html = await getWithBypass(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000,
            waitUntil: 'domcontentloaded'
        });

        const $ = cheerio.load(html);
        const streams = [];

        // İlk olarak iframe'lerdeki direkt linkleri kontrol et
        const iframeCount = $('iframe').length;
        console.log(`🔍 [FullHDFilmizlesene] Checking ${iframeCount} iframes...`);

        // iframe'lerdeki linkleri direkt ekle
        $('iframe').each((i, elem) => {
            const src = $(elem).attr('src') || $(elem).attr('data-src');
            if (src && src.startsWith('http')) {
                console.log(`✅ Found iframe: ${src}`);

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
        console.log(`🔍 [FullHDFilmizlesene] Checking for SCX data...`);
        const scriptContent = $('script').toArray()
            .map(el => $(el).html())
            .find(script => script && script.includes('scx = '));

        if (!scriptContent) {
            console.log(`ℹ️  No SCX data found, returning ${streams.length} streams from iframes`);
            return { streams };
        }

        const scxMatch = scriptContent.match(/scx = ({.*?});/s);
        if (!scxMatch) {
            console.log(`ℹ️  SCX found but couldn't parse, returning ${streams.length} streams from iframes`);
            return { streams };
        }

        console.log(`✅ SCX data found, parsing...`);
        const scxData = JSON.parse(scxMatch[1]);
        const keys = ['atom', 'advid', 'advidprox', 'proton', 'fast', 'fastly', 'tr', 'en'];
        console.log(`🔍 Checking SCX keys: ${Object.keys(scxData).join(', ')}`);

        // SCX linklerini işle ve extractorlara gönder (Kotlin gibi)
        for (const key of keys) {
            if (scxData[key]?.sx?.t) {
                const t = scxData[key].sx.t;
                console.log(`📝 [${key}] Found sx.t data, type: ${Array.isArray(t) ? 'array' : 'object'}`);

                if (Array.isArray(t)) {
                    console.log(`📝 [${key}] Processing ${t.length} links from array`);
                    for (let idx = 0; idx < t.length; idx++) {
                        const link = t[idx];
                        try {
                            console.log(`📝 [${key}][${idx}] Encoded: ${link.substring(0, 30)}...`);
                            const decoded = decodeLink(link);
                            console.log(`📝 [${key}][${idx}] Decoded: ${decoded ? decoded.substring(0, 60) : 'NULL'}...`);

                            if (!decoded || !decoded.startsWith('http')) {
                                console.log(`⚠️  [${key}][${idx}] Skipping invalid decoded link: ${decoded}`);
                                continue;
                            }

                            console.log(`✅ [${key}][${idx}] Valid URL found: ${decoded.substring(0, 60)}...`);
                            console.log(`🔧 [${key}][${idx}] Calling extractor for: ${decoded.substring(0, 60)}...`);

                            // Kotlin gibi: decode edilmiş URL'i ilgili extractor'a gönder
                            let extractedStreams = [];
                            if (decoded.includes('rapidvid.net')) {
                                extractedStreams = await extractRapidVid(decoded, BASE_URL, false);
                            } else if (decoded.includes('vidmoxy.com')) {
                                extractedStreams = await extractVidMoxy(decoded, BASE_URL);
                            } else if (decoded.includes('trstx.org')) {
                                extractedStreams = await extractTRsTX(decoded, BASE_URL);
                            } else if (decoded.includes('sobreatsesuyp.com')) {
                                extractedStreams = await extractSobreatsesuyp(decoded, BASE_URL);
                            } else if (decoded.includes('turbo.imgz.me')) {
                                extractedStreams = await extractTurboImgz(decoded, key, BASE_URL);
                            } else if (decoded.includes('turkeyplayer.com')) {
                                extractedStreams = await extractTurkeyPlayer(decoded, BASE_URL);
                            }

                            if (extractedStreams.length > 0) {
                                console.log(`✅ [${key}][${idx}] Extracted ${extractedStreams.length} stream(s)`);
                                streams.push(...extractedStreams);
                            } else {
                                console.log(`⚠️  [${key}][${idx}] No streams extracted, adding iframe fallback`);
                                streams.push({
                                    name: `${key.toUpperCase()}`,
                                    title: `${key.toUpperCase()} Server (iframe)`,
                                    url: decoded,
                                    behaviorHints: {
                                        notWebReady: true
                                    }
                                });
                            }
                        } catch (error) {
                            console.error(`❌ Error processing link for ${key}[${idx}]:`, error.message);
                        }
                    }
                } else if (typeof t === 'object') {
                    console.log(`📝 [${key}] Processing ${Object.keys(t).length} links from object`);
                    for (const [subKey, link] of Object.entries(t)) {
                        try {
                            if (typeof link === 'string') {
                                console.log(`📝 [${key}.${subKey}] Encoded: ${link.substring(0, 30)}...`);
                                const decoded = decodeLink(link);
                                console.log(`📝 [${key}.${subKey}] Decoded: ${decoded ? decoded.substring(0, 60) : 'NULL'}...`);

                                if (!decoded || !decoded.startsWith('http')) {
                                    console.log(`⚠️  [${key}.${subKey}] Skipping invalid decoded link: ${decoded}`);
                                    continue;
                                }

                                console.log(`✅ [${key}.${subKey}] Valid URL found: ${decoded.substring(0, 60)}...`);
                                console.log(`🔧 [${key}.${subKey}] Calling extractor for: ${decoded.substring(0, 60)}...`);

                                // Kotlin gibi: decode edilmiş URL'i ilgili extractor'a gönder
                                let extractedStreams = [];
                                if (decoded.includes('rapidvid.net')) {
                                    extractedStreams = await extractRapidVid(decoded, BASE_URL, false);
                                } else if (decoded.includes('vidmoxy.com')) {
                                    extractedStreams = await extractVidMoxy(decoded, BASE_URL);
                                } else if (decoded.includes('trstx.org')) {
                                    extractedStreams = await extractTRsTX(decoded, BASE_URL);
                                } else if (decoded.includes('sobreatsesuyp.com')) {
                                    extractedStreams = await extractSobreatsesuyp(decoded, BASE_URL);
                                } else if (decoded.includes('turbo.imgz.me')) {
                                    extractedStreams = await extractTurboImgz(decoded, `${key}-${subKey}`, BASE_URL);
                                } else if (decoded.includes('turkeyplayer.com')) {
                                    extractedStreams = await extractTurkeyPlayer(decoded, BASE_URL);
                                }

                                if (extractedStreams.length > 0) {
                                    console.log(`✅ [${key}.${subKey}] Extracted ${extractedStreams.length} stream(s)`);
                                    streams.push(...extractedStreams);
                                } else {
                                    console.log(`⚠️  [${key}.${subKey}] No streams extracted, adding iframe fallback`);
                                    streams.push({
                                        name: `${key.toUpperCase()}-${subKey.toUpperCase()}`,
                                        title: `${key.toUpperCase()}-${subKey.toUpperCase()} Server (iframe)`,
                                        url: decoded,
                                        behaviorHints: {
                                            notWebReady: true
                                        }
                                    });
                                }
                            }
                        } catch (error) {
                            console.error(`❌ Error processing link for ${key}.${subKey}:`, error.message);
                        }
                    }
                }
            }
        }

        console.log(`✅ [FullHDFilmizlesene] Found ${streams.length} streams`);
        if (streams.length > 0) {
            streams.forEach((s, i) => {
                console.log(`   ${i + 1}. ${s.name} - ${s.url?.substring(0, 50)}...`);
            });
        }
        return { streams };
    } catch (error) {
        console.error('❌ [FullHDFilmizlesene] Stream error:', error.message);
        return { streams: [] };
    }
});

// Export builder for multi-addon server
module.exports = builder;
