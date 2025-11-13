const cheerio = require('cheerio');
const crypto = require('crypto');
const https = require('https');

// ============ CizgiveDizi - Çizgi Film ve Dizi Platformu ============
// Kotlin eklentisinin tam JavaScript çevirisi
// Tüm extractor'lar dahil: CizgiDuo, CizgiPass, GoogleDrive, SibNet
// ====================================================================

// Manifest tanımı
const manifest = {
    id: 'community.cizgivedizi',
    version: '1.0.0',
    name: 'CizgiveDizi',
    description: 'Türkçe çizgi film ve dizi platformu - CizgiveDizi için Stremio eklentisi (Instruction Mode)',
    logo: 'https://cizgivedizi.com/Logo.png',
    resources: ['catalog', 'meta', 'stream'],
    types: ['series', 'movie'],
    catalogs: [
        {
            type: 'series',
            id: 'cizgivedizi_diziler',
            name: 'Diziler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgivedizi_cizgi_diziler',
            name: 'Çizgi Diziler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgivedizi_animeler',
            name: 'Animeler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgivedizi_yansimalar',
            name: 'Yansımalar',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgivedizi_preschool',
            name: 'Okul Öncesi',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgivedizi_belgesel',
            name: 'Belgesel',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgivedizi_komedi',
            name: 'Komedi',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgivedizi_macera',
            name: 'Macera',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'cizgivedizi_search',
            name: 'Ara',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['cizgivedizi']
};

const BASE_URL = 'https://cizgivedizi.com';

// Etiket kodları ve açıklamaları (Kotlin'deki categoryOrder)
const TAG_LABELS = {
    'çd': 'Çizgi Diziler',
    'diz': 'Diziler',
    'ani': 'Animeler',
    'yans': 'Yansımalar',
    'pro': 'Okul Öncesi',
    'bel': 'Belgesel',
    'kom': 'Komedi',
    'mac': 'Macera',
    'çi': 'Çizgi Film',
    'yi': 'Yetişkin İçerik',
    'sih': 'Sihir',
    'yem': 'Yemek',
    'sav': 'Savaş',
    'ftb': 'Futbol',
    'pemd': 'Pembe Dizi',
    'müz': 'Müzikal',
    'giz': 'Gizem',
    'kork': 'Korku',
    'eği': 'Eğitim',
    'dra': 'Drama',
    'gh': 'Gençlik',
    'tıp': 'Tıp',
    'yar': 'Yarışma',
    'aks': 'Aksiyon',
    'bilkur': 'Bilimkurgu',
    'fant': 'Fantastik',
    'spor': 'Spor',
    'polis': 'Polis',
    'doğa': 'Doğa',
    'suç': 'Suç',
    'füt': 'Fütüristik'
};

// Katalog ID -> Etiket kodu mapping
const CATALOG_TAG_MAP = {
    'cizgivedizi_diziler': 'diz',
    'cizgivedizi_cizgi_diziler': 'çd',
    'cizgivedizi_animeler': 'ani',
    'cizgivedizi_yansimalar': 'yans',
    'cizgivedizi_preschool': 'pro',
    'cizgivedizi_belgesel': 'bel',
    'cizgivedizi_komedi': 'kom',
    'cizgivedizi_macera': 'mac'
};

// Hariç tutulan etiketler (Kotlin'deki excludedTags)
const EXCLUDED_TAGS = ['lgbt'];

// Enhanced headers
function getEnhancedHeaders(referer = BASE_URL) {
    return {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'Referer': referer
    };
}

// Cloudinary image format fixer (Kotlin'deki fixImageFormat)
function fixImageFormat(url) {
    if (!url) return null;
    try {
        const encodedUrl = encodeURIComponent(url);
        return `https://res.cloudinary.com/di0j4jsa8/image/fetch/f_auto/${encodedUrl}`;
    } catch (e) {
        return url;
    }
}

// String normalizer (Kotlin'deki normalizeString)
function normalizeString(input) {
    return input
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'I')
        .replace(/Ğ/g, 'G')
        .replace(/Ü/g, 'U')
        .replace(/Ş/g, 'S')
        .replace(/Ö/g, 'O')
        .replace(/Ç/g, 'C')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\./g, ' ');
}

// URL creator (site'nin JavaScript'inden)
function urlCreate(metin) {
    const harfler = {
        "İ": "I",
        "ı": "i",
        "Ş": "S",
        "ş": "s",
        "Ğ": "G",
        "ğ": "g",
        "Ü": "U",
        "ü": "u",
        "Ö": "O",
        "ö": "o",
        "Ç": "C",
        "ç": "c",
        "/": "",
        "\\?": ""  // ? karakterini escape et
    };

    metin = metin.toLowerCase();

    for (const harf in harfler) {
        // Regex özel karakterlerini escape et
        const escapedHarf = harf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        metin = metin.replace(new RegExp(escapedHarf, 'g'), harfler[harf]);
    }

    metin = metin.replace(/ /g, "_");
    return metin;
}

// ============ HTTPS FETCH HELPER ============
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            res.setEncoding('utf8');  // Türkçe karakterler için UTF-8 encoding
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => { resolve(data); });
        }).on('error', (err) => { reject(err); });
    });
}

// ============ AES HELPER (CizgiDuo için) ============
// Kotlin'deki AesHelper.cryptoAESHandler fonksiyonu
function cryptoAESHandler(data, passphrase, encrypt = false) {
    try {
        if (encrypt) {
            // Şifreleme - şu an kullanılmıyor ama Kotlin'de var
            const cipher = crypto.createCipher('aes-256-cbc', passphrase);
            let encrypted = cipher.update(data, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            return encrypted;
        } else {
            // Şifre çözme
            const decipher = crypto.createDecipher('aes-256-cbc', passphrase);
            let decrypted = decipher.update(data, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
    } catch (error) {
        console.log('❌ AES decrypt error:', error.message);
        return null;
    }
}

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [CizgiveDizi Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalog
    if (catalogId === 'cizgivedizi_search' && searchQuery) {
        console.log(`🔍 Search query: ${searchQuery}`);
        const requestId = `cizgivedizi-search-${Date.now()}-${randomId}`;
        return {
            instructions: [{
                requestId,
                purpose: 'catalog-data',
                url: `${BASE_URL}/dizi/isim.txt`,  // İlk dosyayı çek
                method: 'GET',
                headers: {
                    ...getEnhancedHeaders(BASE_URL),
                    'Accept-Charset': 'utf-8'  // UTF-8 encoding belirt
                },
                metadata: {
                    catalogId,
                    searchQuery,
                    // Diğer dosyaların URL'leri
                    additionalUrls: {
                        poster: `${BASE_URL}/dizi/poster.txt`,
                        etiket: `${BASE_URL}/dizi/etiket.txt`
                    }
                }
            }]
        };
    }

    // Normal catalog - etiket bazlı
    const tagCode = CATALOG_TAG_MAP[catalogId];

    if (!tagCode) {
        console.log(`❌ Katalog için etiket kodu bulunamadı: ${catalogId}`);
        return { instructions: [] };
    }

    const requestId = `cizgivedizi-catalog-${catalogId}-${Date.now()}-${randomId}`;

    console.log(`   Etiket kodu: ${tagCode}`);

    // Tek instruction ile tüm dosyaları çekeceğiz
    return {
        instructions: [{
            requestId,
            purpose: 'catalog-data',
            url: `${BASE_URL}/dizi/isim.txt`,  // İlk dosyayı çek
            method: 'GET',
            headers: {
                ...getEnhancedHeaders(BASE_URL),
                'Accept-Charset': 'utf-8'  // UTF-8 encoding belirt
            },
            metadata: {
                catalogId,
                tagCode,
                // Diğer dosyaların URL'leri
                additionalUrls: {
                    poster: `${BASE_URL}/dizi/poster.txt`,
                    etiket: `${BASE_URL}/dizi/etiket.txt`
                }
            }
        }]
    };
}

async function handleMeta(args) {
    const urlBase64 = args.id.replace('cizgivedizi:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`📺 [CizgiveDizi Meta] Generating instructions for: ${url.substring(0, 80)}...`);

    // URL'i encode et (Türkçe karakterler için)
    const encodedUrl = encodeURI(url);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `cizgivedizi-meta-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: encodedUrl,
            method: 'GET',
            headers: getEnhancedHeaders(BASE_URL)
        }]
    };
}

async function handleStream(args) {
    const urlBase64 = args.id.replace('cizgivedizi:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`🎬 [CizgiveDizi Stream] Generating instructions for: ${url.substring(0, 80)}...`);

    // URL'i encode et (Türkçe karakterler için)
    const encodedUrl = encodeURI(url);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `cizgivedizi-stream-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: encodedUrl,
            method: 'GET',
            headers: getEnhancedHeaders(encodedUrl)  // Encode edilmiş URL'i referer olarak kullan
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata, status } = fetchResult;

    console.log(`\n⚙️ [CizgiveDizi Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    // HTTP hata kontrolü
    if (status && status !== 200) {
        console.log(`❌ [HTTP Error ${status}] Purpose: ${purpose}`);

        if (purpose === 'catalog') {
            return { metas: [] };
        } else if (purpose === 'meta') {
            return { meta: null };
        } else if (purpose.includes('stream')) {
            return { streams: [] };
        }

        return { ok: false, error: `HTTP ${status}` };
    }

    // Catalog - İlk dosya (isim.txt) geldi, diğer dosyaları da çek ve birleştir
    if (purpose === 'catalog-data') {
        console.log(`   📄 İsim dosyası parse ediliyor...`);

        // Body'nin encoding'ini kontrol et ve düzelt
        let fixedBody = body;


        // Eğer body Buffer ise, UTF-8 olarak decode et
        if (Buffer.isBuffer(body)) {
            fixedBody = body.toString('utf8');
        } else if (typeof body === 'string') {
            // String ise, yanlış decode edilmiş olabilir (Latin-1 -> UTF-8 fix)
            // Body'nin byte array'ini al ve UTF-8 olarak yeniden decode et
            try {
                const bytes = Buffer.from(body, 'latin1');
                fixedBody = bytes.toString('utf8');
            } catch (e) {
                console.log(`   ⚠️ Encoding fix hatası, orijinal body kullanılıyor`);
                fixedBody = body;
            }
        }

        // İsim dosyasını parse et
        const lines = fixedBody.split('\n').filter(line => line.trim().startsWith('|'));
        const isimData = {};

        for (const line of lines) {
            const match = line.match(/^\|([^=]+)=(.+)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim();
                isimData[key] = value;

                // Debug: "west" key'i için encoding kontrolü
                if (key === 'west') {
                    console.log(`   🔍 DEBUG west: "${value}"`);
                    console.log(`   🔍 Char codes:`, Array.from(value).map(c => c.charCodeAt(0).toString(16)).join(' '));
                }
            }
        }

        console.log(`   ✅ ${Object.keys(isimData).length} dizi ismi parse edildi`);

        // Diğer dosyaları da fetch et
        const additionalUrls = metadata?.additionalUrls || {};

        try {
            console.log(`   📄 Poster ve etiket dosyaları çekiliyor...`);

            const [posterBody, etiketBody] = await Promise.all([
                fetchUrl(additionalUrls.poster),
                fetchUrl(additionalUrls.etiket)
            ]);

            // Poster dosyasını parse et
            const posterData = {};
            posterBody.split('\n').filter(line => line.trim().startsWith('|')).forEach(line => {
                const match = line.match(/^\|([^=]+)=(.+)$/);
                if (match) {
                    posterData[match[1].trim()] = match[2].trim();
                }
            });

            // Etiket dosyasını parse et
            const etiketData = {};
            etiketBody.split('\n').filter(line => line.trim().startsWith('|')).forEach(line => {
                const match = line.match(/^\|([^=]+)=(.+)$/);
                if (match) {
                    etiketData[match[1].trim()] = match[2].trim();
                }
            });

            console.log(`   ✅ ${Object.keys(posterData).length} poster parse edildi`);
            console.log(`   ✅ ${Object.keys(etiketData).length} etiket parse edildi`);

            // Tüm veriyi birleştir ve filtrele
            const tagCode = metadata?.tagCode;
            const searchQuery = metadata?.searchQuery;
            const metas = [];

            for (const diziKey in isimData) {
                const diziIsim = isimData[diziKey];
                const diziPoster = posterData[diziKey];
                const diziEtiketler = (etiketData[diziKey] || '').split(';');

                // Etiket filtresi (search değilse)
                if (tagCode && !diziEtiketler.includes(tagCode)) {
                    continue;
                }

                // Search filtresi (search ise)
                if (searchQuery) {
                    const normalizedQuery = normalizeString(searchQuery.toLowerCase());
                    const normalizedTitle = normalizeString(diziIsim.toLowerCase());
                    if (!normalizedTitle.includes(normalizedQuery)) {
                        continue;
                    }
                }

                // URL oluştur - Türkçe karakterler için encode
                const diziUrlPart = urlCreate(diziIsim);
                const diziUrl = `${BASE_URL}/dizi/${diziKey}/${diziUrlPart}`;
                // Base64 encode ederken UTF-8 olarak encode et
                const id = 'cizgivedizi:' + Buffer.from(diziUrl, 'utf8').toString('base64').replace(/=/g, '');

                // Debug: "west" için URL kontrolü
                if (diziKey === 'west') {
                    console.log(`   🔍 DEBUG URL oluşturma:`);
                    console.log(`      İsim: "${diziIsim}"`);
                    console.log(`      URL Part: "${diziUrlPart}"`);
                    console.log(`      Full URL: "${diziUrl}"`);
                    console.log(`      ID (base64): "${id.substring(0, 80)}..."`);
                }

                metas.push({
                    id: id,
                    type: 'series',
                    name: diziIsim,
                    poster: fixImageFormat(diziPoster)
                });
            }

            console.log(`   ✅ ${metas.length} içerik bulundu (${tagCode || searchQuery})`);
            return { metas };

        } catch (error) {
            console.log(`   ❌ Dosya fetch hatası: ${error.message}`);
            return { metas: [] };
        }
    }

    if (purpose === 'meta') {
        const $ = cheerio.load(body);

        console.log('\n📺 [META] Dizi sayfası parse ediliyor...');

        // Başlık - .infoLine içindeki h4'ten al (asıl başlık orada)
        let title = $('.infoLine h4').first().text().trim();
        if (!title) {
            // Yoksa genel h4'ten al
            title = $('h4').first().text().trim();
        }
        if (!title) {
            // Yoksa h1'den al
            title = $('h1').first().text().trim();
        }
        if (!title || title === 'Hoş Geldiniz') {
            console.log('❌ Dizi başlığı bulunamadı veya yanlış başlık');
            return { meta: null };
        }

        console.log(`   📌 Başlık: ${title}`);

        // Poster - picture img veya ilk img
        let rawPoster = $('picture img').attr('src');
        if (!rawPoster) {
            rawPoster = $('img').first().attr('src');
        }
        if (rawPoster && !rawPoster.startsWith('http')) {
            rawPoster = rawPoster.startsWith('/') ? `${BASE_URL}${rawPoster}` : `${BASE_URL}/${rawPoster}`;
        }
        const poster = fixImageFormat(rawPoster);

        // Açıklama - p.lead etiketinden al (daha spesifik)
        let plot = $('p.lead').first().text().trim();
        if (!plot) {
            // Yoksa genel p etiketlerinden ara
            $('p').each((i, elem) => {
                const text = $(elem).text().trim();
                if (text.length > 50 && !text.includes('©') && !text.includes('Sitemize')) {
                    plot = text;
                    return false; // break
                }
            });
        }

        // Etiketler/Türler - data-bs-title attribute'larından al
        const tags = [];
        $('[data-bs-title]').each((i, elem) => {
            const tag = $(elem).attr('data-bs-title');
            if (tag && tag.length > 2 && !tags.includes(tag)) {
                tags.push(tag);
            }
        });

        // Bölümleri topla - a.bolum elementlerinden
        const videos = [];
        $('a.bolum').each((i, elem) => {
            const href = $(elem).attr('href');
            const dataSezon = $(elem).attr('data-sezon');
            // title attribute'unu al ve HTML entities'leri decode et
            let title_attr = $(elem).attr('title') || $(elem).attr('data-bs-title');

            if (!href) return;

            // URL'den bölüm numarasını çıkar
            // Format: /dizi/west/vahsi_bati/1/bolum_1
            const urlParts = href.split('/');
            const episodeNum = urlParts[urlParts.length - 2]; // Son önceki part bölüm numarası
            const episodeName = urlParts[urlParts.length - 1]; // Son part bölüm ismi

            let episode = parseInt(episodeNum);
            if (isNaN(episode)) episode = i + 1;

            let season = parseInt(dataSezon);
            if (isNaN(season) || !season) season = 1;

            // Bölüm başlığı ve açıklaması
            let epTitle = '';
            let epDescription = '';

            if (title_attr) {
                // HTML entities decode et (cheerio otomatik yapar)
                epDescription = title_attr;
                // Bölüm ismini URL'den al
                epTitle = episodeName.replace(/_/g, ' ');
                epTitle = epTitle.charAt(0).toUpperCase() + epTitle.slice(1);
            } else {
                epTitle = `${episode}. Bölüm`;
            }

            const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
            const videoId = 'cizgivedizi:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

            const videoObj = {
                id: videoId,
                title: epTitle,
                season: season,
                episode: episode
            };

            // Açıklama varsa ekle
            if (epDescription) {
                videoObj.overview = epDescription;
            }

            videos.push(videoObj);
        });

        console.log(`   ✅ ${videos.length} bölüm bulundu`);

        return {
            meta: {
                id: 'cizgivedizi:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                type: 'series',
                name: title,
                poster: poster,
                background: poster,
                description: plot || 'Açıklama mevcut değil',
                genres: tags.length > 0 ? tags : undefined,
                videos: videos
            }
        };
    }

    if (purpose === 'stream') {
        const $ = cheerio.load(body);
        const streams = [];

        console.log('\n🎬 [STREAM DETECTION] CizgiveDizi stream aranıyor...');

        // Play sayfasını veya iframe'i bul
        let playUrl = $('a[href*="/play"]').attr('href');
        if (!playUrl) {
            playUrl = $('iframe').first().attr('src');
        }

        if (!playUrl) {
            console.log('❌ Play URL veya iframe bulunamadı');
            return { streams: [] };
        }

        const fullPlayUrl = playUrl.startsWith('http') ? playUrl : `${BASE_URL}${playUrl}`;

        console.log(`✅ Play URL bulundu: ${fullPlayUrl.substring(0, 80)}...`);

        // Eğer URL zaten bir extractor URL'i ise (SibNet, CizgiDuo vb), direkt extract et
        if (fullPlayUrl.includes('video.sibnet.ru') ||
            fullPlayUrl.includes('cizgiduo.online') ||
            fullPlayUrl.includes('cizgipass') ||
            fullPlayUrl.includes('drive.google.com')) {

            console.log('🔧 Direkt extractor URL tespit edildi, işleniyor...');

            // Extractor tipini belirle
            let extractorType = 'generic';
            let serverName = 'CizgiveDizi';

            if (fullPlayUrl.includes('cizgiduo.online')) {
                extractorType = 'cizgiduo';
                serverName = 'CizgiDuo';
            } else if (fullPlayUrl.includes('cizgipass')) {
                extractorType = 'cizgipass';
                serverName = 'CizgiPass';
            } else if (fullPlayUrl.includes('drive.google.com')) {
                extractorType = 'googledrive';
                serverName = 'GdrivePlayer';
            } else if (fullPlayUrl.includes('video.sibnet.ru')) {
                extractorType = 'sibnet';
                serverName = 'SibNet';
            }

            const randomId = Math.random().toString(36).substring(2, 10);
            const encodedFullPlayUrl = encodeURI(fullPlayUrl);
            return {
                instructions: [{
                    requestId: `cizgivedizi-extract-${Date.now()}-${randomId}`,
                    purpose: 'extractor',
                    url: encodedFullPlayUrl,
                    method: 'GET',
                    headers: getEnhancedHeaders(encodedFullPlayUrl),
                    metadata: {
                        originalUrl: url,
                        extractorType: extractorType,
                        serverName: serverName
                    }
                }]
            };
        }

        // Play sayfasını fetch et
        const randomId = Math.random().toString(36).substring(2, 10);
        const encodedFullPlayUrl = encodeURI(fullPlayUrl);
        return {
            instructions: [{
                requestId: `cizgivedizi-play-${Date.now()}-${randomId}`,
                purpose: 'play-page',
                url: encodedFullPlayUrl,
                method: 'GET',
                headers: getEnhancedHeaders(encodedFullPlayUrl),
                metadata: { originalUrl: url }
            }]
        };
    }

    if (purpose === 'play-page') {
        const $ = cheerio.load(body);
        const streams = [];
        const originalUrl = metadata?.originalUrl || url;

        console.log('\n🔍 [PLAY PAGE] Extractor URL\'leri aranıyor...');

        // Tüm iframe'leri topla
        const iframes = [];
        $('iframe').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src) {
                const fullSrc = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                iframes.push(fullSrc);
            }
        });

        console.log(`   ${iframes.length} iframe bulundu`);

        if (iframes.length === 0) {
            console.log('❌ Hiçbir iframe bulunamadı');
            return { streams: [] };
        }

        // Her iframe için extraction instruction oluştur
        const instructions = [];
        for (let i = 0; i < iframes.length; i++) {
            const iframeUrl = iframes[i];
            const randomId = Math.random().toString(36).substring(2, 10);

            // Extractor tipini belirle
            let extractorType = 'generic';
            let serverName = `Server ${i + 1}`;

            if (iframeUrl.includes('cizgiduo.online')) {
                extractorType = 'cizgiduo';
                serverName = 'CizgiDuo';
            } else if (iframeUrl.includes('cizgipass')) {
                extractorType = 'cizgipass';
                serverName = 'CizgiPass';
            } else if (iframeUrl.includes('drive.google.com')) {
                extractorType = 'googledrive';
                serverName = 'GdrivePlayer';
            } else if (iframeUrl.includes('video.sibnet.ru')) {
                extractorType = 'sibnet';
                serverName = 'SibNet';
            }

            console.log(`   [${i + 1}] ${serverName}: ${iframeUrl.substring(0, 60)}...`);

            const encodedIframeUrl = encodeURI(iframeUrl);
            instructions.push({
                requestId: `cizgivedizi-extract-${Date.now()}-${randomId}-${i}`,
                purpose: 'extractor',
                url: encodedIframeUrl,
                method: 'GET',
                headers: getEnhancedHeaders(encodedIframeUrl),
                metadata: {
                    originalUrl: originalUrl,
                    extractorType: extractorType,
                    serverName: serverName
                }
            });
        }

        console.log(`📊 ${instructions.length} extractor instruction oluşturuldu`);
        return { instructions };
    }

    if (purpose === 'extractor') {
        const extractorType = metadata?.extractorType || 'generic';
        const serverName = metadata?.serverName || 'CizgiveDizi';
        const originalUrl = metadata?.originalUrl || url;

        console.log(`\n🔧 [EXTRACTOR] ${serverName} (${extractorType}) işleniyor...`);
        console.log(`   URL: ${url.substring(0, 80)}...`);

        // URL'i encode et (Türkçe karakterler için - Flutter decode etmiş olabilir)
        const encodedUrl = encodeURI(url);

        const streams = [];

        // ========== CIZGIDUO / CIZGIPASS EXTRACTOR ==========
        if (extractorType === 'cizgiduo' || extractorType === 'cizgipass') {
            console.log('   🔍 bePlayer pattern aranıyor...');

            const bePlayerMatch = body.match(/bePlayer\('([^']+)',\s*'(\{[^}]+\})'\);/);

            if (bePlayerMatch) {
                const bePlayerPass = bePlayerMatch[1];
                const bePlayerData = bePlayerMatch[2];

                console.log(`   ✅ bePlayer bulundu, şifre çözülüyor...`);
                console.log(`   Password: ${bePlayerPass}`);

                const decrypted = cryptoAESHandler(bePlayerData, Buffer.from(bePlayerPass, 'utf8'), false);

                if (decrypted) {
                    console.log('   ✅ Şifre çözme başarılı');

                    // video_location ara
                    const videoMatch = decrypted.match(/video_location":"([^"]+)/);

                    if (videoMatch) {
                        const m3uUrl = videoMatch[1].replace(/\\/g, '');
                        console.log(`   ✅ M3U8 bulundu: ${m3uUrl.substring(0, 80)}...`);

                        streams.push({
                            name: serverName,
                            title: serverName,
                            url: m3uUrl,
                            behaviorHints: {
                                notWebReady: false,
                                bingeGroup: 'cizgivedizi-stream',
                                proxyHeaders: {
                                    request: {
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                        'Referer': encodedUrl
                                    }
                                }
                            }
                        });
                    } else {
                        console.log('   ❌ video_location bulunamadı');
                        console.log(`   Decrypted preview: ${decrypted.substring(0, 200)}...`);
                    }
                } else {
                    console.log('   ❌ Şifre çözme başarısız');
                }
            } else {
                console.log('   ❌ bePlayer pattern bulunamadı');
            }
        }

        // ========== GOOGLE DRIVE EXTRACTOR ==========
        else if (extractorType === 'googledrive') {
            console.log('   🔍 Google Drive ID çıkarılıyor...');

            const urlId = url.split('/d/')[1]?.split('/')[0];

            if (urlId) {
                console.log(`   ✅ Drive ID: ${urlId}`);

                // gdplayer.vip API'sine istek at
                const randomId = Math.random().toString(36).substring(2, 10);
                return {
                    instructions: [{
                        requestId: `cizgivedizi-gdrive-api-${Date.now()}-${randomId}`,
                        purpose: 'googledrive-api',
                        url: 'https://gdplayer.vip/api/video',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        body: `file_id=${urlId}&subtitle=`,
                        metadata: {
                            serverName: serverName,
                            urlId: urlId
                        }
                    }]
                };
            } else {
                console.log('   ❌ Drive ID bulunamadı');
            }
        }

        // ========== SIBNET EXTRACTOR ==========
        else if (extractorType === 'sibnet') {
            console.log('   🔍 SibNet player.src pattern aranıyor...');

            const sibnetMatch = body.match(/player\.src\(\[\{src:\s*"([^"]+)"/);

            if (sibnetMatch) {
                let m3uUrl = sibnetMatch[1];

                // Relative URL ise tam URL'ye çevir
                if (!m3uUrl.startsWith('http')) {
                    m3uUrl = `https://video.sibnet.ru${m3uUrl}`;
                }

                console.log(`   ✅ SibNet M3U8 bulundu: ${m3uUrl.substring(0, 80)}...`);

                // Cevirmen bilgisi varsa (URL'de | ile ayrılmış)
                let finalName = serverName;
                let refererUrl = encodedUrl;
                if (url.includes('|')) {
                    const cevirmen = url.split('|')[1];
                    finalName = `${serverName} + ${cevirmen}`;
                    refererUrl = encodeURI(url.split('|')[0]);
                }

                streams.push({
                    name: finalName,
                    title: finalName,
                    url: m3uUrl,
                    behaviorHints: {
                        notWebReady: false,
                        bingeGroup: 'cizgivedizi-stream',
                        proxyHeaders: {
                            request: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': refererUrl
                            }
                        }
                    }
                });
            } else {
                console.log('   ❌ SibNet player.src bulunamadı');
            }
        }

        // ========== GENERIC EXTRACTOR ==========
        else {
            console.log('   🔍 Generic M3U8 pattern aranıyor...');

            // M3U8 ara
            let m3uMatch = body.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/);
            if (!m3uMatch) m3uMatch = body.match(/"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
            if (!m3uMatch) m3uMatch = body.match(/source:\s*["']([^"']+\.m3u8[^"']*)["']/);
            if (!m3uMatch) m3uMatch = body.match(/(https?:\/\/[^\s"'<>()]+\.m3u8[^\s"'<>()]*)/);

            if (m3uMatch) {
                const m3uUrl = m3uMatch[1] || m3uMatch[0];
                console.log(`   ✅ Generic M3U8 bulundu: ${m3uUrl.substring(0, 80)}...`);

                streams.push({
                    name: serverName,
                    title: serverName,
                    url: m3uUrl,
                    behaviorHints: {
                        notWebReady: false,
                        bingeGroup: 'cizgivedizi-stream',
                        proxyHeaders: {
                            request: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': encodedUrl
                            }
                        }
                    }
                });
            } else {
                console.log('   ❌ M3U8 bulunamadı');
            }
        }

        console.log(`\n📊 ${serverName}'dan ${streams.length} stream bulundu`);
        return { streams };
    }

    // ========== GOOGLE DRIVE API RESPONSE ==========
    if (purpose === 'googledrive-api') {
        console.log('\n🔍 [GOOGLE DRIVE API] Response işleniyor...');
        const serverName = metadata?.serverName || 'GdrivePlayer';
        const streams = [];

        try {
            const apiResponse = JSON.parse(body);

            if (apiResponse.status === 'success' && apiResponse.data && apiResponse.data.embedUrl) {
                const embedUrl = apiResponse.data.embedUrl;
                console.log(`   ✅ Embed URL: ${embedUrl.substring(0, 80)}...`);

                // Embed sayfasını fetch et
                const randomId = Math.random().toString(36).substring(2, 10);
                return {
                    instructions: [{
                        requestId: `cizgivedizi-gdrive-embed-${Date.now()}-${randomId}`,
                        purpose: 'googledrive-embed',
                        url: embedUrl,
                        method: 'GET',
                        headers: getEnhancedHeaders('https://gdplayer.vip/'),
                        metadata: { serverName }
                    }]
                };
            } else {
                console.log('   ❌ API response başarısız veya embed URL yok');
            }
        } catch (e) {
            console.log('   ❌ JSON parse hatası:', e.message);
        }

        return { streams };
    }

    // ========== GOOGLE DRIVE EMBED PAGE ==========
    if (purpose === 'googledrive-embed') {
        console.log('\n🔍 [GOOGLE DRIVE EMBED] ng-init parse ediliyor...');
        const $ = cheerio.load(body);
        const serverName = metadata?.serverName || 'GdrivePlayer';
        const streams = [];

        const bodyEl = $('body[ng-init]');
        const ngInit = bodyEl.attr('ng-init');

        if (ngInit) {
            console.log(`   ✅ ng-init bulundu`);

            const initMatch = ngInit.match(/init\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)'\)/);

            if (initMatch) {
                const playUrl = initMatch[1];
                const keyHex = initMatch[2];

                console.log(`   ✅ Play URL: ${playUrl}`);
                console.log(`   ✅ Key: ${keyHex}`);

                // Video API'sine istek at
                const videoApiUrl = `${playUrl}/?video_id=${keyHex}&action=get_video`;

                const randomId = Math.random().toString(36).substring(2, 10);
                return {
                    instructions: [{
                        requestId: `cizgivedizi-gdrive-video-${Date.now()}-${randomId}`,
                        purpose: 'googledrive-video',
                        url: videoApiUrl,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://gdplayer.vip/'
                        },
                        metadata: { serverName, playUrl, keyHex }
                    }]
                };
            } else {
                console.log('   ❌ init() pattern eşleşmedi');
            }
        } else {
            console.log('   ❌ ng-init attribute bulunamadı');
        }

        return { streams };
    }

    // ========== GOOGLE DRIVE VIDEO API ==========
    if (purpose === 'googledrive-video') {
        console.log('\n🔍 [GOOGLE DRIVE VIDEO] Qualities parse ediliyor...');
        const serverName = metadata?.serverName || 'GdrivePlayer';
        const playUrl = metadata?.playUrl;
        const keyHex = metadata?.keyHex;
        const streams = [];

        try {
            const videoData = JSON.parse(body);

            if (videoData.qualities && Array.isArray(videoData.qualities)) {
                console.log(`   ✅ ${videoData.qualities.length} kalite bulundu`);

                for (const q of videoData.qualities) {
                    const quality = q.quality;
                    const qualityLabel = `${quality}p`;
                    const videoUrl = `${playUrl}/?video_id=${keyHex}&quality=${quality}&action=p`;

                    console.log(`   [${qualityLabel}] ${videoUrl.substring(0, 60)}...`);

                    streams.push({
                        name: `${serverName} ${qualityLabel}`,
                        title: `${serverName} ${qualityLabel}`,
                        url: videoUrl,
                        behaviorHints: {
                            notWebReady: false,
                            bingeGroup: 'cizgivedizi-stream',
                            proxyHeaders: {
                                request: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                    'Referer': 'https://gdplayer.vip/'
                                }
                            }
                        }
                    });
                }
            } else {
                console.log('   ❌ qualities array bulunamadı');
            }
        } catch (e) {
            console.log('   ❌ JSON parse hatası:', e.message);
        }

        console.log(`\n📊 ${serverName}'dan ${streams.length} stream bulundu`);
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

