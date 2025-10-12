const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.selcuksports',
    version: '2.0.0',
    name: 'SelcukSports HD',
    description: 'Canlı spor kanalları - SelcukSports için Stremio eklentisi (Instruction Mode)',
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

const BASE_URL = 'https://www.sporcafe-2fd65c4bc314.xyz/';
const PLAYER_BASE_URL = 'https://main.uxsyplayerb03b3c895b.click/index.php?id=';

// Kanal kategorilerine göre regex filtreleme
function getChannelFilter(catalogId) {
    const filters = {
        'selcuk_bein_sports': /bein\s*sports|beIN\s*SPORTS/i,
        'selcuk_s_sport': /^s\s*sport/i,
        'selcuk_tivibu_spor': /tivibu\s*spor/i,
        'selcuk_tabii_spor': /tabii\s*spor/i,
        'selcuk_other_sports': /eurosport|nba\s*tv|trt\s*spor|a\s*spor|smart\s*spor|dazn|ufc|sky\s*sports|motor/i
    };
    return filters[catalogId] || null;
}

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [SelcukSports Catalog] Generating instructions...');
    console.log('📋 Catalog ID:', args.id);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `selcuk-catalog-${args.id}-${Date.now()}-${randomId}`;
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
    const urlBase64 = args.id.replace('selcuk:channel:', '').replace('selcuk:match:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`📺 [SelcukSports Meta] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `selcuk-meta-${Date.now()}-${randomId}`;
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
    const urlBase64 = args.id.replace('selcuk:channel:', '').replace('selcuk:match:', '');
    const playerUrl = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`🎬 [SelcukSports Stream] Generating instructions for: ${playerUrl.substring(0, 80)}...`);

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
    const requestId = `selcuk-stream-${Date.now()}-${randomId}`;
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

    // JavaScript'teki channelsData array'ini çıkar
    const scriptMatch = body.match(/const\s+channelsData\s*=\s*(\[[\s\S]*?\])\s*;/);
    if (!scriptMatch) {
        console.log('⚠️ channelsData bulunamadı');
        return channels;
    }

    let channelsData;
    try {
        // JSON.parse için noktalı virgülü çıkarıyoruz
        const jsonStr = scriptMatch[1].trim();
        channelsData = JSON.parse(jsonStr);
        console.log(`✓ channelsData parse edildi: ${channelsData.length} kanal`);
    } catch (e) {
        console.log(`⚠️ channelsData JSON parse hatası: ${e.message}`);
        console.log(`   İlk 200 karakter: ${scriptMatch[1].substring(0, 200)}`);
        return channels;
    }

    // Kategori filtresini belirle
    let targetCategory = null;
    if (catalogId === 'selcuk_bein_sports') {
        // beIN SPORTS kanalları - category'ye bakmadan isimle filtrele
    } else if (catalogId === 'selcuk_s_sport') {
        // S Sport kanalları - category'ye bakmadan isimle filtrele
    } else if (catalogId === 'selcuk_tivibu_spor') {
        // Tivibu Spor kanalları - category'ye bakmadan isimle filtrele
    } else if (catalogId === 'selcuk_tabii_spor') {
        // tabii Spor kanalları - category'ye bakmadan isimle filtrele
    } else if (catalogId === 'selcuk_other_sports') {
        // Diğer spor kanalları - category'ye bakmadan isimle filtrele
    } else if (catalogId === 'selcuk_all_channels') {
        // Tüm kanallar - hiç filtreleme yok
    }

    // Kanalları işle
    channelsData.forEach(channel => {
        const streamId = channel.stream_url;
        const channelName = channel.name;

        if (!streamId || !channelName) return;

        // Katalog filtresine göre kontrol et
        if (catalogId !== 'selcuk_live_matches' && catalogId !== 'selcuk_all_channels') {
            const filter = getChannelFilter(catalogId);
            if (filter && !filter.test(channelName)) return;
        }

        // Player URL'ini oluştur
        const fullUrl = PLAYER_BASE_URL + streamId;

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
function parseLiveMatches($, body) {
    const matches = [];

    // JavaScript'teki channelsData array'ini çıkar
    const scriptMatch = body.match(/const\s+channelsData\s*=\s*(\[[\s\S]*?\])\s*;/);
    if (!scriptMatch) {
        console.log('⚠️ channelsData bulunamadı (live matches)');
        return matches;
    }

    let channelsData;
    try {
        // JSON.parse için noktalı virgülü çıkarıyoruz
        const jsonStr = scriptMatch[1].trim();
        channelsData = JSON.parse(jsonStr);
        console.log(`✓ channelsData parse edildi: ${channelsData.length} kanal (live matches)`);
    } catch (e) {
        console.log(`⚠️ channelsData JSON parse hatası: ${e.message}`);
        console.log(`   İlk 200 karakter: ${scriptMatch[1].substring(0, 200)}`);
        return matches;
    }

    // Tüm kanalları canlı maç olarak göster
    channelsData.forEach(channel => {
        const streamId = channel.stream_url;
        const matchName = channel.name;

        if (!streamId || !matchName) return;

        // Player URL'ini oluştur
        const fullUrl = PLAYER_BASE_URL + streamId;

        const id = 'selcuk:match:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

        matches.push({
            id: id,
            type: 'tv',
            name: `🔴 ${matchName}`,
            poster: `https://via.placeholder.com/300x450/ff0000/ffffff?text=${encodeURIComponent('CANLI')}`,
            posterShape: 'square',
            description: `Canlı: ${matchName}`
        });
    });

    return matches;
}

async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata } = fetchResult;

    console.log(`\n⚙️ [SelcukSports Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    const $ = cheerio.load(body);

    if (purpose === 'catalog') {
        const catalogId = metadata?.catalogId;
        let metas = [];

        if (catalogId === 'selcuk_live_matches') {
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
                id: 'selcuk:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
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

        // M3U8 linkini bul - SelcukSports için özel pattern'ler
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
            const matches = body.match(pattern);
            if (matches) {
                m3u8Link = matches[1] || matches[0];
                m3u8Link = m3u8Link.replace(/\\/g, '').replace(/\\"/g, '"');

                // Eğer baseStreamUrl pattern'i ise (ilk pattern)
                if (i === 0) {
                    baseStreamUrl = m3u8Link;
                    console.log(`✓ baseStreamUrl bulundu: ${baseStreamUrl}`);

                    // URL'den streamId'yi çıkar
                    const urlParams = new URLSearchParams(new URL(fullPlayerUrl).search);
                    const streamId = urlParams.get('id') || 'selcukbeinsports1';

                    // M3U8 linkini oluştur
                    m3u8Link = `${baseStreamUrl}${streamId}/playlist.m3u8`;
                    console.log(`✓ M3U8 linki oluşturuldu: ${m3u8Link}`);
                } else {
                    console.log(`✓ M3U8 bulundu (Pattern #${i + 1}): ${m3u8Link.substring(0, 80)}...`);
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
        } else {
            console.log(`⚠️ M3U8 bulunamadı, iframe player kullanılacak`);

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
