const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.webspor',
    version: '1.0.0',
    name: 'Webspor HD',
    description: 'Canlı spor kanalları ve maç yayınları - Webspor için Stremio eklentisi',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv', 'channel'],
    catalogs: [
        {
            type: 'tv',
            id: 'webspor_live_matches',
            name: '🔴 Canlı Maçlar',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'webspor_bein_sports',
            name: '⚽ beIN SPORTS',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'webspor_tivibu_spor',
            name: '📺 Tivibu Spor',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'webspor_s_sport',
            name: '🏀 S Sport',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'webspor_general_channels',
            name: '📡 Genel Kanallar',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'webspor_all_channels',
            name: '📺 Tüm Kanallar (7/24)',
            extra: [{ name: 'skip', isRequired: false }]
        }
    ],
    idPrefixes: ['webspor']
};

const BASE_URL = 'https://www.webspor123.xyz';

// Kanal kategorilerine göre regex filtreleme
function getChannelFilter(catalogId) {
    const filters = {
        'webspor_bein_sports': /bein\s*sports|beIN\s*SPORTS/i,
        'webspor_tivibu_spor': /tivibu\s*spor/i,
        'webspor_s_sport': /^s\s*sport/i,
        'webspor_general_channels': /^trt|^tv\s*8|^a\s*haber|^ntv|^cnn/i
    };
    return filters[catalogId] || null;
}

// ============ INSTRUCTION HANDLERS ============
// Webspor için özel instruction ayarları
async function handleCatalog(args) {
    console.log('\n🎯 [Webspor Catalog] Generating instructions with anti-bot config...');
    console.log('📋 Catalog ID:', args.id);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `webspor-catalog-${args.id}-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: 'https://www.webspor123.xyz',
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                'Referer': 'https://www.webspor123.xyz/',
                'Origin': 'https://www.webspor123.xyz',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            },
            metadata: {
                catalogId: args.id,
                waitTime: 5000  // Cloudflare için 5 saniye bekleme
            },
            allowInsecure: true,  // ⚡ SSL hatalarını görmezden gel
            forceWebView: true  // ÖNEMLİ: WebView'i zorla kullan
        }]
    };
}

async function handleStream(args) {
    const urlBase64 = args.id.replace('webspor:channel:', '').replace('webspor:match:', '');
    const playerUrl = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`🎬 [Webspor Stream] Generating instructions for: ${playerUrl.substring(0, 80)}...`);

    // URL'yi tam hale getir
    let fullPlayerUrl = playerUrl;
    if (!fullPlayerUrl.startsWith('http')) {
        if (fullPlayerUrl.startsWith('//')) {
            fullPlayerUrl = 'https:' + fullPlayerUrl;
        } else if (fullPlayerUrl.startsWith('/')) {
            fullPlayerUrl = 'https://www.webspor123.xyz' + fullPlayerUrl;
        } else {
            fullPlayerUrl = 'https://www.webspor123.xyz/' + fullPlayerUrl;
        }
    }

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `webspor-stream-${Date.now()}-${randomId}`;

    // Player sayfası için instruction (Clappr player ile HLS stream bulunması için)
    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: fullPlayerUrl,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                'Referer': 'https://www.webspor123.xyz/',
                'Origin': 'https://www.webspor123.xyz',
                'Sec-Fetch-Dest': 'iframe',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin'
            },
            metadata: {
                originalPlayerUrl: fullPlayerUrl,
                waitTime: 5000,  // Clappr player yüklenmesi için 5 saniye
                executeJs: true  // JavaScript'in çalışması gerekiyor
            },
            allowInsecure: true,
            forceWebView: true
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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL
            }
        }]
    };
}


// ============ FETCH RESULT PROCESSOR ============


// Webspor için geliştirilmiş channel parsing
function parseChannels($, catalogId, body) {
    const channels = [];

    console.log('🔍 [Parse] Starting improved channel parsing...');
    console.log('📄 [Parse] Body length:', body.length);

    // 1. Önce channel-list div'ini bul
    const channelList = $('#channel-list');
    if (channelList.length === 0) {
        console.log('⚠️ [Parse] #channel-list not found');
        return channels;
    }

    console.log('✅ [Parse] Found #channel-list container');

    // 2. .item class'ını ara (TV kanalları için)
    channelList.find('.item.tv').each((i, elem) => {
        const $item = $(elem);

        // Banner linklerini atla
        if ($item.find('img[alt*="Banner"]').length > 0) {
            return; // Skip banner ads
        }

        // Div içindeki data-url attribute'unu al
        const $dataDiv = $item.find('div[data-url]');
        if ($dataDiv.length === 0) {
            return;
        }

        let channelUrl = $dataDiv.attr('data-url');
        let channelName = $dataDiv.find('.name').text().trim();

        // Eğer name bulunamazsa, strong tag'inden al
        if (!channelName) {
            channelName = $dataDiv.find('strong').text().trim();
        }

        // Hala bulunamadıysa title attribute'undan al
        if (!channelName) {
            channelName = $dataDiv.attr('title') || '';
        }

        console.log(`   📺 Found channel: ${channelName}`);

        if (!channelName || !channelUrl) {
            return;
        }

        // URL'i tam hale getir
        if (!channelUrl.startsWith('http')) {
            if (channelUrl.startsWith('//')) {
                channelUrl = 'https:' + channelUrl;
            } else if (channelUrl.startsWith('/')) {
                channelUrl = 'https://www.webspor123.xyz' + channelUrl;
            } else {
                channelUrl = 'https://www.webspor123.xyz/' + channelUrl;
            }
        }

        // Katalog filtresini uygula
        if (catalogId !== 'webspor_live_matches' && catalogId !== 'webspor_all_channels') {
            const filter = getChannelFilter(catalogId);
            if (filter && !filter.test(channelName)) {
                return;
            }
        }

        const id = 'webspor:channel:' + Buffer.from(channelUrl).toString('base64').replace(/=/g, '');

        channels.push({
            id: id,
            type: 'tv',
            name: `📺 ${channelName}`,
            poster: `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=${encodeURIComponent(channelName)}`,
            posterShape: 'square',
            description: `${channelName} - Canlı Yayın`,
            genres: ['Spor', 'Canlı TV']
        });
    });

    // 3. Football matches'ı parse et
    channelList.find('.item.football').each((i, elem) => {
        const $item = $(elem);

        // Banner linklerini atla
        if ($item.find('img[alt*="Banner"]').length > 0) {
            return;
        }

        const $dataDiv = $item.find('div[data-url]');
        if ($dataDiv.length === 0) {
            return;
        }

        let matchUrl = $dataDiv.attr('data-url');
        let matchName = $dataDiv.find('.name').text().trim();
        let matchTime = $dataDiv.find('.time').text().trim();

        if (!matchName || !matchUrl) {
            return;
        }

        console.log(`   ⚽ Found match: ${matchName} at ${matchTime}`);

        // URL'i tam hale getir
        if (!matchUrl.startsWith('http')) {
            if (matchUrl.startsWith('//')) {
                matchUrl = 'https:' + matchUrl;
            } else if (matchUrl.startsWith('/')) {
                matchUrl = 'https://www.webspor123.xyz' + matchUrl;
            } else {
                matchUrl = 'https://www.webspor123.xyz/' + matchUrl;
            }
        }

        const id = 'webspor:match:' + Buffer.from(matchUrl).toString('base64').replace(/=/g, '');

        channels.push({
            id: id,
            type: 'tv',
            name: `⚽ ${matchName} ${matchTime ? `(${matchTime})` : ''}`,
            poster: `https://via.placeholder.com/300x450/ff0000/ffffff?text=${encodeURIComponent('CANLI')}`,
            posterShape: 'square',
            description: `Canlı Maç: ${matchName} - ${matchTime}`,
            genres: ['Spor', 'Futbol', 'Canlı']
        });
    });

    // 4. Basketball matches
    channelList.find('.item.basketball').each((i, elem) => {
        const $item = $(elem);

        if ($item.find('img[alt*="Banner"]').length > 0) {
            return;
        }

        const $dataDiv = $item.find('div[data-url]');
        if ($dataDiv.length === 0) {
            return;
        }

        let matchUrl = $dataDiv.attr('data-url');
        let matchName = $dataDiv.find('.name').text().trim();
        let matchTime = $dataDiv.find('.time').text().trim();

        if (!matchName || !matchUrl) {
            return;
        }

        if (!matchUrl.startsWith('http')) {
            if (matchUrl.startsWith('//')) {
                matchUrl = 'https:' + matchUrl;
            } else if (matchUrl.startsWith('/')) {
                matchUrl = 'https://www.webspor123.xyz' + matchUrl;
            } else {
                matchUrl = 'https://www.webspor123.xyz/' + matchUrl;
            }
        }

        const id = 'webspor:match:' + Buffer.from(matchUrl).toString('base64').replace(/=/g, '');

        channels.push({
            id: id,
            type: 'tv',
            name: `🏀 ${matchName} ${matchTime ? `(${matchTime})` : ''}`,
            poster: `https://via.placeholder.com/300x450/ff6600/ffffff?text=${encodeURIComponent('BASKET')}`,
            posterShape: 'square',
            description: `Canlı Basketbol: ${matchName} - ${matchTime}`,
            genres: ['Spor', 'Basketbol', 'Canlı']
        });
    });

    console.log(`✅ [Parse] Total channels found: ${channels.length}`);

    return channels;
}

// Kanal kategorilerine göre regex filtreleme
function getChannelFilter(catalogId) {
    const filters = {
        'webspor_bein_sports': /bein\s*sports|beIN\s*SPORTS/i,
        'webspor_tivibu_spor': /tivibu\s*spor/i,
        'webspor_s_sport': /^s\s*sport/i,
        'webspor_general_channels': /^trt|^tv\s*8|^a\s*haber|^ntv|^cnn/i
    };
    return filters[catalogId] || null;
}


// Canlı maçları parse et
function parseLiveMatches($, body) {
    const matches = [];

    // Maç kartlarını bul (genellikle maç saati içerenler)
    $('[class*="match"], [class*="game"], .card').each((i, elem) => {
        const $card = $(elem);
        const text = $card.text().trim();

        // Maç saati formatını kontrol et (örn: "20:30", "21:00")
        const timeMatch = text.match(/\d{2}:\d{2}/);

        if (timeMatch) {
            const matchTime = timeMatch[0];

            // Maç adını bul (saati çıkar)
            let matchName = text.replace(matchTime, '').trim();

            // Takım adlarını temizle
            matchName = matchName.replace(/\s+/g, ' ').trim();

            if (!matchName || matchName.length < 3) return;

            // Maç linkini bul
            let matchLink = $card.find('a').attr('href') ||
                $card.parent('a').attr('href') ||
                $card.attr('data-href');

            if (!matchLink) return;

            // Tam URL'i oluştur
            if (!matchLink.startsWith('http')) {
                if (matchLink.startsWith('//')) {
                    matchLink = 'https:' + matchLink;
                } else if (matchLink.startsWith('/')) {
                    matchLink = BASE_URL + matchLink;
                } else {
                    matchLink = BASE_URL + '/' + matchLink;
                }
            }

            const id = 'webspor:match:' + Buffer.from(matchLink).toString('base64').replace(/=/g, '');

            matches.push({
                id: id,
                type: 'tv',
                name: `🔴 ${matchName} (${matchTime})`,
                poster: `https://via.placeholder.com/300x450/ff0000/ffffff?text=${encodeURIComponent('CANLI')}`,
                posterShape: 'square',
                description: `Canlı: ${matchName} - ${matchTime}`
            });
        }
    });

    return matches;
}

async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata } = fetchResult;

    console.log(`\n⚙️ [Webspor Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    const $ = cheerio.load(body);

    if (purpose === 'catalog') {
        const catalogId = metadata?.catalogId;
        let metas = [];

        if (catalogId === 'webspor_live_matches') {
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

        console.log('🔍 [Stream Parser] Analyzing Clappr player page...');
        console.log('📄 [Stream Parser] Body length:', body.length);

        // M3U8 linkini bul - Clappr player için geliştirilmiş pattern'ler
        const m3u8Patterns = [
            // Clappr player source patterns
            /source\s*:\s*["']([^"']+\.m3u8[^"']*)["']/gi,
            /sources\s*:\s*\[\s*["']([^"']+\.m3u8[^"']*)["']/gi,
            /new\s+Clappr\.Player\s*\([^)]*source\s*:\s*["']([^"']+\.m3u8[^"']*)["']/gi,

            // Generic HLS patterns
            /file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/gi,
            /src\s*:\s*["']([^"']+\.m3u8[^"']*)["']/gi,
            /url\s*:\s*["']([^"']+\.m3u8[^"']*)["']/gi,
            /hlsUrl\s*:\s*["']([^"']+\.m3u8[^"']*)["']/gi,

            // Direct URL patterns (en son dene)
            /(https?:\/\/[^"'\s<>]+\.m3u8[^\s"'<>]*)/gi,

            // Data attribute patterns
            /data-src\s*=\s*["']([^"']+\.m3u8[^"']*)["']/gi,
            /data-url\s*=\s*["']([^"']+\.m3u8[^"']*)["']/gi,

            // Variable assignments
            /var\s+\w+\s*=\s*["']([^"']+\.m3u8[^"']*)["']/gi,
            /let\s+\w+\s*=\s*["']([^"']+\.m3u8[^"']*)["']/gi,
            /const\s+\w+\s*=\s*["']([^"']+\.m3u8[^"']*)["']/gi
        ];

        let m3u8Links = [];

        // Tüm pattern'leri dene ve bulunan linkleri topla
        for (let i = 0; i < m3u8Patterns.length; i++) {
            const pattern = m3u8Patterns[i];
            const matches = [...body.matchAll(pattern)];

            for (const match of matches) {
                let link = match[1] || match[0];
                if (link) {
                    link = link.replace(/\\/g, '').replace(/\\"/g, '"').trim();

                    // Geçerli m3u8 linki mi kontrol et
                    if (link.includes('.m3u8') && link.length > 10) {
                        console.log(`✓ M3U8 bulundu (Pattern #${i + 1}): ${link.substring(0, 100)}...`);
                        m3u8Links.push(link);
                    }
                }
            }
        }

        // Tekrar edenleri kaldır
        m3u8Links = [...new Set(m3u8Links)];

        // Iframe içindeki player linkini de kontrol et
        const iframeSrc = $('iframe').attr('src') || $('iframe').attr('data-src');
        if (iframeSrc && !iframeSrc.includes('banner') && !iframeSrc.includes('ads')) {
            console.log(`✓ Iframe bulundu: ${iframeSrc}`);
        }

        if (m3u8Links.length > 0) {
            console.log(`✅ Toplam ${m3u8Links.length} M3U8 link bulundu`);

            // Her M3U8 linki için stream seçeneği oluştur
            m3u8Links.forEach((m3u8Link, index) => {
                // M3U8 linki tam URL değilse, tamamla
                let fullM3u8 = m3u8Link;
                if (!fullM3u8.startsWith('http')) {
                    if (fullM3u8.startsWith('//')) {
                        fullM3u8 = 'https:' + fullM3u8;
                    } else if (fullM3u8.startsWith('/')) {
                        try {
                            const playerOrigin = new URL(fullPlayerUrl).origin;
                            fullM3u8 = playerOrigin + fullM3u8;
                        } catch (e) {
                            fullM3u8 = 'https://www.webspor123.xyz' + fullM3u8;
                        }
                    }
                }

                // Referer ve Origin belirle
                let playerReferer = 'https://www.webspor123.xyz/';
                let m3u8Origin = 'https://www.webspor123.xyz';

                try {
                    playerReferer = new URL(fullPlayerUrl).origin + '/';
                    m3u8Origin = new URL(fullM3u8).origin;
                } catch (e) {
                    console.log(`⚠️ URL parse hatası: ${e.message}`);
                }

                const streamHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                    'Referer': playerReferer,
                    'Origin': m3u8Origin,
                    'Accept': '*/*',
                    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
                };

                // Header'lı versiyon
                streams.push({
                    name: `Webspor HD ${index > 0 ? `(${index + 1})` : ''}`,
                    title: `Webspor HD Stream ${index + 1} (Headers)`,
                    url: fullM3u8,
                    behaviorHints: {
                        notWebReady: true,
                        bingeGroup: 'webspor-live',
                        proxyHeaders: {
                            request: streamHeaders
                        }
                    }
                });

                // Header'sız versiyon
                streams.push({
                    name: `Webspor (Header'sız ${index + 1})`,
                    title: `Webspor Stream ${index + 1} (No Headers)`,
                    url: fullM3u8,
                    behaviorHints: {
                        notWebReady: true,
                        bingeGroup: 'webspor-live'
                    }
                });
            });
        } else {
            console.log(`⚠️ M3U8 bulunamadı, iframe player kullanılacak`);

            // İframe stream seçeneği
            streams.push({
                name: 'Webspor HD (İframe)',
                title: 'Webspor HD (İframe Player)',
                url: fullPlayerUrl,
                behaviorHints: {
                    notWebReady: false,
                    bingeGroup: 'webspor-live'
                }
            });
        }

        // Her durumda external player seçeneği ekle
        streams.push({
            name: '🌐 Tarayıcıda Aç',
            title: 'Tarayıcıda Oynat',
            externalUrl: fullPlayerUrl,
            behaviorHints: {
                notWebReady: true
            }
        });

        console.log(`✅ Toplam ${streams.length} stream seçeneği hazırlandı`);
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

};

