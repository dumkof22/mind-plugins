const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.selcuksportshd',
    version: '1.0.0',
    name: 'SporCafe',
    description: 'Canlı spor kanalları - SelcukSportsHD için Stremio eklentisi (Instruction Mode)',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv', 'channel'],
    catalogs: [
        {
            type: 'tv',
            id: 'selcukshd_live_matches',
            name: '🔴 Canlı Maçlar',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'selcukshd_bein_sports',
            name: '⚽ beIN SPORTS',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'selcukshd_s_sport',
            name: '🏀 S Sport',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'selcukshd_tivibu_spor',
            name: '📺 Tivibu Spor',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'selcukshd_tabii_spor',
            name: '📱 tabii Spor',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'selcukshd_other_sports',
            name: '🎾 Diğer Spor Kanalları',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'selcukshd_all_channels',
            name: '📡 Tüm Kanallar (7/24)',
            extra: [{ name: 'skip', isRequired: false }]
        }
    ],
    idPrefixes: ['selcukshd']
};

// Dinamik URL desteği - Bu URL'ler periyodik olarak kontrol edilecek
const DYNAMIC_BASE_URLS = [
    'http://www.selcuksportshd1872.xyz',              // HTTP - SSL bypass

];

// Varsayılan URL (dinamik URL bulunamazsa kullanılacak)
let BASE_URL = 'https://www.selcuksportshd904bf9cd64.xyz';
const PLAYER_BASE_URL = 'https://main.uxsyplayerb03b3c895b.click/index.php?id=';

// Dinamik URL'i güncelle (Flutter tarafından çağrılacak)
function setDynamicBaseUrl(url) {
    if (url && url.startsWith('http')) {
        BASE_URL = url.endsWith('/') ? url.slice(0, -1) : url;
        console.log(`✅ [SporCafe] Dynamic URL updated: ${BASE_URL}`);
        return true;
    }
    return false;
}

// Dinamik URL listesini al (Flutter tarafından kullanılacak)
function getDynamicBaseUrls() {
    return DYNAMIC_BASE_URLS;
}

// Kanal kategorilerine göre regex filtreleme
function getChannelFilter(catalogId) {
    const filters = {
        'selcukshd_bein_sports': /bein\s*sports|beIN\s*SPORTS/i,
        'selcukshd_s_sport': /^s\s*sport/i,
        'selcukshd_tivibu_spor': /tivibu\s*spor/i,
        'selcukshd_tabii_spor': /tabii\s*spor/i,
        'selcukshd_other_sports': /eurosport|nba\s*tv|trt\s*spor|a\s*spor|smart\s*spor|dazn|ufc|sky\s*sports|motor/i
    };
    return filters[catalogId] || null;
}

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [SelcukSportsHD Catalog] Generating instructions...');
    console.log('📋 Catalog ID:', args.id);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `selcukshd-catalog-${args.id}-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: BASE_URL,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                'Referer': BASE_URL,
                'Origin': BASE_URL
            },
            metadata: { catalogId: args.id }
        }]
    };
}

async function handleMeta(args) {
    const urlBase64 = args.id.replace('selcukshd:channel:', '').replace('selcukshd:match:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`📺 [SelcukSportsHD Meta] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `selcukshd-meta-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: url,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL
            }
        }]
    };
}

async function handleStream(args) {
    const urlBase64 = args.id.replace('selcukshd:channel:', '').replace('selcukshd:match:', '');
    const playerUrl = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`🎬 [SelcukSportsHD Stream] Generating instructions for: ${playerUrl.substring(0, 80)}...`);

    // URL'yi tam hale getir (zaten tam geliyorsa değiştirme)
    let fullPlayerUrl = playerUrl;
    if (!fullPlayerUrl.startsWith('http')) {
        if (fullPlayerUrl.startsWith('//')) {
            fullPlayerUrl = 'https:' + fullPlayerUrl;
        } else if (fullPlayerUrl.startsWith('/')) {
            fullPlayerUrl = BASE_URL + fullPlayerUrl;
        } else {
            fullPlayerUrl = BASE_URL + '/' + fullPlayerUrl;
        }
    }

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `selcukshd-stream-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: fullPlayerUrl,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': new URL(fullPlayerUrl).origin + '/'
            },
            metadata: { originalPlayerUrl: fullPlayerUrl }
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

// Kanalları parse et
function parseChannels($, catalogId, body) {
    const channels = [];

    // Katalog ID'sine göre hangi tab'ı çekeceğini belirle
    let tabSelector = 'div.channel-list[data-tab-content]';

    if (catalogId === 'selcukshd_live_matches') {
        // Futbol maçları - tab1
        tabSelector = 'div.channel-list[id="tab1"]';
    } else if (catalogId === 'selcukshd_bein_sports') {
        tabSelector = 'div.channel-list[id="tab5"]'; // 7/24 TV'den beIN SPORTS kanalları
    } else if (catalogId === 'selcukshd_s_sport') {
        tabSelector = 'div.channel-list[id="tab5"]'; // 7/24 TV'den S Sport kanalları
    } else if (catalogId === 'selcukshd_tivibu_spor') {
        tabSelector = 'div.channel-list[id="tab5"]'; // 7/24 TV'den Tivibu Spor kanalları
    } else if (catalogId === 'selcukshd_other_sports') {
        tabSelector = 'div.channel-list[id="tab5"]'; // 7/24 TV'den diğer spor kanalları
    } else if (catalogId === 'selcukshd_all_channels') {
        // Tüm kanallar - tab5'ten (7/24 TV)
        tabSelector = 'div.channel-list[id="tab5"]';
    }

    // Seçili tab'tan kanalları çıkar
    $(tabSelector).find('li a[data-url]').each((i, el) => {
        const $el = $(el);
        const url = $el.attr('data-url');
        const name = $el.find('div.name').text().trim();
        const time = $el.find('time').text().trim();

        // Logo'yu bul - data-url içindeki #poster= parametresinden
        let logo = null;
        if (url && url.includes('#poster=')) {
            try {
                const posterMatch = url.match(/#poster=([^&]+)/);
                if (posterMatch && posterMatch[1]) {
                    logo = decodeURIComponent(posterMatch[1]);
                }
            } catch (e) {
                console.log(`Logo decode hatası: ${e.message}`);
            }
        }

        // Alternatif: img tag veya data attribute
        if (!logo) {
            logo = $el.find('img').attr('src') ||
                $el.find('img').attr('data-src') ||
                $el.attr('data-logo') ||
                $el.attr('data-image') ||
                null;
        }

        if (!url || !name) return;

        // Katalog filtresine göre kontrol et
        if (catalogId !== 'selcukshd_live_matches' && catalogId !== 'selcukshd_all_channels') {
            const filter = getChannelFilter(catalogId);
            if (filter && !filter.test(name)) return;
        }

        const id = 'selcukshd:channel:' + Buffer.from(url).toString('base64').replace(/=/g, '');

        // Logo URL'ini tam hale getir
        let posterUrl = `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=${encodeURIComponent(name)}`;
        if (logo) {
            if (logo.startsWith('http')) {
                posterUrl = logo;
            } else if (logo.startsWith('//')) {
                posterUrl = 'https:' + logo;
            } else if (logo.startsWith('/')) {
                posterUrl = BASE_URL + logo;
            } else if (!logo.startsWith('data:')) {
                // data: URI değilse BASE_URL ekle
                posterUrl = BASE_URL + '/' + logo;
            }
        }

        channels.push({
            id: id,
            type: 'tv',
            name: `📺 ${name}`,
            poster: posterUrl,
            posterShape: 'square',
            description: `${name} - ${time || 'Canlı Yayın'}`
        });
    });

    console.log(`✓ ${channels.length} kanal parse edildi (${catalogId})`);
    return channels;
}

function parseLiveMatches($, body) {
    const matches = [];

    // Futbol maçları tab1'den
    $('div.channel-list[id="tab1"] li a[data-url]').each((i, el) => {
        const $el = $(el);
        const url = $el.attr('data-url');
        const name = $el.find('div.name').text().trim();
        const time = $el.find('time').text().trim();

        // Logo'yu bul - data-url içindeki #poster= parametresinden
        let logo = null;
        if (url && url.includes('#poster=')) {
            try {
                const posterMatch = url.match(/#poster=([^&]+)/);
                if (posterMatch && posterMatch[1]) {
                    logo = decodeURIComponent(posterMatch[1]);
                }
            } catch (e) {
                console.log(`Logo decode hatası (live match): ${e.message}`);
            }
        }

        // Alternatif: img tag veya data attribute
        if (!logo) {
            logo = $el.find('img').attr('src') ||
                $el.find('img').attr('data-src') ||
                $el.attr('data-logo') ||
                $el.attr('data-image') ||
                null;
        }

        if (!url || !name) return;

        const id = 'selcukshd:match:' + Buffer.from(url).toString('base64').replace(/=/g, '');

        // Logo URL'ini tam hale getir
        let posterUrl = `https://via.placeholder.com/300x450/ff0000/ffffff?text=${encodeURIComponent('CANLI')}`;
        if (logo) {
            if (logo.startsWith('http')) {
                posterUrl = logo;
            } else if (logo.startsWith('//')) {
                posterUrl = 'https:' + logo;
            } else if (logo.startsWith('/')) {
                posterUrl = BASE_URL + logo;
            } else if (!logo.startsWith('data:')) {
                // data: URI değilse BASE_URL ekle
                posterUrl = BASE_URL + '/' + logo;
            }
        }

        matches.push({
            id: id,
            type: 'tv',
            name: `🔴 ${name}`,
            poster: posterUrl,
            posterShape: 'square',
            description: `Canlı: ${name} - ${time}`
        });
    });

    console.log(`✓ ${matches.length} canlı maç parse edildi`);
    return matches;
}

// Kanal kategorilerine göre regex filtreleme
function getChannelFilter(catalogId) {
    const filters = {
        'selcukshd_bein_sports': /bein\s*sports|beIN\s*SPORTS/i,
        'selcukshd_s_sport': /^s\s*sport|S\s*Sport/i,
        'selcukshd_tivibu_spor': /tivibu\s*spor|Tivibu\s*Spor/i,
        'selcukshd_tabii_spor': /tabii\s*spor|tabii\s*Spor/i,
        'selcukshd_other_sports': /eurosport|nba\s*tv|trt\s*spor|a\s*spor|smart\s*spor|dazn|ufc|sky\s*sports|motor|nat\s*geo|discovery|history|bbc|nfl|mlb/i
    };
    return filters[catalogId] || null;
}

// processFetchResult fonksiyonu içinde kullanım:
async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata } = fetchResult;

    console.log(`\n⚙️ [SelcukSportsHD Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    const $ = require('cheerio').load(body);

    if (purpose === 'catalog') {
        const catalogId = metadata?.catalogId;
        let metas = [];

        if (catalogId === 'selcukshd_live_matches') {
            metas = parseLiveMatches($, body);
        } else {
            metas = parseChannels($, catalogId, body);
        }

        // Benzersiz hale getir
        const uniqueMetas = Array.from(new Map(metas.map(item => [item.name, item])).values());

        console.log(`✅ Found ${uniqueMetas.length} items in catalog`);
        return { metas: uniqueMetas };
    }

    if (purpose === 'meta') {
        const title = $('title').text().trim() ||
            $('h1').first().text().trim() ||
            'Canlı Yayın';

        // Logo'yu HTML'den bul
        let logo = $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content') ||
            $('img.channel-logo').attr('src') ||
            $('img.logo').attr('src') ||
            $('.channel-info img').first().attr('src') ||
            null;

        // Logo URL'ini tam hale getir
        let posterUrl = `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=${encodeURIComponent(title)}`;
        let backgroundUrl = `https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=${encodeURIComponent(title)}`;

        if (logo) {
            if (logo.startsWith('http')) {
                posterUrl = logo;
                backgroundUrl = logo;
            } else if (logo.startsWith('//')) {
                posterUrl = 'https:' + logo;
                backgroundUrl = 'https:' + logo;
            } else if (logo.startsWith('/')) {
                posterUrl = BASE_URL + logo;
                backgroundUrl = BASE_URL + logo;
            } else if (!logo.startsWith('data:')) {
                posterUrl = BASE_URL + '/' + logo;
                backgroundUrl = BASE_URL + '/' + logo;
            }
        }

        return {
            meta: {
                id: 'selcukshd:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                type: 'tv',
                name: title,
                poster: posterUrl,
                posterShape: 'square',
                background: backgroundUrl,
                description: `${title} - Canlı Yayın`,
                genres: ['Spor', 'Canlı TV']
            }
        };
    }

    if (purpose === 'stream') {
        const streams = [];
        const fullPlayerUrl = metadata?.originalPlayerUrl || url;

        // M3U8 linkini bul
        const m3u8Patterns = [
            /this\.baseStreamUrl\s*=\s*["']([^"']+)["']/i,
            /https?:\/\/[a-z0-9]+\.[a-z0-9]+\.[a-z0-9.]+\/[^"'\s]*playlist\.m3u8/gi,
            /https?:\/\/[a-z0-9]+\.[a-z0-9]+\.[a-z0-9.]+\/[^"'\s]*index\.m3u8/gi,
            /["']?file["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
            /["']?source["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
            /["']?url["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
            /(https?:\/\/[^"'\s<>]+\.m3u8[^\s"'<>]*)/gi
        ];

        let m3u8Link = null;

        for (let i = 0; i < m3u8Patterns.length; i++) {
            const pattern = m3u8Patterns[i];
            const matches = body.match(pattern);
            if (matches) {
                m3u8Link = matches[1] || matches[0];
                m3u8Link = m3u8Link.replace(/\\/g, '').replace(/\\"/g, '"');

                if (i === 0) {
                    const urlParams = new URLSearchParams(new URL(fullPlayerUrl).search);
                    const streamId = urlParams.get('id') || 'selcukbeinsports1';
                    m3u8Link = `${m3u8Link}${streamId}/playlist.m3u8`;
                }
                break;
            }
        }

        if (m3u8Link) {
            const m3u8Origin = new URL(m3u8Link).origin;
            const playerReferer = new URL(fullPlayerUrl).origin + '/';
            const streamHeaders = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                'Referer': playerReferer,
                'Origin': m3u8Origin
            };
            streams.push({
                name: 'SelcukSportsHD',
                title: 'SelcukSportsHD (M3U8 + Headers)',
                url: m3u8Link,
                behaviorHints: {
                    notWebReady: true,
                    bingeGroup: 'selcukshd-live',
                    proxyHeaders: {
                        request: streamHeaders
                    }
                }

            });

            streams.push({
                name: 'SelcukSportsHD (Header\'sız)',
                title: 'SelcukSportsHD (M3U8)',
                url: m3u8Link,
                behaviorHints: {
                    notWebReady: true,
                    bingeGroup: 'selcukshd-live'
                }
            });
        } else {
            streams.push({
                name: 'SelcukSportsHD (İframe)',
                title: 'SelcukSportsHD (İframe Player)',
                url: fullPlayerUrl,
                behaviorHints: {
                    notWebReady: false,
                    bingeGroup: 'selcukshd-live'
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

        console.log(`✅ Found ${streams.length} stream(s)`);
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
    processFetchResult,
    // Dinamik URL desteği
    getDynamicBaseUrls,
    setDynamicBaseUrl
};





