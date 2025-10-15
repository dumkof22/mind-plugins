const cheerio = require('cheerio');
const crypto = require('crypto');

// Manifest tanımı
const manifest = {
    id: 'community.dizibox',
    version: '2.0.0',
    name: 'DiziBox',
    description: 'Türkçe dizi izleme platformu - DiziBox için Stremio eklentisi (Instruction Mode)',
    resources: ['catalog', 'meta', 'stream'],
    types: ['series'],
    catalogs: [
        {
            type: 'series',
            id: 'dizibox_yerli',
            name: 'Yerli Diziler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizibox_archive',
            name: 'Dizi Arşivi',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizibox_action',
            name: 'Aksiyon',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizibox_drama',
            name: 'Drama',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizibox_comedy',
            name: 'Komedi',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizibox_scifi',
            name: 'Bilimkurgu',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizibox_thriller',
            name: 'Gerilim',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizibox_fantasy',
            name: 'Fantastik',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizibox_crime',
            name: 'Suç',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizibox_search',
            name: 'Dizi Ara',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['dizibox']
};

const BASE_URL = 'https://www.dizibox.live';

// DiziBox için özel cookies
const DIZIBOX_COOKIES = {
    'LockUser': 'true',
    'isTrustedUser': 'true',
    'dbxu': '1743289650198'
};

// Basit ve çalışan browser headers (fazla header eklemek anti-bot'u tetikler)
function getDefaultHeaders(referer = BASE_URL) {
    return {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer,
        'Cookie': Object.entries(DIZIBOX_COOKIES).map(([k, v]) => `${k}=${v}`).join('; ')
    };
}

// Katalog URL'lerini dinamik olarak al
function getCatalogUrls() {
    return {
        'dizibox_yerli': `${BASE_URL}/ulke/turkiye`,
        'dizibox_archive': `${BASE_URL}/dizi-arsivi/page/SAYFA/`,
        'dizibox_action': `${BASE_URL}/tur/aksiyon/page/SAYFA`,
        'dizibox_drama': `${BASE_URL}/tur/drama/page/SAYFA`,
        'dizibox_comedy': `${BASE_URL}/tur/komedi/page/SAYFA`,
        'dizibox_scifi': `${BASE_URL}/tur/bilimkurgu/page/SAYFA`,
        'dizibox_thriller': `${BASE_URL}/tur/gerilim/page/SAYFA`,
        'dizibox_fantasy': `${BASE_URL}/tur/fantastik/page/SAYFA`,
        'dizibox_crime': `${BASE_URL}/tur/suc/page/SAYFA`
    };
}

// CryptoJS AES Decrypt (DiziBox king.php player için)
function cryptoJSDecrypt(password, cipherText) {
    try {
        const ctBytes = Buffer.from(cipherText, 'base64');

        // "Salted__" prefix'i kontrol et
        const saltBytes = ctBytes.slice(8, 16);
        const cipherTextBytes = ctBytes.slice(16);

        // Key ve IV türet (EVP_KDF)
        const keySize = 32; // 256 bit
        const ivSize = 16;  // 128 bit

        const passwordBytes = Buffer.from(password, 'utf8');
        const derivedBytes = evpKDF(passwordBytes, saltBytes, keySize + ivSize);

        const key = derivedBytes.slice(0, keySize);
        const iv = derivedBytes.slice(keySize, keySize + ivSize);

        // AES-256-CBC decrypt
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(cipherTextBytes);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8');
    } catch (error) {
        console.log('❌ CryptoJS decrypt error:', error.message);
        return null;
    }
}

// EVP_KDF implementasyonu (CryptoJS uyumlu)
function evpKDF(password, salt, keySize) {
    const md5Hashes = [];
    let digest = Buffer.alloc(0);

    while (Buffer.concat(md5Hashes).length < keySize) {
        const hash = crypto.createHash('md5');
        hash.update(digest);
        hash.update(password);
        hash.update(salt);
        digest = hash.digest();
        md5Hashes.push(digest);
    }

    return Buffer.concat(md5Hashes).slice(0, keySize);
}

// wmode=opaque parametresi ekle (Kotlin kodundaki gibi)
function addWmodeOpaque(url) {
    if (url.includes('/player/king/king.php')) {
        return url.replace('king.php?v=', 'king.php?wmode=opaque&v=');
    } else if (url.includes('/player/moly/moly.php')) {
        return url.replace('moly.php?h=', 'moly.php?wmode=opaque&h=');
    } else if (url.includes('/player/haydi.php')) {
        return url.replace('haydi.php?v=', 'haydi.php?wmode=opaque&v=');
    }
    return url;
}

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [DiziBox Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const searchQuery = args.extra?.search;
    const skip = parseInt(args.extra?.skip || '0');
    const page = Math.floor(skip / 20) + 1;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalog
    if (catalogId === 'dizibox_search') {
        if (!searchQuery) {
            console.log('⚠️ Search kataloğu için search parametresi gerekli');
            return { metas: [] };
        }

        const requestId = `dizibox-search-${Date.now()}-${randomId}`;
        return {
            instructions: [{
                requestId,
                purpose: 'catalog-search',
                url: `${BASE_URL}/?s=${encodeURIComponent(searchQuery)}`,
                method: 'GET',
                headers: getDefaultHeaders(BASE_URL),
                metadata: { catalogId }
            }]
        };
    }

    // Normal catalogs
    const catalogUrls = getCatalogUrls();
    let url = catalogUrls[catalogId];

    if (!url) {
        console.log(`Katalog URL bulunamadı: ${catalogId}`);
        return { instructions: [] };
    }

    // Sayfa numarasını değiştir
    url = url.replace('SAYFA', page.toString());

    const requestId = `dizibox-catalog-${catalogId}-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: url,
            method: 'GET',
            headers: getDefaultHeaders(BASE_URL),
            metadata: { catalogId }
        }]
    };
}

async function handleMeta(args) {
    const urlBase64 = args.id.replace('dizibox:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`📺 [DiziBox Meta] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `dizibox-meta-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: url,
            method: 'GET',
            headers: getDefaultHeaders(BASE_URL)
        }]
    };
}

async function handleStream(args) {
    const urlBase64 = args.id.replace('dizibox:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`🎬 [DiziBox Stream] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `dizibox-stream-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: url,
            method: 'GET',
            headers: getDefaultHeaders(url)
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

// Dizi parse etme fonksiyonu
function parseSeriesItem($, elem) {
    try {
        const title = $(elem).find('a').text().trim();
        if (!title) return null;

        const href = $(elem).find('a').attr('href');
        if (!href) return null;

        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

        // Poster URL - data-src veya src
        let posterUrl = $(elem).find('img').attr('data-src');
        if (!posterUrl) {
            posterUrl = $(elem).find('img').attr('src');
        }

        const id = 'dizibox:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

        return {
            id: id,
            type: 'series',
            name: title,
            poster: posterUrl || null
        };
    } catch (e) {
        return null;
    }
}

async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata, status } = fetchResult;

    console.log(`\n⚙️ [DiziBox Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    // HTTP hata kontrolü
    if (status && status !== 200) {
        console.log(`❌ [HTTP Error ${status}] Purpose: ${purpose}`);
        console.log(`   Returning empty result for purpose: ${purpose}`);

        if (purpose === 'catalog' || purpose === 'catalog-search') {
            console.log(`   → Returning empty metas array`);
            return { metas: [] };
        } else if (purpose === 'meta' || purpose === 'season-episodes') {
            console.log(`   → Returning null meta`);
            return { meta: null };
        } else if (purpose.includes('stream') || purpose.includes('iframe') || purpose.includes('decrypt')) {
            console.log(`   → Returning empty streams array`);
            return { streams: [] };
        }

        console.log(`   → Returning error object`);
        return { ok: false, error: `HTTP ${status}` };
    }

    if (purpose === 'catalog-search' || purpose === 'catalog') {
        const $ = cheerio.load(body);
        const metas = [];
        const catalogId = metadata?.catalogId;

        // Dizi Arşivi için özel selector
        if (catalogId === 'dizibox_archive' || purpose === 'catalog-search') {
            $('article.detailed-article').each((i, elem) => {
                const meta = parseSeriesItem($, elem);
                if (meta) metas.push(meta);
            });
        }

        // Eğer bulunamadıysa normal poster selector'ı dene
        if (metas.length === 0) {
            $('article.article-series-poster').each((i, elem) => {
                const meta = parseSeriesItem($, elem);
                if (meta) metas.push(meta);
            });
        }

        // Hala bulunamadıysa tüm article'ları dene
        if (metas.length === 0) {
            $('article').each((i, elem) => {
                const meta = parseSeriesItem($, elem);
                if (meta) metas.push(meta);
            });
        }

        console.log(`✅ Found ${metas.length} items in catalog`);
        return { metas };
    }

    if (purpose === 'meta') {
        const $ = cheerio.load(body);

        const title = $('div.tv-overview h1 a').text().trim();
        if (!title) {
            console.log('❌ Dizi başlığı bulunamadı');
            return { meta: null };
        }

        // Poster - birden fazla selector dene
        let poster = $('div.tv-overview figure img').attr('src');
        if (!poster) poster = $('div.tv-overview img').first().attr('src');
        if (!poster) poster = $('figure.poster img').attr('src');
        if (!poster) poster = $('img.poster').attr('src');
        if (!poster) poster = $('meta[property="og:image"]').attr('content');

        // Poster URL'sini tam URL'ye çevir
        if (poster && !poster.startsWith('http')) {
            poster = poster.startsWith('/') ? `${BASE_URL}${poster}` : `${BASE_URL}/${poster}`;
        }

        console.log(`   Poster URL: ${poster || 'YOK'}`);

        const description = $('div.tv-story p').text().trim();

        // Yapım yılı
        let year = null;
        const yearLink = $('a[href*="/yil/"]').first();
        if (yearLink.length) {
            year = parseInt(yearLink.text().trim());
        }

        // Türler
        const tags = [];
        $('a[href*="/tur/"]').each((i, elem) => {
            tags.push($(elem).text().trim());
        });

        // IMDB puanı
        let imdbRating = null;
        const ratingElem = $('span.label-imdb b');
        if (ratingElem.length) {
            const rating = parseFloat(ratingElem.text().trim());
            if (!isNaN(rating)) {
                imdbRating = rating.toString();
            }
        }

        // Oyuncular
        const cast = [];
        $('a[href*="/oyuncu/"]').each((i, elem) => {
            cast.push($(elem).text().trim());
        });

        // Önce ana sayfadaki bölümleri topla (bazı dizilerde doğrudan listeleniyor)
        const videos = [];
        $('article.grid-box').each((i, elem) => {
            const epTitle = $(elem).find('div.post-title a').first().text().trim();
            const epHref = $(elem).find('div.post-title a').first().attr('href');

            if (epTitle && epHref) {
                // Sezon ve bölüm numaralarını parse et
                const seasonMatch = epTitle.match(/(\d+)\.\s*Sezon/i);
                const episodeMatch = epTitle.match(/(\d+)\.\s*Bölüm/i);

                const season = seasonMatch ? parseInt(seasonMatch[1]) : 1;
                const episode = episodeMatch ? parseInt(episodeMatch[1]) : null;

                const fullEpUrl = epHref.startsWith('http') ? epHref : `${BASE_URL}${epHref}`;
                const videoId = 'dizibox:' + Buffer.from(fullEpUrl).toString('base64').replace(/=/g, '');

                videos.push({
                    id: videoId,
                    title: epTitle,
                    season: season,
                    episode: episode
                });
            }
        });

        console.log(`   Ana sayfada ${videos.length} bölüm bulundu`);

        // Sezon linklerini topla
        const seasonLinks = [];
        $('div#seasons-list a').each((i, elem) => {
            const seasonUrl = $(elem).attr('href');
            if (seasonUrl) {
                const fullSeasonUrl = seasonUrl.startsWith('http') ? seasonUrl : `${BASE_URL}${seasonUrl}`;
                seasonLinks.push(fullSeasonUrl);
            }
        });

        console.log(`   ${seasonLinks.length} sezon linki bulundu, bölümler için instruction oluşturuluyor...`);

        if (seasonLinks.length > 0) {
            // Sezon sayfalarını fetch etmek için instructions döndür
            const instructions = [];
            for (let i = 0; i < seasonLinks.length; i++) {
                const randomId = Math.random().toString(36).substring(2, 10);
                const requestId = `dizibox-season-${Date.now()}-${randomId}-${i}`;

                instructions.push({
                    requestId,
                    purpose: 'season-episodes',
                    url: seasonLinks[i],
                    method: 'GET',
                    headers: getDefaultHeaders(url),
                    metadata: {
                        seriesUrl: url,
                        seriesTitle: title,
                        poster: poster
                    }
                });
            }

            const partialMeta = {
                id: 'dizibox:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                type: 'series',
                name: title,
                poster: poster || null,
                background: poster || null,
                description: description || 'Açıklama mevcut değil',
                releaseInfo: year ? year.toString() : null,
                imdbRating: imdbRating,
                genres: tags.length > 0 ? tags : undefined,
                cast: cast.length > 0 ? cast : undefined,
                videos: videos // Ana sayfada bulunan bölümleri ekle
            };

            console.log(`📋 [Meta Response] Returning ${instructions.length} instruction(s) + partialMeta`);
            console.log(`   PartialMeta has ${videos.length} videos from main page`);

            return {
                instructions,
                partialMeta: partialMeta
            };
        }

        // Sezon yoksa ana sayfadaki bölümlerle meta döndür
        console.log(`📋 [Meta Response] No season links, returning complete meta`);
        console.log(`   Meta has ${videos.length} videos from main page`);

        return {
            meta: {
                id: 'dizibox:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                type: 'series',
                name: title,
                poster: poster || null,
                background: poster || null,
                description: description || 'Açıklama mevcut değil',
                releaseInfo: year ? year.toString() : null,
                imdbRating: imdbRating,
                genres: tags.length > 0 ? tags : undefined,
                cast: cast.length > 0 ? cast : undefined,
                videos: videos // Ana sayfadaki bölümler
            }
        };
    }

    if (purpose === 'season-episodes') {
        const $ = cheerio.load(body);
        const videos = [];

        console.log('   Sezon bölümleri parse ediliyor...');

        $('article.grid-box').each((i, elem) => {
            const epTitle = $(elem).find('div.post-title a').text().trim();
            const epHref = $(elem).find('div.post-title a').attr('href');

            if (epTitle && epHref) {
                // Sezon ve bölüm numaralarını parse et
                const seasonMatch = epTitle.match(/(\d+)\.\s*Sezon/i);
                const episodeMatch = epTitle.match(/(\d+)\.\s*Bölüm/i);

                const season = seasonMatch ? parseInt(seasonMatch[1]) : 1;
                const episode = episodeMatch ? parseInt(episodeMatch[1]) : null;

                const fullEpUrl = epHref.startsWith('http') ? epHref : `${BASE_URL}${epHref}`;
                const videoId = 'dizibox:' + Buffer.from(fullEpUrl).toString('base64').replace(/=/g, '');

                videos.push({
                    id: videoId,
                    title: epTitle,
                    season: season,
                    episode: episode
                });
            }
        });

        console.log(`   ${videos.length} bölüm bulundu`);

        // Meta formatında döndür - Stremio otomatik birleştirecek
        const seriesTitle = metadata?.seriesTitle || 'Dizi';
        const seriesUrl = metadata?.seriesUrl || url;
        const poster = metadata?.poster;

        const meta = {
            id: 'dizibox:' + Buffer.from(seriesUrl).toString('base64').replace(/=/g, ''),
            type: 'series',
            name: seriesTitle,
            poster: poster || null,
            videos: videos
        };

        console.log(`📋 [Season-Episodes Response] Returning meta with ${videos.length} videos`);
        console.log(`   Meta ID: ${meta.id.substring(0, 40)}...`);

        return { meta };
    }

    if (purpose === 'stream') {
        const $ = cheerio.load(body);
        const streams = [];

        console.log('\n🎬 [STREAM DETECTION] DiziBox stream aranıyor...');

        // Ana video iframe'ini bul
        let iframeSrc = $('div#video-area iframe').attr('src');

        if (!iframeSrc) {
            console.log('❌ Ana iframe bulunamadı');
            return { streams: [] };
        }

        let mainIframeUrl = iframeSrc.startsWith('http') ? iframeSrc : `${BASE_URL}${iframeSrc}`;

        // wmode=opaque parametresi ekle (Kotlin kodundaki gibi)
        mainIframeUrl = addWmodeOpaque(mainIframeUrl);

        console.log(`✅ Ana iframe bulundu: ${mainIframeUrl.substring(0, 80)}...`);

        const instructions = [];
        const randomId = Math.random().toString(36).substring(2, 10);

        // Ana iframe'i işle
        instructions.push({
            requestId: `dizibox-iframe-${Date.now()}-${randomId}`,
            purpose: 'iframe-extract',
            url: mainIframeUrl,
            method: 'GET',
            headers: getDefaultHeaders(url),
            metadata: {
                originalUrl: url,
                streamName: 'DiziBox Server 1'
            }
        });

        // Alternatif sunucuları bul
        let altServerIndex = 2;
        $('div.video-toolbar option[value]').each((i, elem) => {
            const altUrl = $(elem).attr('value');
            if (altUrl && altUrl !== url) {
                const fullAltUrl = altUrl.startsWith('http') ? altUrl : `${BASE_URL}${altUrl}`;

                // Alternatif sunucu sayfasını fetch et (Kotlin kodundaki gibi)
                instructions.push({
                    requestId: `dizibox-alt-page-${Date.now()}-${randomId}-${i}`,
                    purpose: 'alternative-page',
                    url: fullAltUrl,
                    method: 'GET',
                    headers: getDefaultHeaders(url),
                    metadata: {
                        originalUrl: url,
                        streamName: `DiziBox Server ${altServerIndex++}`
                    }
                });
            }
        });

        console.log(`📊 Toplam ${instructions.length} iframe instruction oluşturuldu`);
        return { instructions };
    }

    // Alternatif sunucu sayfasından iframe çıkar (Kotlin kodundaki gibi)
    if (purpose === 'alternative-page') {
        const $ = cheerio.load(body);
        const streamName = metadata?.streamName || 'DiziBox';
        const originalUrl = metadata?.originalUrl || url;

        console.log(`\n🔄 [ALTERNATIVE PAGE] ${streamName} işleniyor...`);
        console.log(`   URL: ${url.substring(0, 80)}...`);

        // Alternatif sayfadan iframe'i çıkar
        let iframeSrc = $('div#video-area iframe').attr('src');

        if (!iframeSrc) {
            console.log('   ❌ Alternatif sayfada iframe bulunamadı');
            return { streams: [] };
        }

        let iframeUrl = iframeSrc.startsWith('http') ? iframeSrc : `${BASE_URL}${iframeSrc}`;

        // wmode=opaque parametresi ekle
        iframeUrl = addWmodeOpaque(iframeUrl);

        console.log(`   ✅ Alternatif iframe bulundu: ${iframeUrl.substring(0, 80)}...`);

        const randomId = Math.random().toString(36).substring(2, 10);
        return {
            instructions: [{
                requestId: `dizibox-alt-iframe-${Date.now()}-${randomId}`,
                purpose: 'iframe-extract',
                url: iframeUrl,
                method: 'GET',
                headers: getDefaultHeaders(url),
                metadata: {
                    originalUrl: originalUrl,
                    streamName: streamName
                }
            }]
        };
    }

    if (purpose === 'iframe-extract') {
        const $ = cheerio.load(body);
        const streams = [];
        const streamName = metadata?.streamName || 'DiziBox';
        const originalUrl = metadata?.originalUrl || url;

        console.log(`\n🔍 [IFRAME EXTRACT] ${streamName} işleniyor...`);
        console.log(`   URL: ${url.substring(0, 80)}...`);

        // King player kontrolü (/player/king/king.php)
        if (url.includes('/player/king/king.php')) {
            console.log('   🔑 King player tespit edildi');

            // İçteki iframe'i bul
            const subIframe = $('div#Player iframe').attr('src');
            if (!subIframe) {
                console.log('   ❌ King player içinde iframe bulunamadı');
                return { streams };
            }

            const subIframeUrl = subIframe.startsWith('http') ? subIframe : `${BASE_URL}${subIframe}`;
            console.log(`   Sub-iframe bulundu: ${subIframeUrl.substring(0, 80)}...`);

            // Sub-iframe'i fetch et
            const randomId = Math.random().toString(36).substring(2, 10);
            return {
                instructions: [{
                    requestId: `dizibox-king-sub-${Date.now()}-${randomId}`,
                    purpose: 'king-decrypt',
                    url: subIframeUrl,
                    method: 'GET',
                    headers: getDefaultHeaders(url),
                    metadata: { streamName }
                }]
            };
        }

        // Moly player kontrolü (/player/moly/moly.php)
        if (url.includes('/player/moly/moly.php')) {
            console.log('   🔑 Moly player tespit edildi');

            // Base64 decode dene
            const atobMatch = body.match(/unescape\("(.*)"\)/);
            if (atobMatch) {
                try {
                    const decodedUri = decodeURIComponent(atobMatch[1]);
                    const decodedBase64 = Buffer.from(decodedUri, 'base64').toString('utf-8');
                    const decoded$ = cheerio.load(decodedBase64);

                    const subIframe = decoded$('div#Player iframe').attr('src');
                    if (subIframe) {
                        console.log('   ✅ Moly decoded, sub-iframe bulundu');

                        const randomId = Math.random().toString(36).substring(2, 10);
                        return {
                            instructions: [{
                                requestId: `dizibox-moly-sub-${Date.now()}-${randomId}`,
                                purpose: 'iframe-stream',
                                url: subIframe,
                                method: 'GET',
                                headers: getDefaultHeaders(url),
                                metadata: { streamName }
                            }]
                        };
                    }
                } catch (e) {
                    console.log('   ❌ Moly decode hatası:', e.message);
                }
            }

            // Decode olmadan iframe bul
            const subIframe = $('div#Player iframe').attr('src');
            if (subIframe) {
                const randomId = Math.random().toString(36).substring(2, 10);
                return {
                    instructions: [{
                        requestId: `dizibox-moly-direct-${Date.now()}-${randomId}`,
                        purpose: 'iframe-stream',
                        url: subIframe,
                        method: 'GET',
                        headers: getDefaultHeaders(url),
                        metadata: { streamName }
                    }]
                };
            }
        }

        // Haydi player kontrolü (/player/haydi.php)
        if (url.includes('/player/haydi.php')) {
            console.log('   🔑 Haydi player tespit edildi');

            // Base64 decode dene
            const atobMatch = body.match(/unescape\("(.*)"\)/);
            if (atobMatch) {
                try {
                    const decodedUri = decodeURIComponent(atobMatch[1]);
                    const decodedBase64 = Buffer.from(decodedUri, 'base64').toString('utf-8');
                    const decoded$ = cheerio.load(decodedBase64);

                    const subIframe = decoded$('div#Player iframe').attr('src');
                    if (subIframe) {
                        console.log('   ✅ Haydi decoded, sub-iframe bulundu');

                        const randomId = Math.random().toString(36).substring(2, 10);
                        return {
                            instructions: [{
                                requestId: `dizibox-haydi-sub-${Date.now()}-${randomId}`,
                                purpose: 'iframe-stream',
                                url: subIframe,
                                method: 'GET',
                                headers: getDefaultHeaders(url),
                                metadata: { streamName }
                            }]
                        };
                    }
                } catch (e) {
                    console.log('   ❌ Haydi decode hatası:', e.message);
                }
            }

            // Decode olmadan iframe bul
            const subIframe = $('div#Player iframe').attr('src');
            if (subIframe) {
                const randomId = Math.random().toString(36).substring(2, 10);
                return {
                    instructions: [{
                        requestId: `dizibox-haydi-direct-${Date.now()}-${randomId}`,
                        purpose: 'iframe-stream',
                        url: subIframe,
                        method: 'GET',
                        headers: getDefaultHeaders(url),
                        metadata: { streamName }
                    }]
                };
            }
        }

        // Genel iframe arama
        const anyIframe = $('iframe').first().attr('src');
        if (anyIframe) {
            console.log('   ℹ️ Genel iframe bulundu, stream extraction yapılıyor...');

            const randomId = Math.random().toString(36).substring(2, 10);
            return {
                instructions: [{
                    requestId: `dizibox-general-${Date.now()}-${randomId}`,
                    purpose: 'iframe-stream',
                    url: anyIframe,
                    method: 'GET',
                    headers: getDefaultHeaders(url),
                    metadata: { streamName }
                }]
            };
        }

        console.log('   ❌ Hiçbir iframe bulunamadı');
        return { streams };
    }

    if (purpose === 'king-decrypt') {
        console.log('\n🔓 [KING DECRYPT] CryptoJS decrypt işlemi...');
        const streams = [];
        const streamName = metadata?.streamName || 'DiziBox King';

        // CryptoJS encrypted data'yı bul - hem tek hem çift tırnak için
        const cryptMatch = body.match(/CryptoJS\.AES\.decrypt\(["'](.+?)["'],\s*["'](.+?)["']\)/);

        if (cryptMatch) {
            const encryptedData = cryptMatch[1];
            const password = cryptMatch[2];

            console.log(`   Encrypted data bulundu (${encryptedData.length} chars)`);
            console.log(`   Password: ${password}`);

            const decrypted = cryptoJSDecrypt(password, encryptedData);

            if (decrypted) {
                console.log('   ✅ Decrypt başarılı');

                // Decrypt edilmiş içerikte M3U8 ara - Kotlin kodundaki gibi daha esnek regex
                const fileMatch = decrypted.match(/file:\s*['"](.+?)['"]/);

                if (fileMatch) {
                    let m3uUrl = fileMatch[1];
                    console.log(`   ✅ URL bulundu: ${m3uUrl.substring(0, 80)}...`);

                    // Eğer URL direkt M3U8 ise stream olarak döndür (Kotlin: getQualityFromName("4k"))
                    if (m3uUrl.includes('.m3u8') || m3uUrl.includes('playlist.m3u8')) {
                        streams.push({
                            name: `${streamName} 📺 4K`,
                            title: `${streamName} 📺 4K`,
                            url: m3uUrl,
                            type: 'm3u8',
                            behaviorHints: {
                                notWebReady: false,
                                bingeGroup: 'dizibox-king',
                                proxyHeaders: {
                                    request: {
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                        'Referer': m3uUrl,
                                        'Origin': BASE_URL
                                    }
                                }
                            }
                        });
                    }
                    // Eğer URL bir embed/player page ise, bir kez daha fetch et
                    else if (m3uUrl.includes('/embed/') || m3uUrl.includes('/player/')) {
                        console.log('   ℹ️ URL bir player page gibi görünüyor, tekrar fetch ediliyor...');

                        const randomId = Math.random().toString(36).substring(2, 10);
                        return {
                            instructions: [{
                                requestId: `dizibox-king-player-${Date.now()}-${randomId}`,
                                purpose: 'iframe-stream',
                                url: m3uUrl,
                                method: 'GET',
                                headers: getDefaultHeaders(url),
                                metadata: { streamName }
                            }]
                        };
                    }
                    // Diğer durumlarda URL'yi direkt stream olarak döndür
                    else {
                        streams.push({
                            name: `${streamName} 📺`,
                            title: `${streamName} 📺`,
                            url: m3uUrl,
                            type: 'm3u8',
                            behaviorHints: {
                                notWebReady: false,
                                bingeGroup: 'dizibox-king',
                                proxyHeaders: {
                                    request: {
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                        'Referer': m3uUrl,
                                        'Origin': BASE_URL
                                    }
                                }
                            }
                        });
                    }
                } else {
                    console.log('   ❌ Decrypt edildi ama file: bulunamadı');
                    console.log(`   Decrypted preview: ${decrypted.substring(0, 200)}...`);
                }
            } else {
                console.log('   ❌ Decrypt başarısız');
            }
        } else {
            console.log('   ❌ CryptoJS pattern bulunamadı');
        }

        console.log(`\n📊 King player'dan ${streams.length} stream bulundu`);
        return { streams };
    }

    if (purpose === 'iframe-stream') {
        console.log('\n🔍 [IFRAME STREAM] M3U8 aranıyor...');
        const streams = [];
        const streamName = metadata?.streamName || 'DiziBox';

        // Önce body'nin kendisinin M3U8 playlist olup olmadığını kontrol et
        if (body.trim().startsWith('#EXTM3U') || body.trim().startsWith('#EXT-X-')) {
            console.log('   ✅ Body M3U8 playlist formatında!');

            // M3U8 playlist'i parse et ve URL'leri çıkar
            const lines = body.split('\n').map(line => line.trim()).filter(line => line);

            for (const line of lines) {
                // HTTP/HTTPS ile başlayan satırları bul
                if (line.startsWith('http://') || line.startsWith('https://')) {
                    console.log(`   ✅ M3U8 stream URL bulundu: ${line.substring(0, 80)}...`);

                    streams.push({
                        name: `${streamName} 📺`,
                        title: `${streamName} 📺`,
                        url: line,
                        type: 'm3u8',
                        behaviorHints: {
                            notWebReady: false,
                            bingeGroup: 'dizibox-stream',
                            proxyHeaders: {
                                request: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                    'Referer': line,
                                    'Origin': BASE_URL
                                }
                            }
                        }
                    });

                    // İlk bulduğumuz URL'i kullan (genelde en yüksek kalite)
                    break;
                }
            }

            if (streams.length > 0) {
                console.log(`\n📊 M3U8 playlist'ten ${streams.length} stream bulundu`);
                return { streams };
            }
        }

        // M3U8 URL'ini bul - daha geniş pattern'ler
        let m3uMatch = body.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/);
        if (!m3uMatch) m3uMatch = body.match(/"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
        if (!m3uMatch) m3uMatch = body.match(/source:\s*["']([^"']+\.m3u8[^"']*)["']/);
        if (!m3uMatch) m3uMatch = body.match(/src:\s*["']([^"']+\.m3u8[^"']*)["']/);
        if (!m3uMatch) m3uMatch = body.match(/playlist:\s*["']([^"']+\.m3u8[^"']*)["']/);
        if (!m3uMatch) m3uMatch = body.match(/videoUrl:\s*["']([^"']+\.m3u8[^"']*)["']/);
        if (!m3uMatch) m3uMatch = body.match(/(https?:\/\/[^\s"'<>()]+\.m3u8[^\s"'<>()]*)/);

        // Script tag'lerinde ara
        if (!m3uMatch && body.includes('.m3u8')) {
            const scriptMatches = body.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
            if (scriptMatches) {
                for (const scriptTag of scriptMatches) {
                    const scriptContent = scriptTag.replace(/<\/?script[^>]*>/gi, '');
                    if (scriptContent.includes('.m3u8')) {
                        m3uMatch = scriptContent.match(/(https?:\/\/[^\s"'<>()]+\.m3u8[^\s"'<>()]*)/);
                        if (m3uMatch) break;
                    }
                }
            }
        }

        // Embedded iframe içinde ara
        if (!m3uMatch) {
            const iframeMatch = body.match(/<iframe[^>]+src=["']([^"']+)["']/i);
            if (iframeMatch) {
                const iframeUrl = iframeMatch[1];
                if (iframeUrl.includes('.m3u8') || iframeUrl.includes('playlist')) {
                    console.log(`   ℹ️ Iframe içinde M3U8 bulundu: ${iframeUrl.substring(0, 80)}...`);
                    m3uMatch = [iframeUrl, iframeUrl];
                }
            }
        }

        if (m3uMatch) {
            let m3uUrl = m3uMatch[1] || m3uMatch[0];
            m3uUrl = m3uUrl.replace(/\\"/g, '"').replace(/\\/g, '').trim();
            m3uUrl = m3uUrl.replace(/[,;]+$/, '');

            console.log(`   ✅ M3U8 bulundu: ${m3uUrl.substring(0, 80)}...`);

            streams.push({
                name: `${streamName} 📺`,
                title: `${streamName} 📺`,
                url: m3uUrl,
                type: 'm3u8',
                behaviorHints: {
                    notWebReady: false,
                    bingeGroup: 'dizibox-stream',
                    proxyHeaders: {
                        request: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': m3uUrl,
                            'Origin': BASE_URL
                        }
                    }
                }
            });
        } else {
            console.log('   ❌ M3U8 bulunamadı');
            console.log(`   Body preview (first 500 chars): ${body.substring(0, 500)}...`);
        }

        console.log(`\n📊 Iframe'den ${streams.length} stream bulundu`);
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

