const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.dizist',
    version: '1.0.0',
    name: 'Dizist',
    description: 'Türkçe dizi izleme platformu - Yabancı diziler, animeler ve Asya dizileri',
    resources: ['catalog', 'meta', 'stream'],
    types: ['series'],
    catalogs: [
        {
            type: 'series',
            id: 'dizist_yeni_bolumler',
            name: 'Yeni Eklenen Bölümler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizist_yabanci_diziler',
            name: 'Yabancı Diziler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizist_animeler',
            name: 'Animeler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizist_asya_dizileri',
            name: 'Asya Dizileri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizist_search',
            name: 'Arama',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['dizist']
};

const BASE_URL = 'https://dizist.club';

// Katalog URL'leri
const CATALOG_URLS = {
    'dizist_yeni_bolumler': `${BASE_URL}/`,
    'dizist_yabanci_diziler': `${BASE_URL}/yabanci-diziler`,
    'dizist_animeler': `${BASE_URL}/animeler`,
    'dizist_asya_dizileri': `${BASE_URL}/asyadizileri`
};

// Session variables (Flutter should inject cookies)
let sessionCookies = null;
let cKey = null;
let cValue = null;

// ============ SESSION INITIALIZATION ============
// NOT: Flutter tarafı ilk isteği yapıp cookie'leri inject etmeli

function getHeaders(isAjax = false) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': isAjax ? 'application/json, text/javascript, */*; q=0.01' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    if (isAjax) {
        headers['X-Requested-With'] = 'XMLHttpRequest';
        headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    }

    // Flutter should inject cookies
    headers['__COOKIE_HINT__'] = 'FLUTTER_INJECT_COOKIES';

    return headers;
}

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [Dizist Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 20) + 1;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Session initialization instruction
    const initRequestId = `dizist-init-${Date.now()}-${randomId}`;
    const initInstruction = {
        requestId: initRequestId,
        purpose: 'session_init',
        url: BASE_URL + '/',
        method: 'GET',
        headers: getHeaders(false),
        metadata: { catalogId, page, searchQuery }
    };

    // Search catalog
    if (catalogId === 'dizist_search' && searchQuery) {
        return {
            instructions: [
                initInstruction,
                {
                    requestId: `dizist-search-${Date.now()}-${randomId}`,
                    purpose: 'catalog_search',
                    url: `${BASE_URL}/bg/searchcontent`,
                    method: 'POST',
                    headers: getHeaders(true),
                    body: `cKey=&cValue=&searchTerm=${encodeURIComponent(searchQuery)}`,
                    metadata: { catalogId, requiresSession: true }
                }
            ]
        };
    }

    // Normal catalog
    const baseUrl = CATALOG_URLS[catalogId];
    if (!baseUrl) {
        return { instructions: [] };
    }

    // Yeni Bölümler için sayfa yok
    const url = catalogId === 'dizist_yeni_bolumler'
        ? baseUrl
        : `${baseUrl}/page/${page}`;

    const requestId = `dizist-catalog-${catalogId}-${page}-${Date.now()}-${randomId}`;

    return {
        instructions: [
            initInstruction,
            {
                requestId,
                purpose: 'catalog',
                url: url,
                method: 'GET',
                headers: getHeaders(false),
                metadata: { catalogId, requiresSession: true }
            }
        ]
    };
}

async function handleMeta(args) {
    const url = Buffer.from(args.id.replace('dizist:', ''), 'base64').toString('utf-8');

    console.log(`📺 [Dizist Meta] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `dizist-meta-${Date.now()}-${randomId}`;

    return {
        instructions: [
            {
                requestId: `dizist-init-meta-${Date.now()}-${randomId}`,
                purpose: 'session_init',
                url: BASE_URL + '/',
                method: 'GET',
                headers: getHeaders(false)
            },
            {
                requestId,
                purpose: 'meta',
                url: url,
                method: 'GET',
                headers: getHeaders(false),
                metadata: { requiresSession: true }
            }
        ]
    };
}

async function handleStream(args) {
    const url = Buffer.from(args.id.replace('dizist:', ''), 'base64').toString('utf-8');

    console.log(`🎬 [Dizist Stream] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `dizist-stream-${Date.now()}-${randomId}`;

    return {
        instructions: [
            {
                requestId: `dizist-init-stream-${Date.now()}-${randomId}`,
                purpose: 'session_init',
                url: BASE_URL + '/',
                method: 'GET',
                headers: getHeaders(false)
            },
            {
                requestId,
                purpose: 'stream',
                url: url,
                method: 'GET',
                headers: getHeaders(false),
                metadata: { requiresSession: true }
            }
        ]
    };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata } = fetchResult;

    console.log(`\n⚙️ [Dizist Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    // Session initialization
    if (purpose === 'session_init') {
        try {
            const $ = cheerio.load(body);
            cKey = $('input[name=cKey]').val();
            cValue = $('input[name=cValue]').val();

            console.log(`✅ Session initialized: cKey=${cKey ? 'OK' : 'MISSING'}, cValue=${cValue ? 'OK' : 'MISSING'}`);

            // Return ok to continue with next instruction
            return { ok: true };
        } catch (error) {
            console.log('❌ Session init error:', error.message);
            return { ok: false, error: error.message };
        }
    }

    // Catalog Search
    if (purpose === 'catalog_search') {
        try {
            const data = JSON.parse(body);
            const html = data?.data?.html;

            if (!html) {
                console.log('❌ No search results HTML');
                return { metas: [] };
            }

            const $ = cheerio.load(html);
            const metas = [];

            $('ul.flex.flex-wrap li').each((i, elem) => {
                const a = $(elem).find('a');
                if (!a.length) return;

                const title = a.find('span.truncate').text().trim();
                if (!title) return;

                const href = a.attr('href');
                if (!href) return;

                const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

                // Poster
                const posterSrcset = a.find('img').attr('data-srcset');
                let posterUrl = null;
                if (posterSrcset) {
                    posterUrl = posterSrcset.split(' 1x')[0]?.trim();
                }

                const id = 'dizist:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                metas.push({
                    id: id,
                    type: 'series',
                    name: title,
                    poster: posterUrl || null
                });
            });

            console.log(`✅ Found ${metas.length} search results`);
            return { metas };
        } catch (error) {
            console.log('❌ Search parse error:', error.message);
            return { metas: [] };
        }
    }

    // Catalog
    if (purpose === 'catalog') {
        try {
            const $ = cheerio.load(body);
            const metas = [];
            const catalogId = metadata?.catalogId;

            // Yeni Bölümler için özel selector
            if (catalogId === 'dizist_yeni_bolumler') {
                $('div.poster-xs').each((i, elem) => {
                    const a = $(elem).find('a');
                    const title = a.attr('title');
                    if (!title) return;

                    let href = a.attr('href');
                    if (!href) return;

                    // Bölüm linkini dizi linkine çevir
                    href = href.replace('/izle/', '/dizi/').replace(/-[0-9]+.*$/, '');
                    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

                    const posterUrl = $(elem).find('img').attr('data-srcset')?.split(' ')[0];

                    const id = 'dizist:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                    metas.push({
                        id: id,
                        type: 'series',
                        name: title,
                        poster: posterUrl || null
                    });
                });
            } else {
                // Normal dizi listesi
                $('div.poster-long.w-full').each((i, elem) => {
                    const a = $(elem).find('a');
                    const title = a.attr('title');
                    if (!title) return;

                    let href = a.attr('href');
                    if (!href) return;

                    // Link'i dizi formatına çevir
                    href = href.replace('/izle/', '/dizi/').replace(/-[0-9]+.*$/, '');
                    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

                    const posterUrl = $(elem).find('img').attr('data-srcset')?.split(' ')[0];

                    const id = 'dizist:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                    metas.push({
                        id: id,
                        type: 'series',
                        name: title,
                        poster: posterUrl || null
                    });
                });
            }

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

            const title = $('h1').text().trim();
            if (!title) {
                return { meta: null };
            }

            const poster = $('a.block img').attr('data-srcset')?.split(' 1x')[0];

            // Description
            const description = $('div.series-profile-summary > p:nth-child(3)').text().trim() ||
                $('div.series-profile-summary > p:nth-child(2)').text().trim();

            // Yapım Yılı
            const yearText = $('li.sm\\:w-1\\/5:nth-child(5) > p:nth-child(2)').text().trim();
            const year = yearText ? parseInt(yearText) : null;

            // Türler
            const tags = [];
            $('span.block a').each((i, elem) => {
                tags.push($(elem).text().trim());
            });

            // IMDB Puanı
            const rating = $('strong.color-imdb').text().trim();

            // Süre
            const durationText = $('li.sm\\:w-1\\/5:nth-child(2) > p:nth-child(2)').text().trim();
            const duration = durationText ? `${durationText.split(' ')[0]} dk` : null;

            // Oyuncular
            const actors = [];
            $('li.w-auto.md\\:w-full.flex-shrink-0').each((i, elem) => {
                const actorName = $(elem).find('p.truncate').text().trim();
                if (actorName) actors.push(actorName);
            });

            // Trailer
            const trailerMatch = body.match(/embed\/(.*)\?rel/);
            let trailer = null;
            if (trailerMatch) {
                trailer = `https://www.youtube.com/watch?v=${trailerMatch[1]}`;
            }

            // Bölümleri parse et
            const videos = [];
            const urlPattern = /,\"url\":\"([^\"]*)\",\"dateModified\":\"/g;
            let match;

            while ((match = urlPattern.exec(body)) !== null) {
                let rawUrl = match[1].replace(/\\/g, '');

                // Eğer '-bolum' yoksa, sonuna '-1-bolum' ekle
                let fullHref = rawUrl;
                if (!rawUrl.includes('-bolum')) {
                    fullHref = rawUrl.replace('/sezon/', '/izle/').replace(/\/$/, '') + '-1-bolum';
                }

                const fullUrl = fullHref.startsWith('http') ? fullHref : `${BASE_URL}${fullHref}`;

                // Sezon ve bölüm numarası
                const episodeNum = fullUrl.match(/-(\d+)-bolum/)?.[1];
                const seasonNum = fullUrl.match(/-(\d+)-sezon/)?.[1];

                if (episodeNum && seasonNum) {
                    const videoId = 'dizist:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                    videos.push({
                        id: videoId,
                        title: `Bölüm ${episodeNum}`,
                        season: parseInt(seasonNum),
                        episode: parseInt(episodeNum)
                    });
                }
            }

            const meta = {
                id: 'dizist:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                type: 'series',
                name: title,
                poster: poster || null,
                background: poster || null,
                description: description || 'Açıklama mevcut değil',
                releaseInfo: year ? year.toString() : null,
                imdbRating: rating || null,
                genres: tags.length > 0 ? tags : undefined,
                runtime: duration,
                cast: actors.length > 0 ? actors : undefined,
                trailer: trailer,
                videos: videos
            };

            console.log(`✅ Meta retrieved: ${title} with ${videos.length} episodes`);
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
            const instructions = [];

            // Kaynak linklerini bul
            const sourceLinks = $('div.series-watch-alternatives.series-watch-alternatives-active.mb-5 li a.focus\\:outline-none');

            console.log(`📺 Found ${sourceLinks.length} source(s)`);

            sourceLinks.each((i, elem) => {
                const href = $(elem).attr('href');
                if (!href) return;

                const randomId = Math.random().toString(36).substring(2, 10);
                const requestId = `dizist-source-${i}-${Date.now()}-${randomId}`;

                // player=0 ise mevcut sayfadan iframe al, değilse yeni sayfaya git
                if (href.includes('player=0')) {
                    let iframeSrc = $('iframe').attr('src');
                    if (iframeSrc) {
                        console.log(`   Raw iframe src: ${iframeSrc.substring(0, 100)}...`);

                        // Kotlin'deki fixUrlNull mantığı
                        let fullIframeUrl;
                        if (iframeSrc.startsWith('http://') || iframeSrc.startsWith('https://')) {
                            fullIframeUrl = iframeSrc;
                        } else if (iframeSrc.startsWith('//')) {
                            fullIframeUrl = `https:${iframeSrc}`;
                        } else if (iframeSrc.startsWith('/')) {
                            fullIframeUrl = `${BASE_URL}${iframeSrc}`;
                        } else {
                            if (iframeSrc.includes('.') && !iframeSrc.startsWith('/')) {
                                fullIframeUrl = `https://${iframeSrc}`;
                            } else {
                                fullIframeUrl = `${BASE_URL}/${iframeSrc}`;
                            }
                        }

                        console.log(`   Fixed iframe URL: ${fullIframeUrl.substring(0, 100)}...`);

                        instructions.push({
                            requestId,
                            purpose: 'stream_extract',
                            url: fullIframeUrl,
                            method: 'GET',
                            headers: getHeaders(false),
                            forceWebView: false,  // ⚡ WebView kullanma - direkt fetch yeterli
                            allowInsecure: true,
                            metadata: { streamName: `Dizist Server ${i + 1}`, originalUrl: url }
                        });
                    }
                } else {
                    // Yeni sayfaya git
                    instructions.push({
                        requestId,
                        purpose: 'stream_page',
                        url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
                        method: 'GET',
                        headers: getHeaders(false),
                        forceWebView: false,  // ⚡ WebView kullanma - direkt fetch yeterli
                        allowInsecure: true,
                        metadata: { streamName: `Dizist Server ${i + 1}`, originalUrl: url }
                    });
                }
            });

            if (instructions.length > 0) {
                return { instructions };
            }

            return { streams: [] };
        } catch (error) {
            console.log('❌ Stream error:', error.message);
            return { streams: [] };
        }
    }

    // Stream Page (get iframe from player page)
    if (purpose === 'stream_page') {
        try {
            const $ = cheerio.load(body);
            let iframeSrc = $('iframe').attr('src');

            if (!iframeSrc) {
                console.log('❌ No iframe found on player page');
                return { streams: [] };
            }

            console.log(`   Raw iframe src (from player page): ${iframeSrc.substring(0, 100)}...`);

            // Kotlin'deki fixUrlNull mantığı
            let fullIframeUrl;
            if (iframeSrc.startsWith('http://') || iframeSrc.startsWith('https://')) {
                fullIframeUrl = iframeSrc;
            } else if (iframeSrc.startsWith('//')) {
                fullIframeUrl = `https:${iframeSrc}`;
            } else if (iframeSrc.startsWith('/')) {
                fullIframeUrl = `${BASE_URL}${iframeSrc}`;
            } else {
                if (iframeSrc.includes('.') && !iframeSrc.startsWith('/')) {
                    fullIframeUrl = `https://${iframeSrc}`;
                } else {
                    fullIframeUrl = `${BASE_URL}/${iframeSrc}`;
                }
            }

            console.log(`   Fixed iframe URL: ${fullIframeUrl.substring(0, 100)}...`);

            const randomId = Math.random().toString(36).substring(2, 10);

            return {
                instructions: [{
                    requestId: `dizist-extract-${Date.now()}-${randomId}`,
                    purpose: 'stream_extract',
                    url: fullIframeUrl,
                    method: 'GET',
                    headers: getHeaders(false),
                    forceWebView: true,
                    allowInsecure: true,
                    metadata: metadata
                }]
            };
        } catch (error) {
            console.log('❌ Stream page error:', error.message);
            return { streams: [] };
        }
    }

    // Stream Extract
    if (purpose === 'stream_extract') {
        try {
            const streams = [];
            const streamName = metadata?.streamName || 'Dizist';

            console.log(`\n🔍 [STREAM EXTRACT] ${streamName} işleniyor...`);
            console.log(`   URL: ${url.substring(0, 80)}...`);
            console.log(`   Body length: ${body.length} bytes`);

            // ContentX / Pichive extractor (SelcukFlix'teki gibi - TAM VERSİYON)
            if (url.includes('pichive.online') ||
                url.includes('contentx.me') ||
                url.includes('hotlinger.com') ||
                url.includes('playru.net') ||
                url.includes('dplayer82.site') ||
                url.includes('dplayer74.site')) {

                console.log('   🎯 Detected: ContentX/Pichive extractor');

                // 🔧 ÖNCELİK 0: Flutter WebView source2.php'yi iframe içinde çağırdı mı kontrol et
                if (body.includes('<!-- SOURCE2_PHP_RESULT -->')) {
                    console.log('   ⚡ Found embedded source2.php result from WebView!');

                    const source2Match = body.match(/<!-- SOURCE2_PHP_RESULT -->\s*([\s\S]*?)\s*<!-- \/SOURCE2_PHP_RESULT -->/);
                    if (source2Match && source2Match[1]) {
                        const source2Body = source2Match[1].trim();
                        console.log(`   ⚡ Extracted source2.php body: ${source2Body.length} bytes`);

                        // source2.php body'sini direkt işle - contentx_source logic'ini simüle et
                        // purpose'u contentx_source'a çevir ve recursive olarak processResult'ı çağır
                        const urlParams = new URLSearchParams(new URL(url).search);
                        const vParam = urlParams.get('v');
                        const domain = new URL(url).origin;
                        const source2Url = `${domain}/source2.php?v=${vParam}`;

                        // Fake result object oluştur (contentx_source için)
                        return await processFetchResult({
                            body: source2Body,
                            purpose: 'contentx_source',
                            url: source2Url,
                            metadata: {
                                streamName,
                                originalUrl: metadata?.originalUrl,
                                iframeUrl: url,
                                extractorName: 'Pichive',
                                domain: domain,
                                webViewAttempted: true  // Zaten WebView'dan geldi
                            }
                        });
                    }
                }

                // 🔧 ÖNCELİK 1: iframe.php URL'sini source2.php'ye çevir
                // Eğer URL iframe.php ise, query parametresini alıp source2.php'ye yönlendir
                if (url.includes('iframe.php')) {
                    console.log('   🔧 iframe.php detected - converting to source2.php');

                    // URL'den v parametresini al
                    const urlParams = new URLSearchParams(new URL(url).search);
                    const vParam = urlParams.get('v');

                    if (vParam) {
                        console.log(`   ✅ Found iframe.php v param: ${vParam}`);

                        const domain = new URL(url).origin;
                        const sourceUrl = `${domain}/source2.php?v=${vParam}`;

                        console.log(`   🔄 Redirecting to source2.php: ${sourceUrl}`);

                        const randomId = Math.random().toString(36).substring(2, 10);
                        return {
                            instructions: [{
                                requestId: `dizist-iframe-to-source-${Date.now()}-${randomId}`,
                                purpose: 'contentx_source',
                                url: sourceUrl,
                                method: 'GET',
                                headers: {
                                    'Accept': 'application/json, text/plain, */*',
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                    'Referer': url,
                                    'Origin': domain
                                },
                                forceWebView: true,  // ⚡ Cloudflare bypass için WebView kullan
                                allowInsecure: true,
                                metadata: {
                                    streamName,
                                    originalUrl: metadata?.originalUrl,
                                    iframeUrl: url,
                                    extractorName: 'Pichive',
                                    domain: domain,
                                    waitTime: 3000,  // JavaScript için 3 saniye bekle
                                    webViewAttempted: true  // ⚡ Sonsuz döngü önleme
                                }
                            }]
                        };
                    }
                }

                // ⚡ Cloudflare check (iframe.php dönüşümünden SONRA)
                if (body.includes('Attention Required') && body.includes('Cloudflare')) {
                    console.log('   ⚠️ Cloudflare detected');

                    // Eğer zaten webViewAttempted flag'i varsa, sonsuz döngüyü önle
                    if (metadata?.webViewAttempted) {
                        console.log('   ❌ Cloudflare bypass failed after WebView attempt - giving up');
                        return { streams: [] };
                    }

                    console.log('   🔄 Requesting WebView retry...');

                    // Flutter'a WebView kullanması için instruction döndür
                    const randomId = Math.random().toString(36).substring(2, 10);
                    return {
                        instructions: [{
                            requestId: `dizist-webview-${Date.now()}-${randomId}`,
                            purpose: 'stream_extract',  // AYNI purpose
                            url: url,  // AYNI URL
                            method: 'GET',
                            headers: getHeaders(false),
                            forceWebView: true,  // ⚡ BU FLAG ÖNEMLİ
                            allowInsecure: true,
                            metadata: {
                                ...metadata,
                                webViewAttempted: true,  // ⚡ Sonsuz döngü önleme
                                waitTime: 3000  // 3 saniye bekle (JavaScript için)
                            }
                        }]
                    };
                }

                // Altyazıları iframe'den çek (Kotlin'deki gibi)
                const iframeSubtitles = [];
                const subUrls = new Set();

                // Kotlin'deki pattern: "file":"((?:\\\"|[^"])+)","label":"((?:\\\"|[^"])+)"
                const subRegex = /"file":"((?:\\\\"|[^"])+)","label":"((?:\\\\"|[^"])+)"/g;
                let subMatch;

                while ((subMatch = subRegex.exec(body)) !== null) {
                    const subUrlRaw = subMatch[1];
                    const subLangRaw = subMatch[2];

                    // URL temizleme (Kotlin'deki gibi)
                    const subUrl = subUrlRaw
                        .replace(/\\\//g, '/')
                        .replace(/\\u0026/g, '&')
                        .replace(/\\/g, '');

                    // Dil temizleme (Kotlin'deki gibi - Türkçe karakterler)
                    const subLang = subLangRaw
                        .replace(/\\u0131/g, 'ı')
                        .replace(/\\u0130/g, 'İ')
                        .replace(/\\u00fc/g, 'ü')
                        .replace(/\\u00e7/g, 'ç')
                        .replace(/\\u011f/g, 'ğ')
                        .replace(/\\u015f/g, 'ş');

                    const keywords = ['tur', 'tr', 'türkçe', 'turkce'];
                    const language = subLang.includes('Forced') ? 'Turkish Forced' :
                        keywords.some(k => subLang.toLowerCase().includes(k)) ? 'Turkish' : subLang;

                    if (!subUrls.has(subUrl)) {
                        subUrls.add(subUrl);
                        iframeSubtitles.push({
                            id: language.toLowerCase().replace(/\s+/g, '_'),
                            url: subUrl.startsWith('http') ? subUrl : `https:${subUrl}`,
                            lang: language
                        });
                        console.log(`   📝 Iframe'den altyazı bulundu: ${language}`);
                    }
                }

                // window.openPlayer() pattern (eski yöntem - fallback)
                const openPlayerMatch = body.match(/window\.openPlayer\(['"]([^'"]+)['"]/);
                if (openPlayerMatch) {
                    const playerId = openPlayerMatch[1];
                    console.log(`   ✅ Found openPlayer ID: ${playerId}`);

                    const domain = new URL(url).origin;
                    const sourceUrl = `${domain}/source2.php?v=${playerId}`;

                    // Dublaj kontrolü (Kotlin'deki gibi)
                    const dublajMatch = body.match(/","([^']+)","Türkçe"/);
                    const iDublaj = dublajMatch ? dublajMatch[1] : null;

                    if (iDublaj) {
                        console.log(`   🎤 Found dublaj ID: ${iDublaj}`);
                    }

                    const randomId = Math.random().toString(36).substring(2, 10);
                    return {
                        instructions: [{
                            requestId: `dizist-contentx-source-${Date.now()}-${randomId}`,
                            purpose: 'contentx_source',
                            url: sourceUrl,
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json, text/plain, */*',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': url,
                                'Origin': domain
                            },
                            forceWebView: false,
                            allowInsecure: true,
                            metadata: {
                                streamName,
                                originalUrl: metadata?.originalUrl,
                                iframeUrl: url,
                                extractorName: 'Pichive',
                                iframeSubtitles: iframeSubtitles,
                                iDublaj: iDublaj,
                                domain: domain
                            }
                        }]
                    };
                }
            }

            // Daha kapsamlı M3U8 pattern listesi
            const m3u8Patterns = [
                /file:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/i,
                /source:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /src:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /sources:\s*\[\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /playlist:\s*\[\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /var\s+\w+\s*=\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /const\s+\w+\s*=\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /let\s+\w+\s*=\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /openPlayer\s*\(\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /loadVideo\s*\(\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /(https?:\/\/[^\s"'<>()]+\.m3u8[^\s"'<>()]*)/i
            ];

            let m3uUrl = null;

            for (let i = 0; i < m3u8Patterns.length; i++) {
                const match = body.match(m3u8Patterns[i]);
                if (match) {
                    m3uUrl = match[1] || match[0];
                    m3uUrl = m3uUrl.replace(/\\/g, '').replace(/\\"/g, '"').trim();
                    console.log(`   ✅ M3U8 bulundu (Pattern #${i + 1}): ${m3uUrl.substring(0, 80)}...`);
                    break;
                }
            }

            if (!m3uUrl && body.includes('.m3u8')) {
                console.log(`   🔍 Script tag'lerinde aranıyor...`);
                const scriptMatches = body.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
                if (scriptMatches) {
                    for (const scriptTag of scriptMatches) {
                        const scriptContent = scriptTag.replace(/<\/?script[^>]*>/gi, '');
                        if (scriptContent.includes('.m3u8')) {
                            const match = scriptContent.match(/(https?:\/\/[^\s"'<>()]+\.m3u8[^\s"'<>()]*)/);
                            if (match) {
                                m3uUrl = match[1] || match[0];
                                console.log(`   ✅ Script'te M3U8 bulundu: ${m3uUrl.substring(0, 80)}...`);
                                break;
                            }
                        }
                    }
                }
            }

            if (m3uUrl) {
                if (!m3uUrl.startsWith('http://') && !m3uUrl.startsWith('https://')) {
                    const domain = new URL(url).origin;
                    if (m3uUrl.startsWith('/')) {
                        m3uUrl = `${domain}${m3uUrl}`;
                    } else {
                        m3uUrl = `https:${m3uUrl}`;
                    }
                }

                console.log(`✅ Stream hazırlandı: ${m3uUrl.substring(0, 80)}...`);

                streams.push({
                    name: streamName,
                    title: streamName,
                    url: m3uUrl,
                    behaviorHints: {
                        notWebReady: false,
                        proxyHeaders: {
                            request: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': url,
                                'Origin': new URL(url).origin
                            }
                        }
                    }
                });
            } else {
                console.log('❌ No M3U8 found in iframe content');
                console.log(`   Body preview (first 500 chars): ${body.substring(0, 500)}`);
            }

            return { streams };
        } catch (error) {
            console.log('❌ Stream extraction error:', error.message);
            console.log('   Stack:', error.stack);
            return { streams: [] };
        }
    }

    // ContentX Source (Pichive için) - TAM VERSİYON (Altyazı/Audio Track desteği)
    if (purpose === 'contentx_source') {
        try {
            console.log(`\n📦 [ContentX Source] Body length: ${body.length}`);
            console.log(`📦 [ContentX Source] Body preview: ${body.substring(0, 300)}`);
            console.log(`📦 [ContentX Source] Request URL: ${url}`);
            console.log(`📦 [ContentX Source] Referer: ${metadata?.iframeUrl || 'none'}`);

            // ⚡ Cloudflare/Bot detection kontrolü
            if ((body.includes('Attention Required') && body.includes('Cloudflare')) ||
                body.includes('Just a moment...') ||
                (body.length < 200 && body.includes('<!DOCTYPE html>'))) {
                console.log('   ⚠️ Bot detection / Cloudflare detected in source2.php');

                // Eğer zaten WebView denediyse, sonsuz döngüyü önle
                if (metadata?.webViewAttempted) {
                    console.log('   ❌ Cloudflare bypass failed after WebView attempt - giving up');
                    return { streams: [] };
                }

                console.log('   🔄 Requesting WebView retry for source2.php...');

                // WebView ile tekrar dene
                const randomId = Math.random().toString(36).substring(2, 10);
                return {
                    instructions: [{
                        requestId: `dizist-source2-webview-${Date.now()}-${randomId}`,
                        purpose: 'contentx_source',  // AYNI purpose
                        url: url,  // AYNI URL
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json, text/plain, */*',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': metadata?.iframeUrl || url,
                            'Origin': metadata?.domain || new URL(url).origin
                        },
                        forceWebView: true,  // ⚡ WebView ile tekrar dene
                        allowInsecure: true,
                        metadata: {
                            ...metadata,
                            webViewAttempted: true,  // ⚡ Sonsuz döngü önleme
                            waitTime: 5000  // 5 saniye bekle (JavaScript için)
                        }
                    }]
                };
            }

            // Ana stream için M3U8 linkini bul
            let m3uLink = null;

            // ⚡ WebView bazen JSON'ı HTML içinde döndürüyor - temizle
            let cleanBody = body;
            if (body.includes('<pre') && body.includes('</pre>')) {
                const preMatch = body.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
                if (preMatch && preMatch[1]) {
                    cleanBody = preMatch[1].trim();
                    console.log(`📦 [ContentX Source] Extracted JSON from <pre> tag`);
                }
            }

            try {
                const jsonData = JSON.parse(cleanBody);
                console.log(`📦 [ContentX Source] JSON parsed successfully`);
                console.log(`📦 [ContentX Source] JSON keys: ${Object.keys(jsonData).join(', ')}`);
                console.log(`📦 [ContentX Source] Full JSON: ${JSON.stringify(jsonData)}`);

                // State kontrolü - eğer false ise hata ver
                if (jsonData.state === false) {
                    console.log(`❌ [ContentX Source] Video state is false - link may be expired or invalid`);
                    if (jsonData.expired === true) {
                        console.log(`⏱️ [ContentX Source] Video link has expired`);
                    }

                    // ⚡ Eğer WebView denenmemişse, WebView ile tekrar dene (bot detection olabilir)
                    if (!metadata?.webViewAttempted) {
                        console.log(`   🔄 State false - maybe bot detection? Trying WebView...`);

                        const randomId = Math.random().toString(36).substring(2, 10);
                        return {
                            instructions: [{
                                requestId: `dizist-state-false-webview-${Date.now()}-${randomId}`,
                                purpose: 'contentx_source',
                                url: url,
                                method: 'GET',
                                headers: {
                                    'Accept': 'application/json, text/plain, */*',
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                    'Referer': metadata?.iframeUrl || url,
                                    'Origin': metadata?.domain || new URL(url).origin
                                },
                                forceWebView: true,
                                allowInsecure: true,
                                metadata: {
                                    ...metadata,
                                    webViewAttempted: true,
                                    waitTime: 5000
                                }
                            }]
                        };
                    }

                    return { streams: [] };
                }

                // Kotlin'deki gibi playlist[0].sources[0].file path'ini kontrol et
                if (jsonData.playlist &&
                    jsonData.playlist[0] &&
                    jsonData.playlist[0].sources &&
                    jsonData.playlist[0].sources[0] &&
                    jsonData.playlist[0].sources[0].file) {
                    m3uLink = jsonData.playlist[0].sources[0].file;
                    console.log(`📦 [ContentX Source] Found file in playlist: ${m3uLink.substring(0, 100)}...`);
                }
                // Fallback: direkt file field'ı
                else if (jsonData.file) {
                    m3uLink = jsonData.file;
                    console.log(`📦 [ContentX Source] Found file in JSON root: ${m3uLink.substring(0, 100)}...`);
                }
            } catch (e) {
                console.log(`📦 [ContentX Source] Not JSON, trying regex...`);
            }

            // Eğer JSON'dan bulunamadıysa regex ile dene
            if (!m3uLink) {
                const fileMatch = body.match(/file":"([^"]+)"/);
                if (fileMatch) {
                    m3uLink = fileMatch[1].replace(/\\/g, '');
                    console.log(`📦 [ContentX Source] Found file via regex: ${m3uLink.substring(0, 100)}...`);
                }
            }

            if (m3uLink) {
                const extractorName = metadata?.extractorName || 'Pichive';
                const streamName = metadata?.streamName || 'Dizist';

                console.log(`✅ ${extractorName} stream found`);
                console.log(`   M3U8 URL type: ${m3uLink.includes('m.php') ? 'm.php (proxy)' : 'direct M3U8'}`);

                // Altyazıları bul
                const subtitles = [];

                // Önce iframe'den gelen altyazıları ekle
                if (metadata?.iframeSubtitles && Array.isArray(metadata.iframeSubtitles)) {
                    subtitles.push(...metadata.iframeSubtitles);
                    console.log(`   📝 ${metadata.iframeSubtitles.length} altyazı iframe'den alındı`);
                }

                // Sonra source2.php'den gelen altyazıları ekle
                const subUrls = new Set(subtitles.map(s => s.url));

                // JSON parse ile dene (daha güvenilir)
                try {
                    const jsonData = JSON.parse(body);
                    const tracks = jsonData.playlist?.[0]?.tracks || [];

                    console.log(`   🔍 Tracks array length: ${tracks.length}`);

                    for (const track of tracks) {
                        console.log(`   🔍 Processing track: ${track.kind} - ${track.label}`);

                        if (track.kind === 'captions' && track.file && track.label) {
                            const subUrlRaw = track.file;
                            const subLangRaw = track.label;

                            // URL temizleme
                            const subUrl = subUrlRaw
                                .replace(/\\\//g, '/')
                                .replace(/\\u0026/g, '&')
                                .replace(/\\/g, '');

                            // Dil temizleme (Türkçe karakterler)
                            const subLang = subLangRaw
                                .replace(/\\u0131/g, 'ı')
                                .replace(/\\u0130/g, 'İ')
                                .replace(/\\u00fc/g, 'ü')
                                .replace(/\\u00e7/g, 'ç')
                                .replace(/\\u011f/g, 'ğ')
                                .replace(/\\u015f/g, 'ş');

                            const keywords = ['tur', 'tr', 'türkçe', 'turkce'];
                            const language = subLang.includes('Forced') ? 'Turkish Forced' :
                                keywords.some(k => subLang.toLowerCase().includes(k)) ? 'Turkish' : subLang;

                            const finalSubUrl = subUrl.startsWith('http') ? subUrl : `https:${subUrl}`;

                            // Duplicate kontrolü
                            if (!subUrls.has(finalSubUrl)) {
                                subUrls.add(finalSubUrl);
                                console.log(`   ✅ Added subtitle: ${language}`);
                                subtitles.push({
                                    id: language.toLowerCase().replace(/\s+/g, '_'),
                                    url: finalSubUrl,
                                    lang: language
                                });
                            }
                        }
                    }

                    if (subtitles.length > 0) {
                        console.log(`   📝 Toplam ${subtitles.length} altyazı bulundu`);
                    } else {
                        console.log(`   ℹ️ Hiç altyazı bulunamadı`);
                    }
                } catch (e) {
                    console.log(`   ℹ️ JSON parse error for subtitles, trying regex...`);

                    // Kotlin'deki regex pattern
                    const trackRegex = /"file":"((?:\\"|[^"])+)","label":"((?:\\"|[^"])+)"/g;
                    let trackMatch;

                    while ((trackMatch = trackRegex.exec(body)) !== null) {
                        const subUrlRaw = trackMatch[1];
                        const subLangRaw = trackMatch[2];

                        // URL temizleme
                        const subUrl = subUrlRaw
                            .replace(/\\\//g, '/')
                            .replace(/\\u0026/g, '&')
                            .replace(/\\/g, '');

                        // Dil temizleme
                        const subLang = subLangRaw
                            .replace(/\\u0131/g, 'ı')
                            .replace(/\\u0130/g, 'İ')
                            .replace(/\\u00fc/g, 'ü')
                            .replace(/\\u00e7/g, 'ç')
                            .replace(/\\u011f/g, 'ğ')
                            .replace(/\\u015f/g, 'ş');

                        const keywords = ['tur', 'tr', 'türkçe', 'turkce'];
                        const language = subLang.includes('Forced') ? 'Turkish Forced' :
                            keywords.some(k => subLang.toLowerCase().includes(k)) ? 'Turkish' : subLang;

                        const finalSubUrl = subUrl.startsWith('http') ? subUrl : `https:${subUrl}`;

                        if (!subUrls.has(finalSubUrl)) {
                            subUrls.add(finalSubUrl);
                            subtitles.push({
                                id: language.toLowerCase().replace(/\s+/g, '_'),
                                url: finalSubUrl,
                                lang: language
                            });
                        }
                    }
                }

                // Stream object'i oluştur
                const m3u8Origin = new URL(m3uLink).origin;
                const iframeReferer = metadata?.iframeUrl || url;

                const streamHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': iframeReferer,
                    'Origin': m3u8Origin
                };

                const streamObject = {
                    name: streamName,
                    title: streamName,
                    url: m3uLink,
                    behaviorHints: {
                        notWebReady: false,
                        proxyHeaders: {
                            request: streamHeaders
                        }
                    }
                };

                // Altyazıları ekle (varsa)
                if (subtitles.length > 0) {
                    streamObject.subtitles = subtitles;
                    console.log(`✅ Stream + ${subtitles.length} altyazı döndürülüyor`);
                }

                return {
                    streams: [streamObject]
                };
            }

            console.log('❌ No file found in ContentX source');
            return { streams: [] };
        } catch (error) {
            console.log('❌ ContentX source error:', error.message);
            console.log('   Stack:', error.stack);
            return { streams: [] };
        }
    }

    // Player Source (window.openPlayer için)
    if (purpose === 'player_source') {
        try {
            console.log(`\n📦 [PLAYER SOURCE] Yanıt işleniyor...`);
            console.log(`   Body length: ${body.length}`);

            let m3uUrl = null;

            // JSON yanıt kontrolü
            try {
                const jsonData = JSON.parse(body);
                console.log(`   ✅ JSON parsed, keys: ${Object.keys(jsonData).join(', ')}`);

                // Farklı JSON yapıları için kontrol
                if (jsonData.playlist && jsonData.playlist[0] && jsonData.playlist[0].sources) {
                    m3uUrl = jsonData.playlist[0].sources[0].file;
                } else if (jsonData.file) {
                    m3uUrl = jsonData.file;
                } else if (jsonData.source) {
                    m3uUrl = jsonData.source;
                } else if (jsonData.url) {
                    m3uUrl = jsonData.url;
                }
            } catch (e) {
                console.log(`   ℹ️ Not JSON, trying regex...`);
            }

            // Regex ile dene
            if (!m3uUrl) {
                const fileMatch = body.match(/file["']?\s*:\s*["']([^"']+)["']/i);
                if (fileMatch) {
                    m3uUrl = fileMatch[1].replace(/\\/g, '');
                }
            }

            if (m3uUrl) {
                console.log(`✅ M3U8 bulundu: ${m3uUrl.substring(0, 80)}...`);

                const streamName = metadata?.streamName || 'Dizist';
                const streams = [{
                    name: streamName,
                    title: streamName,
                    url: m3uUrl,
                    behaviorHints: {
                        notWebReady: false,
                        proxyHeaders: {
                            request: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': url,
                                'Origin': new URL(url).origin
                            }
                        }
                    }
                }];

                return { streams };
            }

            console.log('❌ No file found in player source');
            return { streams: [] };
        } catch (error) {
            console.log('❌ Player source error:', error.message);
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

