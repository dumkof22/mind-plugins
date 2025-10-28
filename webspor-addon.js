const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.webspor',
    version: '1.0.0',
    name: 'Webspor',
    description: 'Canlı spor kanalları - Webspor için Stremio eklentisi (Instruction Mode)',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv', 'channel'],
    catalogs: [
        {
            type: 'tv',
            id: 'webspor_live_matches',
            name: '⚽ Canlı Maçlar (Futbol)',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'webspor_basketball',
            name: '🏀 Basketbol Maçları',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'webspor_tennis',
            name: '🎾 Tenis Maçları',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'webspor_all_channels',
            name: '📡 Tüm Kanallar (7/24)',
            extra: [{ name: 'skip', isRequired: false }]
        }
    ],
    idPrefixes: ['webspor']
};

// Base URL - Webspor domain'leri sürekli değişir, güncel olanı kullanın
// Not: Bu site bot koruması (cookie redirect) kullanıyor, WebView gereklidir
// UYARI: Site SSL sertifikası bozuk, allowInsecure: true zorunlu
// UYARI: Bazı ISP'ler bu siteyi blokluyor
const BASE_URL = 'https://webspor123.xyz';
const PLAYER_BASE_URL = 'https://main.uxsyplayerbcd362c475.click/index.php?id=';

// Alternatif domainler (eğer ana domain çalışmazsa)
const ALTERNATIVE_DOMAINS = [
    'https://webspor123.xyz',
    'https://webspor.live',
    'https://webspor.com',
];

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [Webspor Catalog] Generating instructions...');
    console.log('📋 Catalog ID:', args.id);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `webspor-catalog-${args.id}-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: BASE_URL,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                'Referer': BASE_URL,
                'Origin': BASE_URL
            },
            allowInsecure: true,
            followRedirects: true,
            forceWebView: true, // Cookie redirect için WebView zorunlu
            metadata: { catalogId: args.id }
        }]
    };
}

async function handleMeta(args) {
    const urlBase64 = args.id.replace('webspor:channel:', '').replace('webspor:match:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`📺 [Webspor Meta] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `webspor-meta-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: url,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                'Referer': BASE_URL
            },
            allowInsecure: true,
            followRedirects: true,
            forceWebView: true // Cookie redirect için WebView zorunlu
        }]
    };
}

async function handleStream(args) {
    const urlBase64 = args.id.replace('webspor:channel:', '').replace('webspor:match:', '');
    const playerUrl = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`🎬 [Webspor Stream] Generating instructions for: ${playerUrl.substring(0, 80)}...`);

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
    const requestId = `webspor-stream-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: fullPlayerUrl,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                'Referer': new URL(fullPlayerUrl).origin + '/'
            },
            allowInsecure: true,
            followRedirects: true,
            forceWebView: true, // Cookie redirect için WebView zorunlu
            metadata: { originalPlayerUrl: fullPlayerUrl }
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

// Kanalları parse et
function parseChannels($, catalogId, body) {
    const channels = [];

    // Farklı selector yapılarını dene
    const possibleSelectors = [
        '.channels .item',           // Eski yapı
        '.channel-list .channel',    // Yeni yapı 1
        '.item',                     // Genel item'lar
        '[data-url]',                // data-url attributeü olanlar
        'li.channel',                // Liste elemanları
        'div.match',                 // Maç elemanları
        '.live-channel',             // Canlı kanallar
        '.live-match'                // Canlı maçlar
    ];

    let foundItems = 0;

    for (const selector of possibleSelectors) {
        const items = $(selector);
        if (items.length > 0) {
            console.log(`✓ Selector bulundu: "${selector}" - ${items.length} eleman`);
            foundItems = items.length;
            break;
        }
    }

    if (foundItems === 0) {
        console.log('⚠️ Hiçbir selector eşleşmedi, HTML yapısını kontrol et');
        console.log('HTML preview (ilk 500 char):', body.substring(0, 500));

        // Alternatif: tüm linkleri bul
        const allLinks = $('a[href*="player"], a[href*="canli"], a[href*="mac"]');
        console.log(`🔍 Bulunan alternatif linkler: ${allLinks.length}`);

        allLinks.each((i, el) => {
            const $el = $(el);
            const href = $el.attr('href');
            const text = $el.text().trim();

            if (!href || !text || text.length < 3) return;
            if (href.includes('banner') || href.includes('ads')) return;

            const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
            const id = 'webspor:channel:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

            channels.push({
                id: id,
                type: 'tv',
                name: `📺 ${text}`,
                poster: `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=${encodeURIComponent(text)}`,
                posterShape: 'square',
                description: `${text} - Canlı Yayın`
            });
        });

        console.log(`✓ Alternatif yöntemle ${channels.length} kanal bulundu`);
        return channels;
    }

    // Eski selector mantığı - .channels .item selector'ı kullan
    $('.channels .item').each((i, el) => {
        const $el = $(el);

        // TV kanalları (7/24) veya maçlar için class kontrolü
        const isTv = $el.hasClass('tv') || $el.hasClass('channel');
        const isFootball = $el.hasClass('football') || $el.hasClass('futbol');
        const isBasketball = $el.hasClass('basketball') || $el.hasClass('basketbol');
        const isTennis = $el.hasClass('tennis') || $el.hasClass('tenis');

        // Katalog ID'sine göre filtreleme
        if (catalogId === 'webspor_all_channels' && !isTv) return;
        if (catalogId === 'webspor_live_matches' && !isFootball) return;
        if (catalogId === 'webspor_basketball' && !isBasketball) return;
        if (catalogId === 'webspor_tennis' && !isTennis) return;

        // Banner'ları atla - direkt içinde <a><img> olan elemanlar banner'dır
        // Normal kanallar: <div data-url><strong>...</strong></div>
        // Banner'lar: <a href><img></a>
        const hasDataUrl = $el.find('div[data-url]').length > 0;
        const hasImgLink = $el.find('a[href] img').length > 0;

        if (!hasDataUrl && hasImgLink) {
            // Bu bir banner
            return;
        }

        // Kanal veya maç bilgilerini al
        let url = null;
        let name = null;
        let timeOrLive = null;

        // data-url attribute içindeki div'i bul
        const $dataDiv = $el.find('div[data-url]');
        if ($dataDiv.length > 0) {
            url = $dataDiv.attr('data-url');
            name = $dataDiv.find('strong.name, .name, strong').first().text().trim();
            timeOrLive = $dataDiv.find('span.live, span.time, .live, .time').first().text().trim();
        }

        if (!url || !name || name.length < 2) return;

        const id = isTv ?
            'webspor:channel:' + Buffer.from(url).toString('base64').replace(/=/g, '') :
            'webspor:match:' + Buffer.from(url).toString('base64').replace(/=/g, '');

        let icon = '📺';
        let posterColor = '1a1a1a';

        if (isFootball) {
            icon = '⚽';
            posterColor = 'ff0000';
        } else if (isBasketball) {
            icon = '🏀';
            posterColor = 'ff8c00';
        } else if (isTennis) {
            icon = '🎾';
            posterColor = '00ff00';
        }

        channels.push({
            id: id,
            type: 'tv',
            name: `${icon} ${name}`,
            poster: `https://via.placeholder.com/300x450/${posterColor}/ffffff?text=${encodeURIComponent(name)}`,
            posterShape: 'square',
            description: `${name} - ${timeOrLive || 'Canlı Yayın'}`
        });
    });

    console.log(`✓ ${channels.length} kanal/maç parse edildi (${catalogId})`);
    return channels;
}

// processFetchResult fonksiyonu
async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata } = fetchResult;

    console.log(`\n⚙️ [Webspor Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);
    console.log(`📄 Body size: ${body?.length || 0} bytes`);
    console.log(`📋 Body type: ${typeof body}`);

    const $ = require('cheerio').load(body);

    if (purpose === 'catalog') {
        const catalogId = metadata?.catalogId;
        console.log(`📂 Catalog ID: ${catalogId}`);

        let metas = parseChannels($, catalogId, body);

        // Benzersiz hale getir
        const uniqueMetas = Array.from(new Map(metas.map(item => [item.name, item])).values());

        console.log(`✅ Found ${uniqueMetas.length} items in catalog`);
        if (uniqueMetas.length === 0) {
            console.log('⚠️ UYARI: Hiç item bulunamadı!');
            console.log('📄 HTML başlangıcı:', body.substring(0, 1000));
        }
        return { metas: uniqueMetas };
    }

    if (purpose === 'meta') {
        const title = $('title').text().trim() ||
            $('h1').first().text().trim() ||
            'Canlı Yayın';

        return {
            meta: {
                id: 'webspor:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                type: 'tv',
                name: title,
                poster: `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=${encodeURIComponent(title)}`,
                posterShape: 'square',
                background: `https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=${encodeURIComponent(title)}`,
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
                    const streamId = urlParams.get('id') || 'beinsports-1';
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
                name: 'Webspor',
                title: 'Webspor (M3U8 + Headers)',
                url: m3u8Link,
                behaviorHints: {
                    notWebReady: true,
                    bingeGroup: 'webspor-live',
                    proxyHeaders: {
                        request: streamHeaders
                    }
                }

            });

            streams.push({
                name: 'Webspor (Header\'sız)',
                title: 'Webspor (M3U8)',
                url: m3u8Link,
                behaviorHints: {
                    notWebReady: true,
                    bingeGroup: 'webspor-live'
                }
            });
        } else {
            streams.push({
                name: 'Webspor (İframe)',
                title: 'Webspor (İframe Player)',
                url: fullPlayerUrl,
                behaviorHints: {
                    notWebReady: false,
                    bingeGroup: 'webspor-live'
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
    processFetchResult
};

