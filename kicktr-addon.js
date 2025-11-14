const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.kicktr',
    version: '1.0.0',
    name: 'Kick.com TR',
    description: 'Türk yayıncılar ve popüler Kick.com canlı yayınları - Takipçi sayıları ve doğrulanmış hesaplar',
    logo: 'https://play-lh.googleusercontent.com/66czInHo_spTFWwLVYntxW8Fa_FHCDRPnd3y0HT14_xz6xb_lqSv005ARvdkJJE2TA=s256-rw',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    catalogs: [
        {
            type: 'tv',
            id: 'kicktr_canli',
            name: '🇹🇷 Şu anda Canlı Türk Yayıncılar',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'kicktr_populer',
            name: '🔥 Popüler Kanallar',
            extra: []
        },
        {
            type: 'tv',
            id: 'kicktr_search',
            name: '🔍 Yayıncı Ara',
            extra: [
                { name: 'search', isRequired: true }
            ]
        }
    ],
    idPrefixes: ['kicktr']
};

const BASE_URL = 'https://kick.com';
const AEROKICK_BASE = 'https://aerokick.app';
const AEROKICK_API = 'https://api.aerokick.app/api/v1';

// Takipçi sayısını formatla
function formatFollowers(count) {
    if (!count) return null;
    if (count >= 1000000) {
        return `${(Math.round(count / 100000) / 10)} Mn`;
    }
    if (count >= 1000) {
        return `${(Math.round(count / 100) / 10)} B`;
    }
    return count.toString();
}

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [KickTR Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 20) + 1;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalog
    if (catalogId === 'kicktr_search' && searchQuery) {
        const encodedQuery = encodeURIComponent(searchQuery);
        const requestId = `kicktr-search-${Date.now()}-${randomId}`;

        return {
            instructions: [{
                requestId,
                purpose: 'catalog_search',
                url: `${AEROKICK_API}/stats/search?q=${encodedQuery}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            }]
        };
    }

    // Popüler Kanallar
    if (catalogId === 'kicktr_populer') {
        const requestId = `kicktr-populer-${Date.now()}-${randomId}`;

        return {
            instructions: [{
                requestId,
                purpose: 'catalog_popular',
                url: `${AEROKICK_BASE}/stats/channels?page=1`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            }]
        };
    }

    // Canlı Yayınlar
    if (catalogId === 'kicktr_canli') {
        const limit = 20;
        const requestId = `kicktr-live-${page}-${Date.now()}-${randomId}`;

        return {
            instructions: [{
                requestId,
                purpose: 'catalog_live',
                url: `${BASE_URL}/stream/livestreams/tr?page=${page}&limit=${limit}&sort=desc&strict=true`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                metadata: { page }
            }]
        };
    }

    return { instructions: [] };
}

async function handleMeta(args) {
    const streamerName = args.id.replace('kicktr:', '');

    console.log(`📺 [KickTR Meta] Generating instructions for: ${streamerName}`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `kicktr-meta-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: `${BASE_URL}/api/v2/channels/${streamerName}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            metadata: { streamerName }
        }]
    };
}

async function handleStream(args) {
    const streamerName = args.id.replace('kicktr:', '');

    console.log(`🎬 [KickTR Stream] Generating instructions for: ${streamerName}`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `kicktr-stream-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: `${BASE_URL}/api/v2/channels/${streamerName}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            metadata: { streamerName }
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata } = fetchResult;

    console.log(`\n⚙️ [KickTR Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    // Catalog Search
    if (purpose === 'catalog_search') {
        try {
            const data = JSON.parse(body);
            const results = data?.streamers?.hits || [];

            const metas = [];

            results.forEach(item => {
                const channelSlug = item.slug;
                const channelName = item.username;
                const poster = item.avatar;
                const followers = item.followers;
                const isVerified = item.verified === true;

                if (!channelSlug || !channelName) return;

                // İsim formatlama
                let displayName = channelName;
                if (isVerified) {
                    displayName += ' ✅';
                }
                const formattedFollowers = formatFollowers(followers);
                if (formattedFollowers) {
                    displayName += ` (${formattedFollowers} Takipçi)`;
                }

                const id = `kicktr:${channelSlug}`;

                metas.push({
                    id: id,
                    type: 'tv',
                    name: displayName,
                    poster: poster || null
                });
            });

            console.log(`✅ Found ${metas.length} search results`);
            return { metas };
        } catch (error) {
            console.log('❌ Search parse error:', error.message);
            return { metas: [] };
        }
    }

    // Catalog Popular
    if (purpose === 'catalog_popular') {
        try {
            const $ = cheerio.load(body);
            const metas = [];

            $('a[href^="/stats/channels/"]').each((i, elem) => {
                const href = $(elem).attr('href');
                const channelName = href.split('/').pop();
                if (!channelName) return;

                // Poster - blur olmayan img'yi al
                const posterElement = $(elem).find('div.inset-0 img:not([class*="blur"])').first();
                let posterUrl = posterElement.attr('src');
                if (!posterUrl) {
                    posterUrl = $(elem).find('div.inset-0 img:last-of-type').attr('src');
                }

                const displayName = $(elem).find('button').text().trim() || channelName;

                const id = `kicktr:${channelName}`;

                metas.push({
                    id: id,
                    type: 'tv',
                    name: displayName,
                    poster: posterUrl || null
                });
            });

            console.log(`✅ Found ${metas.length} popular channels`);
            return { metas };
        } catch (error) {
            console.log('❌ Popular channels parse error:', error.message);
            return { metas: [] };
        }
    }

    // Catalog Live
    if (purpose === 'catalog_live') {
        try {
            const data = JSON.parse(body);
            const results = data?.data || [];
            const currentPage = data?.current_page || metadata?.page || 1;
            const lastPage = data?.last_page || currentPage;
            const hasNext = currentPage < lastPage;

            const metas = [];

            results.forEach(stream => {
                const channelInfo = stream.channel;
                const channelSlug = channelInfo?.slug;
                const userInfo = channelInfo?.user;
                const streamerName = userInfo?.username || 'Bilinmeyen';
                const channelProfilePic = userInfo?.profilepic;

                const title = stream.session_title || streamerName;
                const poster = stream.thumbnail?.src || channelProfilePic;

                if (!channelSlug) return;

                const displayName = stream.session_title
                    ? `${streamerName} - ${stream.session_title}`
                    : title;

                const id = `kicktr:${channelSlug}`;

                metas.push({
                    id: id,
                    type: 'tv',
                    name: displayName,
                    poster: poster || null
                });
            });

            console.log(`✅ Found ${metas.length} live streams (hasNext: ${hasNext})`);
            return { metas, hasNext };
        } catch (error) {
            console.log('❌ Live streams parse error:', error.message);
            return { metas: [] };
        }
    }

    // Meta
    if (purpose === 'meta') {
        try {
            const data = JSON.parse(body);
            const user = data?.user;
            const livestream = data?.livestream;

            if (!user?.username) {
                return { meta: null };
            }

            let finalUsername = user.username;
            const isVerified = user.verified === true;
            if (isVerified) {
                finalUsername += ' ✅';
            }

            const followersFormatted = formatFollowers(user.followersCount);

            if (livestream?.is_live === true) {
                // Canlı yayında
                const title = livestream.session_title || finalUsername;
                const poster = livestream.thumbnail_url || data.thumbnail || user.profile_pic;
                const category = livestream.categories?.[0];

                let plot = `👤 Kick Yayıncısı: ${finalUsername}\n`;
                if (followersFormatted) plot += `👥 Takipçi: ${followersFormatted}\n`;
                if (category?.name) plot += `🎮🎧 Yayın Kategorisi: ${category.name}\n`;
                plot += `👀 Anlık İzleyici: ${livestream.viewer_count || 'Bilinmiyor'}`;
                if (user.bio) plot += `\n\n📜 Hakkında:\n${user.bio}`;

                const tags = [];
                if (category?.name) tags.push(category.name);

                return {
                    meta: {
                        id: `kicktr:${metadata.streamerName}`,
                        type: 'tv',
                        name: title,
                        poster: poster || null,
                        background: poster || null,
                        description: plot.trim(),
                        genres: tags.length > 0 ? tags : undefined
                    }
                };
            } else {
                // Çevrimdışı
                const offlineMessage = '🚦 Yayın Durumu: ⛔ Şu anda çevrimdışı.\nSadece canlı yayın varken izleyebilirsiniz.';

                let plot = `👤 Kick Yayıncısı: ${finalUsername}\n`;
                if (followersFormatted) plot += `👥 Takipçi: ${followersFormatted}\n`;
                plot += `\n${offlineMessage}`;
                if (user.bio) plot += `\n\n📜 Hakkında:\n${user.bio}`;

                return {
                    meta: {
                        id: `kicktr:${metadata.streamerName}`,
                        type: 'tv',
                        name: finalUsername,
                        poster: user.profile_pic || data.thumbnail || null,
                        background: user.profile_pic || data.thumbnail || null,
                        description: plot.trim(),
                        genres: ['Çevrimdışı']
                    }
                };
            }
        } catch (error) {
            console.log('❌ Meta parse error:', error.message);
            return { meta: null };
        }
    }

    // Stream
    if (purpose === 'stream') {
        try {
            const data = JSON.parse(body);
            const playbackUrl = data?.playback_url;
            const isLive = data?.livestream?.is_live === true;

            if (!isLive || !playbackUrl) {
                console.log('⚠️  Channel is offline or no playback URL');
                return { streams: [] };
            }

            const streams = [{
                name: 'Kick Canlı Yayın',
                title: 'Kick Canlı Yayın',
                url: playbackUrl,
                type: 'm3u8',
                behaviorHints: {
                    notWebReady: false
                }
            }];

            console.log(`✅ Stream URL found: ${playbackUrl.substring(0, 80)}...`);
            return { streams };
        } catch (error) {
            console.log('❌ Stream error:', error.message);
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


