const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { getWithBypass } = require('./cloudflare-bypass');

// URL cache dosyası
const URL_CACHE_FILE = path.join(__dirname, '.selcuk_url_cache.json');

// Cache'den URL'yi oku
function loadCachedUrl() {
    try {
        if (fs.existsSync(URL_CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(URL_CACHE_FILE, 'utf8'));
            if (data.url && data.number) {
                console.log(`📁 Cache'den URL yüklendi: ${data.url}`);
                return { url: data.url, number: data.number };
            }
        }
    } catch (error) {
        console.log('Cache okuma hatası:', error.message);
    }
    return null;
}

// URL'yi cache'e kaydet
function saveCachedUrl(url, number) {
    try {
        fs.writeFileSync(URL_CACHE_FILE, JSON.stringify({ url, number, timestamp: Date.now() }));
        console.log(`💾 URL cache'e kaydedildi: ${url}`);
    } catch (error) {
        console.log('Cache yazma hatası:', error.message);
    }
}

// Manifest tanımı
const manifest = {
    id: 'community.selcuksports',
    version: '1.0.0',
    name: 'SelcukSports HD',
    description: 'Canlı spor kanalları - SelcukSports için Stremio eklentisi',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv', 'channel'],
    catalogs: [
        {
            type: 'tv',
            id: 'selcuk_live_matches',
            name: '🔴 Canlı Maçlar',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'selcuk_bein_sports',
            name: '⚽ beIN SPORTS',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'selcuk_s_sport',
            name: '🏀 S Sport',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'selcuk_tivibu_spor',
            name: '📺 Tivibu Spor',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'selcuk_tabii_spor',
            name: '📱 tabii Spor',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'selcuk_other_sports',
            name: '🎾 Diğer Spor Kanalları',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'selcuk_all_channels',
            name: '📡 Tüm Kanallar (7/24)',
            extra: [{ name: 'skip', isRequired: false }]
        }
    ],
    idPrefixes: ['selcuk']
};

const builder = new addonBuilder(manifest);

// Dinamik BASE_URL yönetimi
const DEFAULT_URL = process.env.SELCUK_URL || 'https://www.sporcafe-2fd65c4bc314.xyz/';
const cachedUrlData = loadCachedUrl();
let BASE_URL = cachedUrlData ? cachedUrlData.url : DEFAULT_URL;
const MAX_RETRIES = parseInt(process.env.SELCUK_MAX_RETRIES || '10');

console.log(`⚽ SelcukSports Addon başlatılıyor...`);
console.log(`📍 Başlangıç URL: ${BASE_URL}`);
console.log(`📍 Maksimum deneme: ${MAX_RETRIES}`);

// Header fonksiyonu - Özel referer gereksinimleri için
function getHeaders(referer = BASE_URL) {
    return {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'Referer': referer,
        'Origin': BASE_URL,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin'
    };
}

// URL'yi test et ve çalışan URL'yi bul
async function findWorkingUrl(currentUrl = BASE_URL) {
    console.log(`🔍 SelcukSports için çalışan URL aranıyor... Test URL: ${currentUrl}`);

    try {
        console.log(`[1/1] Test ediliyor: ${currentUrl}`);

        const html = await getWithBypass(currentUrl, {
            headers: getHeaders(currentUrl),
            timeout: 15000,
            waitUntil: 'domcontentloaded'
        });

        // Final URL'yi al (redirect sonrası)
        const finalUrl = currentUrl;

        if (finalUrl !== currentUrl) {
            console.log(`   🔄 Redirect: ${currentUrl} → ${finalUrl}`);
        }

        // SelcukSports içerik kontrolü
        const isSelcukSports = (
            html.includes('selcuksports') ||
            html.includes('SelcukSports') ||
            html.includes('Bein Sports') ||
            html.includes('bein sports') ||
            html.includes('CANLI') ||
            html.includes('Canlı') ||
            html.includes('7/24') ||
            (html.includes('spor') && (html.includes('maç') || html.includes('canlı')))
        );

        if (isSelcukSports) {
            // Final URL'yi kullan (redirect sonrası)
            BASE_URL = finalUrl.replace(/\/$/, ''); // Sondaki / varsa kaldır

            // Final URL'yi cache'e kaydet (number yerine url hash'ini kullan)
            const urlHash = finalUrl.match(/selcuksportshd([a-z0-9]+)\.xyz/i)?.[1] || 'unknown';
            saveCachedUrl(BASE_URL, urlHash);
            console.log(`✅ Çalışan URL bulundu ve kaydedildi: ${BASE_URL}`);
            return true;
        } else {
            console.log(`   ⚠ URL yanıt verdi ama SelcukSports içeriği bulunamadı`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Bağlantı hatası: ${error.message}`);
        return false;
    }
}

// URL'yi test et, çalışmıyorsa yenisini bul
async function ensureWorkingUrl() {
    try {
        const html = await getWithBypass(BASE_URL, {
            headers: getHeaders(BASE_URL),
            timeout: 15000,
            waitUntil: 'domcontentloaded'
        });

        // Final URL'yi kontrol et (redirect varsa)
        let finalUrl = BASE_URL;

        // Eğer redirect olduysa, yeni URL'yi güncelle
        const cleanBaseUrl = BASE_URL.replace(/\/$/, '');
        const cleanFinalUrl = finalUrl.replace(/\/$/, '');

        if (cleanFinalUrl !== cleanBaseUrl) {
            console.log(`🔄 Redirect tespit edildi: ${cleanBaseUrl} → ${cleanFinalUrl}`);
            BASE_URL = cleanFinalUrl;

            // URL'den hash'i çıkar (selcuksportshd26daa9e5a0.xyz formatında)
            const urlHash = BASE_URL.match(/selcuksportshd([a-z0-9]+)\.xyz/i)?.[1] || 'unknown';
            saveCachedUrl(BASE_URL, urlHash);
            console.log(`💾 Yeni URL cache'e kaydedildi: ${BASE_URL} (hash: ${urlHash})`);
        }

        const isSelcukSports = (
            html.includes('selcuksports') ||
            html.includes('SelcukSports') ||
            html.includes('Bein Sports') ||
            html.includes('bein sports') ||
            html.includes('CANLI') ||
            html.includes('Canlı') ||
            html.includes('7/24') ||
            (html.includes('spor') && (html.includes('maç') || html.includes('canlı')))
        );

        if (isSelcukSports) {
            console.log(`✓ Mevcut URL çalışıyor: ${BASE_URL}`);
            return true;
        } else {
            console.log(`⚠ Mevcut URL yanıt verdi ama SelcukSports içeriği yok: ${BASE_URL}`);
            console.log(`🔄 URL doğrulanıyor...`);
            return await findWorkingUrl(BASE_URL);
        }
    } catch (error) {
        console.log(`⚠ Mevcut URL çalışmıyor: ${BASE_URL} (${error.message})`);
        console.log(`🔄 URL doğrulanıyor...`);
        return await findWorkingUrl(BASE_URL);
    }
}

// Başlangıçta çalışan URL'yi bul
(async () => {
    await ensureWorkingUrl();
})();

// Kanal kategorilerine göre regex filtreleme
function getChannelFilter(catalogId) {
    const filters = {
        'selcuk_bein_sports': /bein.*sports|beIN.*SPORTS/i,
        'selcuk_s_sport': /s\s*sport/i,
        'selcuk_tivibu_spor': /tivibu\s*spor/i,
        'selcuk_tabii_spor': /tabii\s*spor/i,
        'selcuk_other_sports': /eurosport|nba\s*tv|trt\s*spor|a\s*spor|smart\s*spor/i
    };
    return filters[catalogId] || null;
}

// Kanalları parse et
function parseChannels($, catalogId) {
    const channels = [];

    // data-url attribute'una sahip tüm linkleri bul
    $('a[data-url]').each((i, elem) => {
        const dataUrl = $(elem).attr('data-url');
        const channelName = $(elem).find('div.name').text().trim();
        const timeInfo = $(elem).find('time.time').text().trim();

        if (!dataUrl || !channelName) return;

        // 7/24 kanalları tespit et (tab5 - 7/24 TV sekmesi)
        const is247Channel = timeInfo === '7/24';

        // Katalog filtresine göre kontrol et
        if (catalogId === 'selcuk_all_channels') {
            // Sadece 7/24 kanalları göster
            if (!is247Channel) return;
        } else if (catalogId !== 'selcuk_live_matches') {
            // Diğer kataloglar için 7/24 kanallarını filtrele
            if (!is247Channel) return;

            const filter = getChannelFilter(catalogId);
            if (filter && !filter.test(channelName)) return;
        }

        // URL'yi tam hale getir
        const fullUrl = dataUrl.startsWith('http') ? dataUrl :
            dataUrl.startsWith('/') ? `${BASE_URL}${dataUrl}` :
                `${BASE_URL}/${dataUrl}`;

        const id = 'selcuk:channel:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

        channels.push({
            id: id,
            type: 'tv',
            name: `📺 ${channelName}`,
            poster: `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=${encodeURIComponent(channelName)}`,
            posterShape: 'square',
            description: `${channelName} - Canlı Yayın`
        });
    });

    return channels;
}

// Canlı maçları parse et
function parseLiveMatches($) {
    const matches = [];

    // data-url attribute'una sahip linkleri bul
    $('a[data-url]').each((i, elem) => {
        const dataUrl = $(elem).attr('data-url');
        const matchName = $(elem).find('div.name').text().trim();
        const timeInfo = $(elem).find('time.time').text().trim();

        if (!dataUrl || !matchName) return;

        // 7/24 kanallarını atla (bunlar maç değil)
        if (timeInfo === '7/24') return;

        // Sadece saat bilgisi olanları al (maçlar için)
        const hasTime = /\d{2}:\d{2}/.test(timeInfo);
        if (!hasTime) return;

        // URL'yi tam hale getir
        const fullUrl = dataUrl.startsWith('http') ? dataUrl :
            dataUrl.startsWith('/') ? `${BASE_URL}${dataUrl}` :
                `${BASE_URL}/${dataUrl}`;

        const id = 'selcuk:match:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

        matches.push({
            id: id,
            type: 'tv',
            name: `🔴 ${matchName}`,
            poster: `https://via.placeholder.com/300x450/ff0000/ffffff?text=${encodeURIComponent('CANLI')}`,
            posterShape: 'square',
            description: `Canlı Maç: ${matchName} - ${timeInfo}`,
            releaseInfo: timeInfo
        });
    });

    return matches;
}

// Catalog handler
builder.defineCatalogHandler(async (args) => {
    try {
        await ensureWorkingUrl();

        const catalogId = args.id;
        console.log(`Catalog ID: ${catalogId}`);

        const html = await getWithBypass(BASE_URL, {
            headers: getHeaders(),
            timeout: 15000,
            waitUntil: 'domcontentloaded'
        });

        const $ = cheerio.load(html);
        let metas = [];

        // Canlı maçlar için özel parsing
        if (catalogId === 'selcuk_live_matches') {
            metas = parseLiveMatches($);
        } else {
            // Kanallar için parsing
            metas = parseChannels($, catalogId);
        }

        console.log(`${catalogId} için ${metas.length} içerik bulundu`);

        // Benzersiz hale getir (중복 제거)
        const uniqueMetas = Array.from(new Map(metas.map(item => [item.name, item])).values());

        return { metas: uniqueMetas };
    } catch (error) {
        console.error('Catalog hatası:', error.message);
        return { metas: [] };
    }
});

// Meta handler
builder.defineMetaHandler(async (args) => {
    try {
        await ensureWorkingUrl();

        const urlBase64 = args.id.replace('selcuk:channel:', '').replace('selcuk:match:', '');
        const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

        console.log(`Meta bilgisi alınıyor: ${url}`);

        const html = await getWithBypass(url, {
            headers: getHeaders(),
            timeout: 15000,
            waitUntil: 'domcontentloaded'
        });

        const $ = cheerio.load(html);

        // Sayfa başlığından kanal/maç adını al
        const title = $('title').text().trim() ||
            $('h1').first().text().trim() ||
            'Canlı Yayın';

        return {
            meta: {
                id: args.id,
                type: 'tv',
                name: title,
                poster: `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=${encodeURIComponent(title)}`,
                posterShape: 'square',
                background: `https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=${encodeURIComponent(title)}`,
                description: `${title} - Canlı Yayın`,
                genres: ['Spor', 'Canlı TV']
            }
        };
    } catch (error) {
        console.error('Meta hatası:', error.message);
        return { meta: null };
    }
});

// Stream handler
builder.defineStreamHandler(async (args) => {
    const streams = []; // Stream array'ini tanımla

    try {
        await ensureWorkingUrl();

        // ID'den player URL'yi çıkar
        const urlBase64 = args.id.replace('selcuk:channel:', '').replace('selcuk:match:', '');
        const playerUrl = Buffer.from(urlBase64, 'base64').toString('utf-8');

        console.log(`Stream alınıyor - Player URL: ${playerUrl}`);

        // Bu URL zaten player URL'si (data-url'den geldi, base64'ten decode edildi)
        // URL'yi tam hale getir
        let fullPlayerUrl = playerUrl;
        if (fullPlayerUrl.startsWith('//')) {
            fullPlayerUrl = 'https:' + fullPlayerUrl;
        } else if (fullPlayerUrl.startsWith('/')) {
            fullPlayerUrl = BASE_URL + fullPlayerUrl;
        } else if (!fullPlayerUrl.startsWith('http')) {
            fullPlayerUrl = BASE_URL + '/' + fullPlayerUrl;
        }

        // Gereksiz parametreleri temizle (poster, reklamResim, watermark vb.)
        // Sadece asıl parametreleri (id, priv gibi) bırak
        try {
            const urlObj = new URL(fullPlayerUrl);

            // Hash (#) kısmını tamamen kaldır (poster=, reklamResim=, watermark= vb. içerir)
            urlObj.hash = '';

            // Query parametrelerini filtrele - sadece id ve priv gibi gerekli olanları tut
            const params = new URLSearchParams(urlObj.search);
            const allowedParams = ['id', 'priv']; // İzin verilen parametreler
            const cleanParams = new URLSearchParams();

            for (const [key, value] of params) {
                if (allowedParams.includes(key)) {
                    cleanParams.set(key, value);
                }
            }

            urlObj.search = cleanParams.toString();
            fullPlayerUrl = urlObj.toString();

            console.log(`Temizlenmiş player URL: ${fullPlayerUrl}`);
        } catch (urlError) {
            console.log(`URL temizleme hatası (URL olduğu gibi kullanılacak): ${urlError.message}`);
        }

        console.log(`Tam player URL: ${fullPlayerUrl}`);

        // Player sayfasından M3U8 linkini çıkarmaya çalış
        try {
            const playerOrigin = new URL(fullPlayerUrl).origin;
            const playerReferer = playerOrigin + '/';

            console.log(`📥 Player sayfası indiriliyor...`);
            const playerContent = await getWithBypass(fullPlayerUrl, {
                headers: getHeaders(playerReferer),
                timeout: 30000,
                waitUntil: 'domcontentloaded'
            });
            console.log(`✓ Player içeriği alındı (${playerContent.length} karakter)`);

            // M3U8 linkini bul - SelcukSports için özel pattern'ler
            const m3u8Patterns = [
                // SelcukSports özel: baseStreamUrl pattern'i
                // this.baseStreamUrl = 'https://df16ea90s1u1080.ce51f4844d11db76.live/live/';
                /this\.baseStreamUrl\s*=\s*["']([^"']+)["']/i,

                // Direkt M3U8 URL'leri - playlist.m3u8 ile bitenler
                /https?:\/\/[a-z0-9]+\.[a-z0-9]+\.[a-z0-9.]+\/[^"'\s]*playlist\.m3u8/gi,
                /https?:\/\/[a-z0-9]+\.[a-z0-9]+\.[a-z0-9.]+\/[^"'\s]*index\.m3u8/gi,

                // JSON formatları
                /["']?file["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /["']?source["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /["']?src["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /["']?url["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /["']?hlsUrl["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,

                // Genel M3U8 pattern (son çare)
                /(https?:\/\/[^"'\s<>]+\.m3u8[^\s"'<>]*)/gi
            ];

            let m3u8Link = null;
            let baseStreamUrl = null;

            for (let i = 0; i < m3u8Patterns.length; i++) {
                const pattern = m3u8Patterns[i];
                const matches = playerContent.match(pattern);
                if (matches) {
                    m3u8Link = matches[1] || matches[0];
                    // Escape karakterlerini temizle
                    m3u8Link = m3u8Link.replace(/\\/g, '').replace(/\\"/g, '"');

                    // Eğer baseStreamUrl pattern'i ise (ilk pattern)
                    if (i === 0) {
                        baseStreamUrl = m3u8Link;
                        console.log(`✓ baseStreamUrl bulundu: ${baseStreamUrl}`);

                        // URL'den streamId'yi çıkar (id parametresinden)
                        const urlParams = new URLSearchParams(new URL(fullPlayerUrl).search);
                        const streamId = urlParams.get('id') || 'selcukbeinsports1';

                        // M3U8 linkini oluştur
                        m3u8Link = `${baseStreamUrl}${streamId}/playlist.m3u8`;
                        console.log(`✓ M3U8 linki oluşturuldu: ${m3u8Link}`);
                    } else {
                        console.log(`✓ M3U8 bulundu (Pattern #${i + 1}): ${m3u8Link}`);
                    }
                    break;
                }
            }

            if (m3u8Link) {
                // M3U8 URL'sinin origin'ini al
                const m3u8Origin = new URL(m3u8Link).origin;

                // Header'ları Stremio standart formatında hazırla
                const streamHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                    'Referer': playerReferer,
                    'Origin': m3u8Origin
                };

                // M3U8 stream'i ekle (header'larla - Stremio standart formatı)
                streams.push({
                    name: 'SelcukSports HD',
                    title: 'SelcukSports HD (M3U8 + Headers)',
                    url: m3u8Link,
                    behaviorHints: {
                        notWebReady: true,
                        bingeGroup: 'selcuk-live',
                        proxyHeaders: {
                            request: streamHeaders
                        }
                    }
                });

                // Yedek: Header'sız M3U8
                streams.push({
                    name: 'SelcukSports (Header\'sız)',
                    title: 'SelcukSports HD (M3U8)',
                    url: m3u8Link,
                    behaviorHints: {
                        notWebReady: true,
                        bingeGroup: 'selcuk-live'
                    }
                });

                console.log(`✅ M3U8 stream'leri hazırlandı (Stremio standart format):`);
                console.log(`   M3U8 URL: ${m3u8Link}`);
                console.log(`   Headers (proxyHeaders):`);
                console.log(`     - User-Agent: Mozilla/5.0...`);
                console.log(`     - Referer: ${playerReferer}`);
                console.log(`     - Origin: ${m3u8Origin}`);
            } else {
                console.log(`⚠ M3U8 bulunamadı, iframe player kullanılacak`);

                // M3U8 bulunamadıysa iframe player kullan
                streams.push({
                    name: 'SelcukSports HD (İframe)',
                    title: 'SelcukSports HD (İframe Player)',
                    url: fullPlayerUrl,
                    behaviorHints: {
                        notWebReady: false,
                        bingeGroup: 'selcuk-live'
                    }
                });
            }

            // Her durumda external player seçeneği ekle
            streams.push({
                name: 'Tarayıcıda Aç',
                title: 'Tarayıcıda Oynat',
                externalUrl: fullPlayerUrl,
                behaviorHints: {
                    notWebReady: true
                }
            });

            console.log(`📊 Toplam ${streams.length} stream seçeneği sunuluyor`);
            console.log(`   1. M3U8 + Headers via proxyHeaders (önerilen)`);
            console.log(`   2. M3U8 Header'sız (yedek)`);
            console.log(`   3. Tarayıcıda Aç`);
            return { streams };

        } catch (playerError) {
            console.error(`❌ Player analiz hatası: ${playerError.message}`);

            // Hata durumunda fallback: iframe ve external player
            const playerOrigin = new URL(fullPlayerUrl).origin;

            streams.push({
                name: 'SelcukSports HD (İframe)',
                title: 'SelcukSports HD (İframe Player)',
                url: fullPlayerUrl,
                behaviorHints: {
                    notWebReady: false,
                    bingeGroup: 'selcuk-live'
                }
            });

            streams.push({
                name: 'Tarayıcıda Aç',
                title: 'Tarayıcıda Oynat',
                externalUrl: fullPlayerUrl,
                behaviorHints: {
                    notWebReady: true
                }
            });

            console.log(`📊 Fallback: ${streams.length} stream seçeneği sunuluyor`);
            return { streams };
        }
    } catch (error) {
        console.error('Stream hatası:', error.message);
        return { streams: [] };
    }
});

// Export builder for multi-addon server
module.exports = builder;
