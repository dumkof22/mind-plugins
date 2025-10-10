const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

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
    version: '2.0.0',
    name: 'SelcukSports HD',
    description: 'Canlı spor kanalları - SelcukSports için Stremio eklentisi (Proxy Mode)',
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

// Catalog name to ID mapping (Flutter sends catalog names)
const CATALOG_NAME_TO_ID = {
    '🔴 Canlı Maçlar': 'selcuk_live_matches',
    '⚽ beIN SPORTS': 'selcuk_bein_sports',
    '🏀 S Sport': 'selcuk_s_sport',
    '📺 Tivibu Spor': 'selcuk_tivibu_spor',
    '📱 tabii Spor': 'selcuk_tabii_spor',
    '🎾 Diğer Spor Kanalları': 'selcuk_other_sports',
    '📡 Tüm Kanallar (7/24)': 'selcuk_all_channels'
};

// Dinamik BASE_URL yönetimi
const DEFAULT_URL = process.env.SELCUK_URL || 'https://www.sporcafe-2fd65c4bc314.xyz';
const cachedUrlData = loadCachedUrl();
let BASE_URL = cachedUrlData ? cachedUrlData.url : DEFAULT_URL;

console.log(`⚽ SelcukSports Addon başlatılıyor...`);
console.log(`📍 Başlangıç URL: ${BASE_URL}`);

// Header fonksiyonu
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
async function findWorkingUrl(currentUrl, proxyFetch) {
    console.log(`🔍 SelcukSports için çalışan URL aranıyor... Test URL: ${currentUrl}`);

    try {
        console.log(`[1/1] Test ediliyor: ${currentUrl}`);

        const response = await proxyFetch({
            url: currentUrl,
            method: 'GET',
            headers: getHeaders(currentUrl),
            timeout: 15000,
            waitUntil: 'domcontentloaded'
        });

        const html = response.body;

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
            BASE_URL = currentUrl.replace(/\/$/, '');
            const urlHash = currentUrl.match(/sporcafe-([a-z0-9]+)\.xyz/i)?.[1] ||
                currentUrl.match(/selcuksportshd([a-z0-9]+)\.xyz/i)?.[1] || 'unknown';
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
async function ensureWorkingUrl(proxyFetch) {
    try {
        const response = await proxyFetch({
            url: BASE_URL,
            method: 'GET',
            headers: getHeaders(BASE_URL),
            timeout: 15000,
            waitUntil: 'domcontentloaded'
        });

        const html = response.body;

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
            return await findWorkingUrl(BASE_URL, proxyFetch);
        }
    } catch (error) {
        console.log(`⚠ Mevcut URL çalışmıyor: ${BASE_URL} (${error.message})`);
        console.log(`🔄 URL doğrulanıyor...`);
        return await findWorkingUrl(BASE_URL, proxyFetch);
    }
}

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
    const PLAYER_BASE_URL = 'https://main.uxsyplayerb03b3c895b.click/index.php';

    // Script içindeki channelsData JSON'ını parse et
    const scriptContent = $('script').toArray()
        .map(el => $(el).html())
        .find(script => script && script.includes('channelsData'));

    let channelsData = [];
    if (scriptContent) {
        const channelsMatch = scriptContent.match(/const channelsData = (\[.*?\]);/s);
        if (channelsMatch) {
            try {
                channelsData = JSON.parse(channelsMatch[1]);
                console.log(`📊 Script'ten ${channelsData.length} kanal bulundu`);
            } catch (e) {
                console.log('⚠ channelsData parse hatası:', e.message);
            }
        }
    }

    // Eğer channelsData varsa, onu kullan
    if (channelsData.length > 0) {
        // Katalog bazında filtreleme
        let filteredChannels = channelsData;

        if (catalogId === 'selcuk_bein_sports') {
            filteredChannels = channelsData.filter(ch =>
                /bein.*sports/i.test(ch.name)
            );
        } else if (catalogId === 'selcuk_s_sport') {
            filteredChannels = channelsData.filter(ch =>
                /s\s*sport/i.test(ch.name)
            );
        } else if (catalogId === 'selcuk_tivibu_spor') {
            filteredChannels = channelsData.filter(ch =>
                /tivibu\s*spor/i.test(ch.name)
            );
        } else if (catalogId === 'selcuk_tabii_spor') {
            filteredChannels = channelsData.filter(ch =>
                /tabii\s*spor/i.test(ch.name)
            );
        } else if (catalogId === 'selcuk_other_sports') {
            filteredChannels = channelsData.filter(ch =>
                /eurosport|nba\s*tv|trt\s*spor|a\s*spor|smart\s*spor/i.test(ch.name)
            );
        } else if (catalogId === 'selcuk_all_channels') {
            // Tüm kanallar - benzersiz hale getir
            const uniqueStreamUrls = new Set();
            filteredChannels = channelsData.filter(ch => {
                if (uniqueStreamUrls.has(ch.stream_url)) {
                    return false;
                }
                uniqueStreamUrls.add(ch.stream_url);
                return true;
            });
        }

        // Kanalları oluştur
        const addedStreamUrls = new Set();
        filteredChannels.forEach(channel => {
            // Aynı stream_url'den sadece bir tane ekle
            if (addedStreamUrls.has(channel.stream_url)) {
                return;
            }
            addedStreamUrls.add(channel.stream_url);

            // Player URL'sini oluştur
            const playerUrl = `${PLAYER_BASE_URL}?id=${channel.stream_url}`;
            const id = 'selcuk:channel:' + Buffer.from(playerUrl).toString('base64').replace(/=/g, '');

            channels.push({
                id: id,
                type: 'tv',
                name: `📺 ${channel.name}`,
                poster: `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=${encodeURIComponent(channel.name)}`,
                posterShape: 'square',
                description: `${channel.name} - Canlı Yayın`
            });
        });

        return channels;
    }

    // Fallback: HTML'den parse et (eski yöntem - yeni yapıya uyarlanmış)
    $('div.channel-item[data-stream-url]').each((i, elem) => {
        const streamUrl = $(elem).attr('data-stream-url');
        const channelName = $(elem).find('div.channel-name').text().trim();

        if (!streamUrl || !channelName) return;

        // Katalog filtresine göre kontrol et
        const filter = getChannelFilter(catalogId);
        if (catalogId !== 'selcuk_all_channels' && filter && !filter.test(channelName)) {
            return;
        }

        // Player URL'sini oluştur
        const playerUrl = `${PLAYER_BASE_URL}?id=${streamUrl}`;
        const id = 'selcuk:channel:' + Buffer.from(playerUrl).toString('base64').replace(/=/g, '');

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

    // Not: Yeni site yapısında canlı maçlar ayrı bir sayfada olabilir
    // Şimdilik boş dönüyoruz, gerekirse ayrı endpoint eklenebilir
    console.log('ℹ️  Canlı maçlar yeni site yapısında desteklenmiyor');

    return matches;
}

// ============ CATALOG HANDLER ============
async function handleCatalog(args, proxyFetch) {
    console.log('\n🎯 [SelcukSports Catalog Handler] Starting...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    try {
        await ensureWorkingUrl(proxyFetch);

        let catalogId = args.id;

        // Convert catalog name to ID if needed
        if (CATALOG_NAME_TO_ID[catalogId]) {
            console.log(`🔄 Converting catalog name "${catalogId}" to ID "${CATALOG_NAME_TO_ID[catalogId]}"`);
            catalogId = CATALOG_NAME_TO_ID[catalogId];
        }

        console.log(`Catalog ID: ${catalogId}`);

        const response = await proxyFetch({
            url: BASE_URL,
            method: 'GET',
            headers: getHeaders(),
            timeout: 15000,
            waitUntil: 'domcontentloaded'
        });

        const $ = cheerio.load(response.body);
        let metas = [];

        if (catalogId === 'selcuk_live_matches') {
            metas = parseLiveMatches($);
        } else {
            metas = parseChannels($, catalogId);
        }

        console.log(`${catalogId} için ${metas.length} içerik bulundu`);

        // Benzersiz hale getir
        const uniqueMetas = Array.from(new Map(metas.map(item => [item.name, item])).values());

        return { metas: uniqueMetas };
    } catch (error) {
        console.error('❌ Catalog hatası:', error.message);
        return { metas: [] };
    }
}

// ============ META HANDLER ============
async function handleMeta(args, proxyFetch) {
    console.log('\n🎯 [SelcukSports Meta Handler] Starting...');

    try {
        await ensureWorkingUrl(proxyFetch);

        const urlBase64 = args.id.replace('selcuk:channel:', '').replace('selcuk:match:', '');
        const playerUrl = Buffer.from(urlBase64, 'base64').toString('utf-8');

        console.log(`Meta bilgisi alınıyor - Player URL: ${playerUrl}`);

        // Player URL'sinden stream ID'sini çıkar
        let channelName = 'Canlı Yayın';
        try {
            const urlParams = new URLSearchParams(new URL(playerUrl).search);
            const streamId = urlParams.get('id');
            if (streamId) {
                // Stream ID'sinden kanal adını oluştur (örn: sbeinsports-1 -> beIN Sports 1)
                channelName = streamId
                    .replace(/^s/, '')
                    .replace(/-/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                console.log(`📺 Kanal adı stream ID'sinden oluşturuldu: ${channelName}`);
            }
        } catch (e) {
            console.log('⚠ Stream ID parse hatası:', e.message);
        }

        return {
            meta: {
                id: args.id,
                type: 'tv',
                name: channelName,
                poster: `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=${encodeURIComponent(channelName)}`,
                posterShape: 'square',
                background: `https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=${encodeURIComponent(channelName)}`,
                description: `${channelName} - Canlı Yayın`,
                genres: ['Spor', 'Canlı TV']
            }
        };
    } catch (error) {
        console.error('❌ Meta hatası:', error.message);
        return { meta: null };
    }
}

// ============ STREAM HANDLER ============
async function handleStream(args, proxyFetch) {
    console.log('\n🎯 [SelcukSports Stream Handler] Starting...');
    const streams = [];

    try {
        await ensureWorkingUrl(proxyFetch);

        const urlBase64 = args.id.replace('selcuk:channel:', '').replace('selcuk:match:', '');
        const playerUrl = Buffer.from(urlBase64, 'base64').toString('utf-8');

        console.log(`Stream alınıyor - Player URL: ${playerUrl}`);

        // Player URL'si zaten tam format: https://main.uxsyplayerb03b3c895b.click/index.php?id=sbeinsports-1
        let fullPlayerUrl = playerUrl;

        console.log(`Tam player URL: ${fullPlayerUrl}`);

        // Player sayfasından M3U8 linkini çıkar
        try {
            const playerOrigin = new URL(fullPlayerUrl).origin;
            const playerReferer = playerOrigin + '/';

            console.log(`📥 Player sayfası indiriliyor...`);
            const response = await proxyFetch({
                url: fullPlayerUrl,
                method: 'GET',
                headers: getHeaders(playerReferer),
                timeout: 30000,
                waitUntil: 'domcontentloaded'
            });

            const playerContent = response.body;
            console.log(`✓ Player içeriği alındı (${playerContent.length} karakter)`);

            // M3U8 linkini bul
            const m3u8Patterns = [
                /this\.baseStreamUrl\s*=\s*["']([^"']+)["']/i,
                /https?:\/\/[a-z0-9]+\.[a-z0-9]+\.[a-z0-9.]+\/[^"'\s]*playlist\.m3u8/gi,
                /https?:\/\/[a-z0-9]+\.[a-z0-9]+\.[a-z0-9.]+\/[^"'\s]*index\.m3u8/gi,
                /["']?file["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /["']?source["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /["']?src["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /["']?url["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /["']?hlsUrl["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /(https?:\/\/[^"'\s<>]+\.m3u8[^\s"'<>]*)/gi
            ];

            let m3u8Link = null;
            let baseStreamUrl = null;

            for (let i = 0; i < m3u8Patterns.length; i++) {
                const pattern = m3u8Patterns[i];
                const matches = playerContent.match(pattern);
                if (matches) {
                    m3u8Link = matches[1] || matches[0];
                    m3u8Link = m3u8Link.replace(/\\/g, '').replace(/\\"/g, '"');

                    if (i === 0) {
                        baseStreamUrl = m3u8Link;
                        console.log(`✓ baseStreamUrl bulundu: ${baseStreamUrl}`);

                        const urlParams = new URLSearchParams(new URL(fullPlayerUrl).search);
                        const streamId = urlParams.get('id') || 'selcukbeinsports1';

                        m3u8Link = `${baseStreamUrl}${streamId}/playlist.m3u8`;
                        console.log(`✓ M3U8 linki oluşturuldu: ${m3u8Link}`);
                    } else {
                        console.log(`✓ M3U8 bulundu (Pattern #${i + 1}): ${m3u8Link}`);
                    }
                    break;
                }
            }

            if (m3u8Link) {
                const m3u8Origin = new URL(m3u8Link).origin;

                const streamHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                    'Referer': playerReferer,
                    'Origin': m3u8Origin
                };

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

                streams.push({
                    name: 'SelcukSports (Header\'sız)',
                    title: 'SelcukSports HD (M3U8)',
                    url: m3u8Link,
                    behaviorHints: {
                        notWebReady: true,
                        bingeGroup: 'selcuk-live'
                    }
                });

                console.log(`✅ M3U8 stream'leri hazırlandı`);
                console.log(`   M3U8 URL: ${m3u8Link}`);
                console.log(`   Headers: User-Agent, Referer, Origin`);
            } else {
                console.log(`⚠ M3U8 bulunamadı, iframe player kullanılacak`);

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

            streams.push({
                name: 'Tarayıcıda Aç',
                title: 'Tarayıcıda Oynat',
                externalUrl: fullPlayerUrl,
                behaviorHints: {
                    notWebReady: true
                }
            });

            console.log(`📊 Toplam ${streams.length} stream seçeneği sunuluyor`);
            return { streams };

        } catch (playerError) {
            console.error(`❌ Player analiz hatası: ${playerError.message}`);

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
        console.error('❌ Stream hatası:', error.message);
        return { streams: [] };
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

