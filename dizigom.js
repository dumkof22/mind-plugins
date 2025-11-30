const cheerio = require('cheerio');

// ============ DiziGom Addon ============
// DiziGom sitesi için Stremio eklentisi (Instruction Mode)
// Kotlin kodundan JavaScript'e port edilmiştir
// =======================================

const manifest = {
    id: 'community.dizigom',
    version: '1.0.0',
    name: 'DiziGom',
    description: 'Türkçe dizi ve film izleme platformu - DiziGom için Stremio eklentisi',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'series',
            id: 'dizigom_new_episodes',
            name: 'Yeni Bölümler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'dizigom_movies',
            name: 'Tüm Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizigom_search',
            name: 'Arama',
            extra: [{ name: 'search', isRequired: true }]
        },
        // Genres
        { type: 'series', id: 'dizigom_aksiyon', name: 'Aksiyon' },
        { type: 'series', id: 'dizigom_animasyon', name: 'Animasyon' },
        { type: 'series', id: 'dizigom_belgesel', name: 'Belgesel' },
        { type: 'series', id: 'dizigom_bilim_kurgu', name: 'Bilim Kurgu' },
        { type: 'series', id: 'dizigom_dram', name: 'Dram' },
        { type: 'series', id: 'dizigom_fantastik', name: 'Fantastik' },
        { type: 'series', id: 'dizigom_gerilim', name: 'Gerilim' },
        { type: 'series', id: 'dizigom_gizem', name: 'Gizem' },
        { type: 'series', id: 'dizigom_komedi', name: 'Komedi' },
        { type: 'series', id: 'dizigom_korku', name: 'Korku' },
        { type: 'series', id: 'dizigom_macera', name: 'Macera' },
        { type: 'series', id: 'dizigom_romantik', name: 'Romantik' },
        { type: 'series', id: 'dizigom_savas', name: 'Savaş' },
        { type: 'series', id: 'dizigom_suc', name: 'Suç' },
        { type: 'series', id: 'dizigom_tarih', name: 'Tarih' }
    ],
    idPrefixes: ['dizigom']
};

const BASE_URL = 'https://dizigom104.com';

// Headers helper
function getHeaders(referer = BASE_URL) {
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Referer': referer
    };
}

// URL helper
function fixUrl(url) {
    if (!url) return null;
    if (url.startsWith('//')) return 'https:' + url;
    if (!url.startsWith('http')) return BASE_URL + (url.startsWith('/') ? '' : '/') + url;
    return url;
}

// Hunter Decoder - Decodes the obfuscated script used by DiziGom
function decodeHunter(encoded, base, chars, offset, charIndex, radix) {
    const charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/";

    function baseConvert(str, fromBase, toBase) {
        const fromChars = charset.slice(0, fromBase);
        const toChars = charset.slice(0, toBase);

        // Convert to decimal
        let decimal = 0;
        const reversed = str.split('').reverse();
        for (let i = 0; i < reversed.length; i++) {
            const char = reversed[i];
            const index = fromChars.indexOf(char);
            if (index === -1) continue;
            decimal += index * Math.pow(fromBase, i);
        }

        // Convert from decimal to target base
        if (decimal === 0) return '0';
        let result = '';
        while (decimal > 0) {
            result = toChars[decimal % toBase] + result;
            decimal = Math.floor(decimal / toBase);
        }
        return result || '0';
    }

    let result = '';
    let i = 0;

    while (i < encoded.length) {
        let segment = '';
        while (i < encoded.length && encoded[i] !== chars[charIndex]) {
            segment += encoded[i];
            i++;
        }
        i++; // Skip the delimiter character

        // Replace characters with their index positions
        for (let j = 0; j < chars.length; j++) {
            segment = segment.split(chars[j]).join(j.toString());
        }

        // Convert from base to decimal and subtract offset
        const charCode = parseInt(baseConvert(segment, charIndex, 10)) - offset;
        result += String.fromCharCode(charCode);
    }

    try {
        return decodeURIComponent(escape(result));
    } catch (e) {
        return result;
    }
}

// P.A.C.K.E.R Unpacker
function unpack(packed) {
    try {
        var p = /eval\(function\(p,a,c,k,e,d\)\{.*\}\((.*)\)\)/.exec(packed);
        if (!p) return null;

        var args = eval(`[${p[1]}]`);
        var p_ = args[0];
        var a_ = args[1];
        var c_ = args[2];
        var k_ = args[3];
        var e_ = args[4];
        var d_ = args[5];

        function baseN(num, base) {
            const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            let res = "";
            do {
                res = chars[num % base] + res;
                num = Math.floor(num / base);
            } while (num > 0);
            return res;
        }

        // Basic implementation of the unpacker logic
        // Note: A full implementation might be needed if the site uses complex encoding
        // This is a simplified version often sufficient for these sites

        // However, since we can't easily run the exact JS logic without a full engine, 
        // we might need to rely on the fact that we can extract the 'sources' array from the unpacked string.
        // Or we can try to emulate the replacement logic.

        // Let's try a different approach: usually the packed script contains the sources in plain text or slightly obfuscated.
        // But if we need to unpack, we need a real unpacker.

        // For now, let's return null and handle it in processFetchResult if we can't unpack easily.
        // But wait, DiziGom.kt uses JsUnpacker.

        // Let's use a simple string replacement approach if possible, or just regex the packed string if the content is there.
        return null;
    } catch (e) {
        console.log('Unpack error:', e);
        return null;
    }
}

// Helper to convert episode URL to series URL
function convertEpisodeUrlToSeriesUrl(episodeUrl) {
    // Example: https://dizigom104.com/dizi-adi-1-sezon-1-bolum/
    // Target: https://dizigom104.com/dizi-izle/dizi-adi/

    if (!episodeUrl) return null;

    const urlParts = episodeUrl.split('/');
    const episodePart = urlParts.find(p => p.includes('-sezon-') && p.includes('-bolum-'));

    if (!episodePart) return episodeUrl;

    const seriesName = episodePart
        .split('-sezon-')[0]
        .split('-')
        .filter(s => !/^\d+$/.test(s)) // Remove numbers
        .join('-')
        .replace(/^-+|-+$/g, ''); // Trim dashes

    const baseUrl = episodeUrl.substring(0, episodeUrl.indexOf('//') + 2) + episodeUrl.split('/')[2];
    return `${baseUrl}/dizi-izle/${seriesName}/`;
}

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    const catalogId = args.id;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 20) + 1; // Assuming 20 items per page
    const searchQuery = args.extra?.search;

    console.log(`🎯 [DiziGom Catalog] ID: ${catalogId}, Page: ${page}`);

    // Search
    if (catalogId === 'dizigom_search' && searchQuery) {
        return {
            instructions: [{
                requestId: `dizigom-search-${Date.now()}`,
                purpose: 'catalog-search-query',
                url: `${BASE_URL}/?s=${encodeURIComponent(searchQuery)}`,
                method: 'GET',
                headers: getHeaders()
            }]
        };
    }

    // Direct GET catalogs
    if (catalogId === 'dizigom_new_episodes') {
        return {
            instructions: [{
                requestId: `dizigom-new-episodes-${Date.now()}`,
                purpose: 'catalog-new-episodes',
                url: `${BASE_URL}/tum-bolumler/page/${page}`,
                method: 'GET',
                headers: getHeaders()
            }]
        };
    }

    if (catalogId === 'dizigom_movies') {
        const url = page === 1
            ? `${BASE_URL}/tum-yabanci-filmler-hd2/?filtrele=tarih&sirala=DESC&imdb=&yil=&tur=`
            : `${BASE_URL}/tum-yabanci-filmler-hd2/page/${page}/?filtrele=tarih&sirala=DESC&imdb=&yil=&tur=`;

        return {
            instructions: [{
                requestId: `dizigom-movies-${Date.now()}`,
                purpose: 'catalog-movies',
                url: url,
                method: 'GET',
                headers: getHeaders()
            }]
        };
    }

    // Ajax catalogs (Genres)
    // Need WpOnce first
    const genreName = manifest.catalogs.find(c => c.id === catalogId)?.name;

    if (genreName) {
        return {
            instructions: [{
                requestId: `dizigom-init-${Date.now()}`,
                purpose: 'init-session',
                url: BASE_URL,
                method: 'GET',
                headers: getHeaders(),
                metadata: {
                    targetPurpose: 'catalog-genre',
                    genreName: genreName,
                    page: page
                }
            }]
        };
    }

    return { metas: [] };
}

async function handleMeta(args) {
    const id = args.id;
    const url = Buffer.from(id.replace('dizigom:', ''), 'base64').toString('utf-8');

    console.log(`📺 [DiziGom Meta] URL: ${url}`);

    return {
        instructions: [{
            requestId: `dizigom-meta-${Date.now()}`,
            purpose: 'meta',
            url: url,
            method: 'GET',
            headers: getHeaders()
        }]
    };
}

async function handleStream(args) {
    const id = args.id;
    const url = Buffer.from(id.replace('dizigom:', ''), 'base64').toString('utf-8');

    console.log(`🎬 [DiziGom Stream] URL: ${url}`);

    return {
        instructions: [{
            requestId: `dizigom-stream-page-${Date.now()}`,
            purpose: 'stream-page',
            url: url,
            method: 'GET',
            headers: getHeaders()
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata } = fetchResult;

    // ========== INIT SESSION (Get WpOnce) ==========
    if (purpose === 'init-session') {
        const $ = cheerio.load(body);
        const scriptContent = $('script#ajax-users-list-js-extra').html();
        let wpOnce = null;

        if (scriptContent) {
            const match = /"admin_ajax_nonce":"([^"]*)"/.exec(scriptContent);
            if (match) {
                wpOnce = match[1];
            }
        }

        if (!wpOnce) {
            console.log('❌ WpOnce not found');
            return { metas: [] };
        }

        console.log(`✅ WpOnce found: ${wpOnce}`);

        if (metadata.targetPurpose === 'catalog-genre') {
            const genre = metadata.genreName;
            const page = metadata.page;

            // "Tüm" check from Kotlin code
            // "filtrele=tarih&sirala=DESC&yil=&imdb=&kelime=&tur=${request.name}"
            const formData = `filtrele=tarih&sirala=DESC&yil=&imdb=&kelime=&tur=${encodeURIComponent(genre)}`;

            return {
                instructions: [{
                    requestId: `dizigom-genre-${Date.now()}`,
                    purpose: 'catalog-genre-result',
                    url: `${BASE_URL}/wp-admin/admin-ajax.php`,
                    method: 'POST',
                    headers: {
                        ...getHeaders(BASE_URL + '/'),
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    data: `action=dizigom_search_action&formData=${encodeURIComponent(formData)}&filterType=series&paged=${page}&_wpnonce=${wpOnce}`
                }]
            };
        }
    }

    // ========== CATALOG RESULTS ==========
    if (purpose === 'catalog-new-episodes') {
        const $ = cheerio.load(body);
        const metas = [];

        $('div.episode-box').each((i, elem) => {
            const seriesTitle = $(elem).find('div.serie-name a').text().trim();
            const episodeInfo = $(elem).find('div.episode-name a').text().trim();
            const fullTitle = `${seriesTitle} ${episodeInfo}`;

            const originalHref = $(elem).find('div.poster a').attr('href');
            if (!originalHref) return;

            const href = convertEpisodeUrlToSeriesUrl(originalHref);
            const posterUrl = $(elem).find('div.poster img').attr('data-src') || $(elem).find('div.poster img').attr('src');

            if (href) {
                metas.push({
                    id: 'dizigom:' + Buffer.from(href).toString('base64').replace(/=/g, ''),
                    type: 'series',
                    name: fullTitle,
                    poster: fixUrl(posterUrl)
                });
            }
        });

        return { metas };
    }

    if (purpose === 'catalog-movies' || purpose === 'catalog-genre-result' || purpose === 'catalog-search-query') {
        const $ = cheerio.load(body);
        const metas = [];

        const selector = purpose === 'catalog-movies' ? 'div.movie-box' : 'div.single-item';

        $(selector).each((i, elem) => {
            const title = $(elem).find('div.categorytitle, div.film-ismi').text().trim();
            const href = $(elem).find('a').attr('href');

            let posterUrl = $(elem).find('div.img img').attr('data-src') ||
                $(elem).find('div.cat-img img').attr('src') ||
                $(elem).find('img').attr('src');

            if (title && href) {
                const type = (href.includes('-film-') || href.includes('film')) ? 'movie' : 'series';

                metas.push({
                    id: 'dizigom:' + Buffer.from(href).toString('base64').replace(/=/g, ''),
                    type: type,
                    name: title,
                    poster: fixUrl(posterUrl)
                });
            }
        });

        return { metas };
    }

    // ========== META ==========
    if (purpose === 'meta') {
        const $ = cheerio.load(body);

        const title = $('div.serieTitle h1, h1.title-border').text().trim();
        const poster = $('div.seriePoster').attr('style')?.match(/url\((.*?)\)/)?.[1] ||
            $('meta[property="og:image"]').attr('content');

        const description = $('div.serieDescription p, div#filmbilgileri > div:nth-child(2)').text().trim();
        const year = $('div.airDateYear a, div.movieKunye div.item:nth-child(1) div.value').text().trim();
        const rating = $('div.score').text().trim();
        const tags = $('div.genreList a, div#listelements div.elements').map((i, el) => $(el).text()).get();

        const actors = $('div.owl-stage a').map((i, el) => $(el).text()).get();

        // Episodes
        const videos = [];
        $('div.bolumust').each((i, elem) => {
            const epHref = $(elem).find('a').attr('href');
            const epName = $(elem).find('div.bolum-ismi').text().trim();
            const headerText = $(elem).find('div.baslik').text();

            // "1. Sezon 1. Bölüm" parsing
            const parts = headerText.split(' ');
            const season = parseInt(parts[0]?.replace('.', '') || '1');
            const episode = parseInt(parts[2]?.replace('.', '') || '1');

            if (epHref) {
                videos.push({
                    id: 'dizigom:' + Buffer.from(epHref).toString('base64').replace(/=/g, ''),
                    title: epName || `${season}. Sezon ${episode}. Bölüm`,
                    season: season,
                    episode: episode
                });
            }
        });

        const type = url.includes('-film-') ? 'movie' : 'series';

        return {
            meta: {
                id: 'dizigom:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                type: type,
                name: title,
                poster: fixUrl(poster),
                background: fixUrl(poster),
                description: description,
                releaseInfo: year,
                imdbRating: rating,
                genres: tags,
                cast: actors,
                videos: videos.length > 0 ? videos : undefined
            }
        };
    }
    // ========== STREAM PAGE ==========
    if (purpose === 'stream-page') {
        const $ = cheerio.load(body);

        // DiziGom uses obfuscated script to load video via API
        // The script decodes to: $.get("/api/watch/{hash}.dizigom", function(data){...})
        // We need to find and decode this script to get the API URL

        let apiHash = null;

        // Look for the obfuscated eval script
        // Note: Variable names like _0xc58e, _0xc53e etc. change dynamically
        $('script').each((i, elem) => {
            const scriptText = $(elem).html();
            if (scriptText && scriptText.includes('eval(function(h,u,n,t,e,r)')) {
                // Extract the encoded payload from the eval function
                // Format: eval(function(h,u,n,t,e,r){...}("encoded",54,"JkMoeXZbn",43,4,50))
                const evalMatch = scriptText.match(/eval\(function\(h,u,n,t,e,r\)[\s\S]*?\}\("([^"]+)",(\d+),"([^"]+)",(\d+),(\d+),(\d+)\)\)/);

                if (evalMatch) {
                    try {
                        const encoded = evalMatch[1];
                        const base = parseInt(evalMatch[2]);
                        const chars = evalMatch[3];
                        const offset = parseInt(evalMatch[4]);
                        const charIndex = parseInt(evalMatch[5]);
                        const radix = parseInt(evalMatch[6]);

                        // Decode the obfuscated string
                        const decoded = decodeHunter(encoded, base, chars, offset, charIndex, radix);
                        console.log(`🔓 [DiziGom] Decoded script: ${decoded}`);

                        // Extract the API hash from decoded script
                        // Format: $.get("/api/watch/HASH.dizigom", ...)
                        const hashMatch = decoded.match(/\/api\/watch\/([a-f0-9]+)\.dizigom/);
                        if (hashMatch) {
                            apiHash = hashMatch[1];
                        }
                    } catch (e) {
                        console.log('❌ Error decoding script:', e);
                    }
                }
            }
        });

        if (!apiHash) {
            console.log('❌ Could not find API hash');
            return { streams: [] };
        }

        console.log(`🔍 [DiziGom] API Hash: ${apiHash}`);

        // Request the API to get the player iframe content
        return {
            instructions: [{
                requestId: `dizigom-api-${Date.now()}`,
                purpose: 'stream-api',
                url: `${BASE_URL}/api/watch/${apiHash}.dizigom`,
                method: 'GET',
                headers: {
                    ...getHeaders(url),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }]
        };
    }

    // ========== STREAM API ==========
    if (purpose === 'stream-api') {
        // The API returns base64-encoded HTML that contains an iframe
        // We need to decode it and extract the iframe src
        let iframeUrl = null;

        try {
            // Try to decode as base64
            const decoded = Buffer.from(body, 'base64').toString('utf-8');
            console.log(`🔓 [DiziGom] Decoded API response length: ${decoded.length}`);

            // Look for iframe src in decoded content
            // Format: <iframe ... src="https://play.dizigom104.com/embed/112003.mp4" ...>
            const iframeMatch = decoded.match(/<iframe[^>]+src=["']([^"']+)["']/i);
            if (iframeMatch) {
                iframeUrl = iframeMatch[1];
                console.log(`🔍 [DiziGom] Found iframe URL: ${iframeUrl}`);
            }
        } catch (e) {
            console.log('❌ Error decoding API response:', e);
        }

        // If we found an iframe URL, fetch it
        if (iframeUrl) {
            return {
                instructions: [{
                    requestId: `dizigom-player-${Date.now()}`,
                    purpose: 'stream-iframe',
                    url: iframeUrl,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                        'Referer': BASE_URL + '/'
                    }
                }]
            };
        }

        console.log('❌ No iframe URL found in API response');
        return { streams: [] };
    }

    // ========== STREAM IFRAME ==========
    if (purpose === 'stream-iframe') {
        const $ = cheerio.load(body);

        // Helper to extract streams from content
        const extractStreams = (content) => {
            const foundStreams = [];

            // Look for file URLs in various formats
            // Format 1: "file":"URL"
            // Format 2: file:"URL"
            const fileRegex = /["']?file["']?\s*:\s*["']([^"']+)["']/g;
            let match;

            while ((match = fileRegex.exec(content)) !== null) {
                let fileUrl = match[1].replace(/\\\//g, '/');

                // Skip non-video files
                if (fileUrl.includes('.vtt') || fileUrl.includes('.srt')) continue;

                // Determine quality from URL or context
                let label = 'Auto';
                if (fileUrl.includes('720')) label = '720p';
                else if (fileUrl.includes('1080')) label = '1080p';
                else if (fileUrl.includes('480')) label = '480p';
                else if (fileUrl.includes('360')) label = '360p';

                // Check for label in nearby content
                const labelMatch = content.match(new RegExp(`["']?label["']?\\s*:\\s*["']([^"']+)["']`, 'i'));
                if (labelMatch) label = labelMatch[1];

                foundStreams.push({
                    name: 'DiziGom ' + label,
                    title: label,
                    url: fileUrl,
                    behaviorHints: { notWebReady: true }
                });
            }

            return foundStreams;
        };

        // Helper to extract subtitles
        const extractSubtitles = (content) => {
            const foundSubs = [];

            // Look for subtitle tracks
            const tracksMatch = content.match(/tracks\s*:\s*\[([\s\S]*?)\]/);
            if (tracksMatch) {
                const tracksBlock = tracksMatch[1];
                const trackRegex = /\{[^}]*file\s*:\s*["']([^"']+\.vtt)["'][^}]*\}/g;
                let match;

                while ((match = trackRegex.exec(tracksBlock)) !== null) {
                    foundSubs.push({
                        url: match[1].replace(/\\\//g, '/'),
                        lang: 'tur'
                    });
                }
            }

            return foundSubs;
        };

        // 1. Try raw body first
        let streams = extractStreams(body);
        if (streams.length > 0) {
            const subs = extractSubtitles(body);
            if (subs.length > 0) {
                streams.forEach(s => { s.subtitles = subs; });
            }
            return { streams };
        }

        // 2. Look for P.A.C.K.E.R packed script and unpack it
        let packedScript = null;
        $('script').each((i, elem) => {
            const data = $(elem).html();
            if (data && data.includes('eval(function(p,a,c,k,e,d)')) {
                packedScript = data;
            }
        });

        if (packedScript) {
            try {
                console.log('🔓 [DiziGom] Found packed script, unpacking...');

                // Extract the packed parameters
                // Format: return p}('payload',radix,count,'keywords'.split('|'),0,{})
                // Note: payload may contain single quotes, so we use a more specific regex
                const argsMatch = packedScript.match(/return p\}\('([\s\S]+?)',(\d+),(\d+),'([^']+)'\.split\('\|'\),0,\{\}\)/);

                if (argsMatch) {
                    const payload = argsMatch[1];
                    const radix = parseInt(argsMatch[2]);
                    const count = parseInt(argsMatch[3]);
                    const keywords = argsMatch[4].split('|');

                    console.log(`🔓 [DiziGom] Payload: ${payload.length} chars, Radix: ${radix}, Count: ${count}, Keywords: ${keywords.length}`);

                    // Unpack function - standard P.A.C.K.E.R decoder
                    const e = (c) => {
                        return (c < radix ? '' : e(parseInt(c / radix))) +
                            ((c = c % radix) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
                    };

                    let unpacked = payload;
                    let c = count;
                    while (c--) {
                        if (keywords[c]) {
                            unpacked = unpacked.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), keywords[c]);
                        }
                    }

                    console.log('🔓 [DiziGom] Unpacked script length:', unpacked.length);

                    // Extract streams from unpacked content
                    streams = extractStreams(unpacked);
                    if (streams.length > 0) {
                        const subs = extractSubtitles(unpacked);
                        if (subs.length > 0) {
                            streams.forEach(s => { s.subtitles = subs; });
                        }
                        console.log('✅ [DiziGom] Found', streams.length, 'stream(s)');
                        return { streams };
                    }
                } else {
                    console.log('❌ [DiziGom] Could not match packed script pattern');
                }
            } catch (err) {
                console.log('❌ Error unpacking script:', err);
            }
        }

        console.log('❌ [DiziGom] No streams found in player page');
        return { streams: [] };
    }

    return { metas: [] };
}

module.exports = {
    manifest,
    getManifest: () => manifest,
    handleCatalog,
    handleMeta,
    handleStream,
    processFetchResult
};
