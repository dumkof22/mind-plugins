const cheerio = require('cheerio');

// Base64 decode helper
function base64Decode(str) {
    return Buffer.from(str, 'base64').toString('utf-8');
}

// dcHello decoder - özel base64 decode
function dcHello(base64Input) {
    try {
        const decodedOnce = base64Decode(base64Input);
        const reversedString = decodedOnce.split('').reverse().join('');
        const decodedTwice = base64Decode(reversedString);

        let hdchLink = decodedTwice;
        if (decodedTwice.includes('+')) {
            hdchLink = decodedTwice.substring(decodedTwice.lastIndexOf('+') + 1);
        } else if (decodedTwice.includes(' ')) {
            hdchLink = decodedTwice.substring(decodedTwice.lastIndexOf(' ') + 1);
        } else if (decodedTwice.includes('|')) {
            hdchLink = decodedTwice.substring(decodedTwice.lastIndexOf('|') + 1);
        }

        return hdchLink;
    } catch (e) {
        console.log('⚠️  dcHello error:', e.message);
        return null;
    }
}

// getAndUnpack - Packed JS decoder (Dean Edwards packer)
// Based on: http://dean.edwards.name/packer/
function getAndUnpack(packedJS) {
    try {
        // Look for the eval pattern
        const evalPattern = /eval\(function\(p,a,c,k,e,(?:r|d)\)/;
        if (!evalPattern.test(packedJS)) {
            console.log('⚠️  Not a packed script');
            return packedJS;
        }

        // Extract the complete packed string more robustly
        // Format: eval(function(p,a,c,k,e,r){...}('payload',62,XXX,'keywords'.split('|'),0,{}))
        const fullMatch = packedJS.match(/}\('(.*)',(\d+),(\d+),'(.*)'\./);

        if (!fullMatch) {
            console.log('⚠️  Could not extract packed parameters');
            // Try alternative format
            const altMatch = packedJS.match(/}\((.*)\)\)/);
            if (altMatch) {
                console.log('Alt format args (first 300):', altMatch[1].substring(0, 300));
            }
            return packedJS;
        }

        let p = fullMatch[1];  // payload
        const a = parseInt(fullMatch[2]);  // radix (usually 62)
        const c = parseInt(fullMatch[3]);  // count
        const k = fullMatch[4].split('|');  // keywords

        console.log(`📦 Unpacking: payload=${p.length}c, radix=${a}, count=${c}, keywords=${k.length}`);

        // Verify we got the right data
        if (k.length < c) {
            console.log(`⚠️  Warning: keyword count (${k.length}) < expected count (${c})`);
        }

        // Unescape payload
        p = p.replace(/\\'/g, "'");

        // Base62 encoder for radix > 36
        function toBase(num, radix) {
            const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (radix <= 36) {
                return num.toString(radix);
            }
            let result = '';
            while (num > 0) {
                result = chars[num % radix] + result;
                num = Math.floor(num / radix);
            }
            return result || '0';
        }

        // Unpack function
        function unpack() {
            let result = p;
            for (let i = c - 1; i >= 0; i--) {
                if (k[i]) {
                    // Convert index to base-radix string
                    const placeholder = toBase(i, a);
                    // Replace with word boundaries
                    const regex = new RegExp('\\b' + placeholder + '\\b', 'g');
                    result = result.replace(regex, k[i]);
                }
            }
            return result;
        }

        const result = unpack();
        console.log(`🔓 Unpacked: ${result.length} chars`);

        if (result.length < 200) {
            console.log(`📄 Full unpacked content:\n${result}`);
        }

        return result;

    } catch (e) {
        console.log('⚠️  Unpack error:', e.message);
        console.log('Stack:', e.stack);
        return packedJS;
    }
}

// Manifest tanımı
const manifest = {
    id: 'community.hdfilmcehennemi',
    version: '1.0.0',
    name: 'HDFilmCehennemi',
    description: 'Türkçe film ve dizi izleme platformu - HDFilmCehennemi için Stremio eklentisi',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'hdfc_search',
            name: 'Arama',
            extra: [
                { name: 'search', isRequired: true }
            ]
        },
        {
            type: 'movie',
            id: 'hdfc_yeni_filmler',
            name: 'Yeni Eklenen Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'hdfc_nette_ilk',
            name: 'Nette İlk Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'hdfc_yeni_diziler',
            name: 'Yeni Eklenen Diziler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'hdfc_tavsiye',
            name: 'Tavsiye Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'hdfc_imdb7',
            name: 'IMDB 7+ Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'hdfc_aksiyon',
            name: 'Aksiyon Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'hdfc_komedi',
            name: 'Komedi Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'hdfc_korku',
            name: 'Korku Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        }
    ],
    idPrefixes: ['hdfc']
};

const BASE_URL = 'https://www.hdfilmcehennemi.la';

const CATALOG_URLS = {
    'hdfc_yeni_filmler': `${BASE_URL}/load/page/sayfano/home/`,
    'hdfc_nette_ilk': `${BASE_URL}/load/page/sayfano/categories/nette-ilk-filmler/`,
    'hdfc_yeni_diziler': `${BASE_URL}/load/page/sayfano/home-series/`,
    'hdfc_tavsiye': `${BASE_URL}/load/page/sayfano/categories/tavsiye-filmler-izle2/`,
    'hdfc_imdb7': `${BASE_URL}/load/page/sayfano/imdb7/`,
    'hdfc_aksiyon': `${BASE_URL}/load/page/sayfano/genres/aksiyon-filmleri-izleyin-5/`,
    'hdfc_komedi': `${BASE_URL}/load/page/sayfano/genres/komedi-filmlerini-izleyin-1/`,
    'hdfc_korku': `${BASE_URL}/load/page/sayfano/genres/korku-filmlerini-izle-4/`
};

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [HDFilmCehennemi Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 16) + 1;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalog
    if (catalogId === 'hdfc_search') {
        if (!searchQuery) {
            return { instructions: [] };
        }

        const requestId = `hdfc-search-${Date.now()}-${randomId}`;
        return {
            instructions: [{
                requestId,
                purpose: 'catalog_search',
                url: `${BASE_URL}/search?q=${encodeURIComponent(searchQuery)}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
                    'X-Requested-With': 'fetch'
                }
            }]
        };
    }

    // Normal catalog
    const url = CATALOG_URLS[catalogId];
    if (!url) {
        return { instructions: [] };
    }

    const requestId = `hdfc-catalog-${catalogId}-${page}-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: url.replace('sayfano', page.toString()),
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
                'Accept': '*/*',
                'X-Requested-With': 'fetch'
            }
        }]
    };
}

async function handleMeta(args) {
    const url = Buffer.from(args.id.replace('hdfc:', ''), 'base64').toString('utf-8');

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `hdfc-meta-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0'
            }
        }]
    };
}

async function handleStream(args) {
    const parts = args.id.replace('hdfc:', '').split('_');
    const urlBase64 = parts[0];
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `hdfc-stream-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0'
            }
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, url } = fetchResult;

    console.log(`\n⚙️ [HDFilmCehennemi Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    // Catalog
    if (purpose === 'catalog') {
        try {
            const data = JSON.parse(body);
            const $ = cheerio.load(data.html);

            const metas = [];

            $('a').each((i, elem) => {
                const title = $(elem).attr('title');
                const href = $(elem).attr('href');
                const poster = $(elem).find('img').attr('data-src');

                if (title && href) {
                    const id = 'hdfc:' + Buffer.from(href).toString('base64').replace(/=/g, '');
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
        } catch (e) {
            console.log('⚠️  Catalog parse error:', e.message);
            return { metas: [] };
        }
    }

    // Catalog Search
    if (purpose === 'catalog_search') {
        try {
            const data = JSON.parse(body);
            const metas = [];

            (data.results || []).forEach(resultHtml => {
                const $ = cheerio.load(resultHtml);

                const title = $('h4.title').text().trim();
                const href = $('a').attr('href');
                const poster = $('img').attr('src') || $('img').attr('data-src');

                if (title && href) {
                    const id = 'hdfc:' + Buffer.from(href).toString('base64').replace(/=/g, '');
                    metas.push({
                        id: id,
                        type: 'movie',
                        name: title,
                        poster: poster ? poster.replace('/thumb/', '/list/') : null
                    });
                }
            });

            console.log(`✅ Found ${metas.length} search results`);
            return { metas };
        } catch (e) {
            console.log('⚠️  Search parse error:', e.message);
            return { metas: [] };
        }
    }

    // Meta
    if (purpose === 'meta') {
        const $ = cheerio.load(body);

        const title = $('h1.section-title').text().replace(' izle', '').trim();
        const poster = $('aside.post-info-poster img.lazyload').last().attr('data-src');
        const description = $('article.post-info-content > p').text().trim();
        const year = $('div.post-info-year-country a').text().trim();
        const rating = $('div.post-info-imdb-rating span').text().split('(')[0].trim();

        const genres = [];
        $('div.post-info-genres a').each((i, elem) => {
            genres.push($(elem).text().trim());
        });

        const cast = [];
        $('div.post-info-cast a').each((i, elem) => {
            const actorName = $(elem).find('strong').text();
            cast.push(actorName);
        });

        const trailer = $('div.post-info-trailer button').attr('data-modal');
        const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.replace('trailer/', '')}` : null;

        // Meta ID'yi oluştur
        const metaId = 'hdfc:' + Buffer.from(url).toString('base64').replace(/=/g, '');

        // Recommendations
        const recommendations = [];
        $('div.section-slider-container div.slider-slide').each((i, elem) => {
            const recName = $(elem).find('a').attr('title');
            const recHref = $(elem).find('a').attr('href');
            const recPoster = $(elem).find('img').attr('data-src') || $(elem).find('img').attr('src');

            if (recName && recHref) {
                const recId = 'hdfc:' + Buffer.from(recHref).toString('base64').replace(/=/g, '');
                recommendations.push({
                    id: recId,
                    type: 'movie',
                    name: recName,
                    poster: recPoster || null
                });
            }
        });

        // Dizi mi film mi kontrol et
        const hasSeasonsTab = $('div.seasons').length > 0;

        if (hasSeasonsTab) {
            // Dizi
            const videos = [];

            $('div.seasons-tab-content a').each((i, elem) => {
                const epName = $(elem).find('h4').text().trim();
                const epHref = $(elem).attr('href');

                const epEpisode = epName.match(/(\d+)\.\s*?Bölüm/)?.[1];
                const epSeason = epName.match(/(\d+)\.\s*?Sezon/)?.[1] || 1;

                if (epName && epHref) {
                    const fullUrl = epHref.startsWith('http') ? epHref : `${BASE_URL}${epHref}`;
                    const episodeId = Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                    videos.push({
                        id: `hdfc:${episodeId}`,
                        title: epName,
                        season: parseInt(epSeason),
                        episode: epEpisode ? parseInt(epEpisode) : null
                    });
                }
            });

            const meta = {
                id: metaId,
                type: 'series',
                name: title,
                poster: poster || null,
                background: poster || null,
                description: description || 'Açıklama mevcut değil',
                releaseInfo: year || null,
                imdbRating: rating || null,
                genres: genres,
                cast: cast,
                trailer: trailerUrl,
                recommendations: recommendations.slice(0, 20),
                videos: videos
            };

            console.log(`✅ Meta retrieved (Series): ${title} with ${videos.length} episodes`);
            return { meta };
        } else {
            // Film
            const meta = {
                id: metaId,
                type: 'movie',
                name: title,
                poster: poster || null,
                background: poster || null,
                description: description || 'Açıklama mevcut değil',
                releaseInfo: year || null,
                imdbRating: rating || null,
                genres: genres,
                cast: cast,
                trailer: trailerUrl,
                recommendations: recommendations.slice(0, 20)
            };

            console.log(`✅ Meta retrieved (Movie): ${title}`);
            return { meta };
        }
    }

    // Stream - Get alternative links
    if (purpose === 'stream') {
        const $ = cheerio.load(body);
        const instructions = [];

        $('div.alternative-links').each((i, elem) => {
            const langCode = $(elem).attr('data-lang').toUpperCase();

            $(elem).find('button.alternative-link').each((j, button) => {
                const sourceName = $(button).text().replace('(HDrip Xbet)', '').trim();
                const videoID = $(button).attr('data-video');

                if (videoID) {
                    const randomId = Math.random().toString(36).substring(2, 10);
                    const requestId = `hdfc-video-${Date.now()}-${randomId}`;

                    instructions.push({
                        requestId,
                        purpose: 'stream_video',
                        url: `${BASE_URL}/video/${videoID}/`,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'fetch',
                            'Referer': url
                        },
                        metadata: { sourceName: `${sourceName} ${langCode}`, videoID, pageUrl: url }
                    });
                }
            });
        });

        console.log(`✅ Found ${instructions.length} video source(s)`);

        if (instructions.length > 0) {
            return { instructions };
        }

        return { streams: [] };
    }

    // Stream Video - Extract iframe
    if (purpose === 'stream_video') {
        try {
            let iframe = body.match(/data-src=\\"([^"]+)/)?.[1];

            if (iframe) {
                iframe = iframe.replace(/\\/g, '');
                console.log(`🔗 Original iframe: ${iframe}`);

                // rapidrame olup olmadığını kontrol et
                if (iframe.includes('rapidrame')) {
                    const rapidrameId = iframe.split('?rapidrame_id=')[1];
                    iframe = `${BASE_URL}/rplayer/${rapidrameId}`;
                    console.log(`🔄 Converted to rplayer: ${iframe}`);
                } else if (iframe.includes('mobi')) {
                    const $ = cheerio.load(body);
                    iframe = $('iframe').attr('data-src');
                }

                if (iframe) {
                    const randomId = Math.random().toString(36).substring(2, 10);
                    const requestId = `hdfc-extract-${Date.now()}-${randomId}`;

                    return {
                        instructions: [{
                            requestId,
                            purpose: 'stream_extract',
                            url: iframe,
                            method: 'GET',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
                                'Referer': `${BASE_URL}/`
                            },
                            metadata: {
                                sourceName: fetchResult.metadata.sourceName,
                                originalIframe: iframe
                            }
                        }]
                    };
                }
            }

            console.log('⚠️  No iframe found');
            return { streams: [] };
        } catch (e) {
            console.log('⚠️  Stream video error:', e.message);
            return { streams: [] };
        }
    }

    // Stream Extract - Decode packed JS and extract M3U8
    if (purpose === 'stream_extract') {
        const streams = [];
        const streamName = fetchResult.metadata?.sourceName || 'HDFilmCehennemi';
        const subtitles = [];
        const audioTracks = [];

        try {
            // ÖNCE: Body'den direkt tracks bilgisini al (unpacked'den önce)
            const tracksMatch = body.match(/tracks\s*:\s*(\[[\s\S]*?\])/);
            if (tracksMatch) {
                try {
                    console.log(`🎯 Found tracks in body: ${tracksMatch[1].substring(0, 200)}...`);

                    // JSON parse et
                    const tracksData = JSON.parse(tracksMatch[1]);

                    // Subtitles/Captions
                    tracksData.filter(t => t.kind === 'captions' || t.kind === 'subtitles').forEach(track => {
                        if (track.file) {
                            const subUrl = track.file.startsWith('http') ? track.file : `${BASE_URL}${track.file}`;
                            subtitles.push({
                                id: (track.language || track.label || 'tr').toLowerCase().replace(/\s+/g, '_'),
                                url: subUrl,
                                lang: track.label || track.language || 'Türkçe'
                            });
                        }
                    });

                    // Audio tracks
                    tracksData.filter(t => t.kind === 'audio' || t.kind === 'audiotrack').forEach(track => {
                        if (track.file) {
                            const audioUrl = track.file.startsWith('http') ? track.file : `${BASE_URL}${track.file}`;
                            audioTracks.push({
                                id: (track.language || track.label || 'default').toLowerCase().replace(/\s+/g, '_'),
                                url: audioUrl,
                                lang: track.label || track.language || 'Orijinal'
                            });
                        }
                    });

                    if (subtitles.length > 0) {
                        console.log(`✅ Found ${subtitles.length} subtitle(s) from tracks`);
                    }
                    if (audioTracks.length > 0) {
                        console.log(`✅ Found ${audioTracks.length} audio track(s) from tracks`);
                    }
                } catch (e) {
                    console.log('⚠️  Tracks parse error:', e.message);
                }
            }

            // UNPACKED script'ten de tracks ara (fallback)
            if (subtitles.length === 0) {
                const unpackedTracksMatch = body.match(/tracks:\s*(\[[\s\S]*?\])\s*[,}]/);
                if (unpackedTracksMatch) {
                    try {
                        const unpackedTracks = JSON.parse(unpackedTracksMatch[1]);
                        unpackedTracks.filter(t => t.kind === 'captions' || t.kind === 'subtitles').forEach(track => {
                            if (track.file) {
                                const subUrl = track.file.startsWith('http') ? track.file : `${BASE_URL}${track.file}`;
                                subtitles.push({
                                    id: (track.language || track.label || 'tr').toLowerCase().replace(/\s+/g, '_'),
                                    url: subUrl,
                                    lang: track.label || track.language || 'Türkçe'
                                });
                            }
                        });
                        console.log(`✅ Found ${subtitles.length} subtitle(s) from unpacked tracks`);
                    } catch (e) {
                        console.log('⚠️  Unpacked tracks parse error:', e.message);
                    }
                }
            }

            // Script içindeki sources bölümünü bul
            const scriptMatch = body.match(/<script[^>]*>(.*?sources:.*?)<\/script>/s);

            if (scriptMatch) {
                const script = scriptMatch[1];
                console.log(`📝 Script found, length: ${script.length}`);

                // Unpack
                const unpacked = getAndUnpack(script);
                console.log(`📦 Unpacked, length: ${unpacked.length}`);

                // Debug: unpacked script'i logla
                if (unpacked.length < 2000) {
                    console.log(`📊 Full unpacked script:\n${unpacked}`);
                } else {
                    console.log(`🔍 Unpacked preview (first 1000 chars):\n${unpacked.substring(0, 1000)}`);
                }

                // Yeni format: var s_xxxx=dc_yyyy([...]) tüm değişkenleri bul ve decode et
                let finalUrl = null;

                // Tüm s_ değişkenlerini bul: var s_xxxx=dc_yyyy([...])
                const varPattern = /var\s+(s_\w+)\s*=\s*(\w+)\(\[(.*?)\]\)/g;
                const matches = [...unpacked.matchAll(varPattern)];

                console.log(`🔍 Found ${matches.length} s_ variable(s)`);

                for (const match of matches) {
                    const varName = match[1];
                    const funcName = match[2];
                    const arrayContent = match[3];

                    console.log(`📌 Processing: ${varName} = ${funcName}([...])`);

                    try {
                        // Array items'ı parse et
                        const arrayItems = arrayContent.match(/"([^"]+)"/g);
                        if (!arrayItems) {
                            console.log(`⚠️  No array items found for ${varName}`);
                            continue;
                        }

                        const cleanArray = arrayItems.map(item => item.replace(/"/g, ''));
                        console.log(`📦 Array has ${cleanArray.length} items`);

                        // dc_xxxx fonksiyonunu bul
                        const funcPattern = new RegExp(`function\\s+${funcName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?return\\s+unmix\\s*\\}`, 'm');
                        const funcMatch = unpacked.match(funcPattern);

                        if (funcMatch) {
                            // Fonksiyonu eval ile çalıştır
                            const funcCode = funcMatch[0];

                            // Güvenli bir scope'ta çalıştır
                            const decodedValue = (function () {
                                eval(funcCode);
                                return eval(`${funcName}(${JSON.stringify(cleanArray)})`);
                            })();

                            console.log(`🎯 Decoded ${varName}: ${decodedValue.substring(0, 100)}...`);

                            // URL olup olmadığını kontrol et
                            if (decodedValue && decodedValue.includes('http')) {
                                console.log(`✅ Found valid URL in ${varName}`);
                                finalUrl = decodedValue;
                                break; // İlk valid URL'i kullan
                            }
                        } else {
                            console.log(`⚠️  Function ${funcName} not found`);
                        }
                    } catch (e) {
                        console.log(`⚠️  Error processing ${varName}: ${e.message}`);
                    }
                }

                if (finalUrl && finalUrl.startsWith('http')) {
                    const streamData = {
                        name: streamName,
                        title: streamName,
                        url: finalUrl,
                        type: 'm3u8',
                        behaviorHints: {
                            notWebReady: false
                        }
                    };

                    // Add subtitles if available
                    if (subtitles.length > 0) {
                        streamData.subtitles = subtitles;
                    }

                    // Add audio tracks if available
                    if (audioTracks.length > 0) {
                        streamData.audioTracks = audioTracks;
                    }

                    streams.push(streamData);

                    console.log(`✅ Stream extracted successfully!`);
                    console.log(`   Name: ${streamName}`);
                    console.log(`   URL: ${finalUrl}`);
                    console.log(`   Subtitles: ${subtitles.length}`);
                    console.log(`   Audio Tracks: ${audioTracks.length}`);
                } else {
                    console.log('⚠️  No valid stream URL found');
                }
            } else {
                console.log('⚠️  No script with sources found in body');
                console.log(`📄 Body preview (first 2000 chars):\n${body.substring(0, 2000)}`);
            }
        } catch (e) {
            console.log('⚠️  Stream extract error:', e.message);
            console.log('Stack:', e.stack);
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

