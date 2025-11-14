const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.animecix',
    version: '1.0.0',
    name: 'AnimeciX',
    description: 'Türkçe anime izleme platformu - AnimeciX.tv için Stremio eklentisi',
    logo: 'https://play-lh.googleusercontent.com/5y8mo10uB4LrE_zOY672TKFELOFXWWpLQDU9zJ_JiU4ftj5VNGIH3BH7Jzf-yXqFtb0',
    resources: ['catalog', 'meta', 'stream'],
    types: ['series', 'movie'],
    catalogs: [
        {
            type: 'series',
            id: 'animecix_latest_episodes',
            name: 'Son Eklenen Bölümler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'animecix_series',
            name: 'Seriler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'animecix_movies',
            name: 'Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'animecix_search',
            name: 'Arama',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['animecix']
};

const BASE_URL = 'https://animecix.tv';
const API_HEADERS = {
    'x-e-h': '7Y2ozlO+QysR5w9Q6Tupmtvl9jJp7ThFH8SB+Lo7NvZjgjqRSqOgcT2v4ISM9sP10LmnlYI8WQ==.xrlyOBFS5BHjQ2Lk',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [AnimeciX Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 10) + 1;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalog
    if (catalogId === 'animecix_search') {
        if (!searchQuery) {
            return { instructions: [] };
        }

        const requestId = `animecix-search-${Date.now()}-${randomId}`;
        return {
            instructions: [{
                requestId,
                purpose: 'catalog_search',
                url: `${BASE_URL}/secure/search/${encodeURIComponent(searchQuery)}?limit=20`,
                method: 'GET',
                headers: API_HEADERS
            }]
        };
    }

    // Latest Episodes
    if (catalogId === 'animecix_latest_episodes') {
        const requestId = `animecix-latest-${page}-${Date.now()}-${randomId}`;
        return {
            instructions: [{
                requestId,
                purpose: 'catalog_latest',
                url: `${BASE_URL}/secure/last-episodes?page=${page}&perPage=10`,
                method: 'GET',
                headers: API_HEADERS
            }]
        };
    }

    // Series or Movies
    const catalogUrls = {
        'animecix_series': `${BASE_URL}/secure/titles?type=series&onlyStreamable=true&page=${page}&perPage=16`,
        'animecix_movies': `${BASE_URL}/secure/titles?type=movie&onlyStreamable=true&page=${page}&perPage=16`
    };

    const url = catalogUrls[catalogId];
    if (!url) {
        return { instructions: [] };
    }

    const requestId = `animecix-catalog-${catalogId}-${page}-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'catalog_titles',
            url: url,
            method: 'GET',
            headers: API_HEADERS
        }]
    };
}

async function handleMeta(args) {
    const parts = args.id.replace('animecix:', '').split('_');
    const titleId = parts[0];

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `animecix-meta-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: `${BASE_URL}/secure/titles/${titleId}?titleId=${titleId}`,
            method: 'GET',
            headers: API_HEADERS,
            metadata: { titleId }
        }]
    };
}

async function handleStream(args) {
    const parts = args.id.replace('animecix:', '').split('_');
    const titleId = parts[0];
    const seasonNum = parts[1] ? parseInt(parts[1].replace('s', '')) : null;
    const episodeNum = parts[2] ? parseInt(parts[2].replace('e', '')) : null;

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `animecix-stream-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'stream_get_video',
            url: `${BASE_URL}/secure/titles/${titleId}?titleId=${titleId}`,
            method: 'GET',
            headers: API_HEADERS,
            metadata: { titleId, seasonNum, episodeNum }
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, url } = fetchResult;

    console.log(`\n⚙️ [AnimeciX Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    // Catalog - Search
    if (purpose === 'catalog_search') {
        try {
            const data = JSON.parse(body);
            const metas = (data.results || []).map(anime => ({
                id: `animecix:${anime.id}`,
                type: anime.title_type === 'movie' ? 'movie' : 'series',
                name: anime.title,
                poster: anime.poster || null
            }));

            console.log(`✅ Found ${metas.length} search results`);
            return { metas };
        } catch (e) {
            console.log('⚠️  Search parse error:', e.message);
            return { metas: [] };
        }
    }

    // Catalog - Latest Episodes
    if (purpose === 'catalog_latest') {
        try {
            const data = JSON.parse(body);
            const metas = (data.data || []).map(ep => ({
                id: `animecix:${ep.title_id}`,
                type: 'series',
                name: `S${ep.season_number}B${ep.episode_number} - ${ep.title_name}`,
                poster: ep.title_poster || null
            }));

            console.log(`✅ Found ${metas.length} latest episodes`);
            return { metas };
        } catch (e) {
            console.log('⚠️  Latest episodes parse error:', e.message);
            return { metas: [] };
        }
    }

    // Catalog - Titles (Series/Movies)
    if (purpose === 'catalog_titles') {
        try {
            const data = JSON.parse(body);
            const items = data.pagination?.data || [];
            const metas = items.map(anime => ({
                id: `animecix:${anime.id}`,
                type: anime.title_type === 'movie' ? 'movie' : 'series',
                name: anime.title,
                poster: anime.poster || null
            }));

            console.log(`✅ Found ${metas.length} titles`);
            return { metas };
        } catch (e) {
            console.log('⚠️  Titles parse error:', e.message);
            return { metas: [] };
        }
    }

    // Meta
    if (purpose === 'meta') {
        try {
            const data = JSON.parse(body);
            const anime = data.title;

            const meta = {
                id: `animecix:${anime.id}`,
                type: anime.title_type === 'anime' ? 'series' : 'movie',
                name: anime.name,
                poster: anime.poster || null,
                background: anime.poster || null,
                description: anime.description || '',
                releaseInfo: anime.year ? anime.year.toString() : null,
                imdbRating: anime.mal_vote_average || null,
                genres: (anime.genres || []).map(g => g.display_name),
                cast: (anime.credits || []).map(c => c.name),
                runtime: null,
                videos: []
            };

            // Episodes için
            if (anime.title_type === 'anime' && anime.seasons && anime.seasons.length > 0) {
                // Her sezon için episodes almalıyız - instruction chain gerekiyor
                const instructions = [];
                for (const season of anime.seasons) {
                    const randomId = Math.random().toString(36).substring(2, 10);
                    const requestId = `animecix-episodes-s${season.number}-${Date.now()}-${randomId}`;

                    instructions.push({
                        requestId,
                        purpose: 'meta_episodes',
                        url: `${BASE_URL}/secure/related-videos?episode=1&season=${season.number}&videoId=0&titleId=${anime.id}`,
                        method: 'GET',
                        headers: API_HEADERS,
                        metadata: {
                            titleId: anime.id,
                            seasonNum: season.number,
                            meta: meta
                        }
                    });
                }

                console.log(`✅ Meta prepared, requesting ${instructions.length} season(s)`);
                return { instructions };
            } else {
                // Movie - direkt video varsa ekle
                if (anime.videos && anime.videos.length > 0) {
                    meta.videos = [{
                        id: `animecix:${anime.id}_s1_e1`,
                        title: 'Filmi İzle',
                        season: 1,
                        episode: 1
                    }];
                }

                console.log(`✅ Meta retrieved for movie: ${meta.name}`);
                return { meta };
            }
        } catch (e) {
            console.log('⚠️  Meta parse error:', e.message);
            return { meta: null };
        }
    }

    // Meta Episodes - Accumulate episodes from all seasons
    if (purpose === 'meta_episodes') {
        try {
            const data = JSON.parse(body);
            const videos = data.videos || [];
            const meta = fetchResult.metadata.meta;

            if (!meta.videos) {
                meta.videos = [];
            }

            videos.forEach(video => {
                meta.videos.push({
                    id: `animecix:${fetchResult.metadata.titleId}_s${video.season_num}_e${video.episode_num}`,
                    title: `${video.season_num}. Sezon ${video.episode_num}. Bölüm`,
                    season: video.season_num,
                    episode: video.episode_num
                });
            });

            console.log(`✅ Season ${fetchResult.metadata.seasonNum} episodes added: ${videos.length}`);

            // Meta'yı döndür
            return { meta };
        } catch (e) {
            console.log('⚠️  Episodes parse error:', e.message);
            return { meta: fetchResult.metadata.meta };
        }
    }

    // Stream - Get video data first
    if (purpose === 'stream_get_video') {
        try {
            const data = JSON.parse(body);
            const anime = data.title;
            const { titleId, seasonNum, episodeNum } = fetchResult.metadata;

            let videoUrl = null;

            if (anime.title_type === 'anime' && seasonNum && episodeNum) {
                // Get season videos
                const randomId = Math.random().toString(36).substring(2, 10);
                const requestId = `animecix-video-url-${Date.now()}-${randomId}`;

                return {
                    instructions: [{
                        requestId,
                        purpose: 'stream_get_episode_url',
                        url: `${BASE_URL}/secure/related-videos?episode=1&season=${seasonNum}&videoId=0&titleId=${titleId}`,
                        method: 'GET',
                        headers: API_HEADERS,
                        metadata: { titleId, seasonNum, episodeNum }
                    }]
                };
            } else {
                // Movie - direkt video URL
                if (anime.videos && anime.videos.length > 0) {
                    videoUrl = anime.videos[0].url;
                }

                if (videoUrl) {
                    const randomId = Math.random().toString(36).substring(2, 10);
                    const requestId = `animecix-extract-${Date.now()}-${randomId}`;

                    return {
                        instructions: [{
                            requestId,
                            purpose: 'stream_extract',
                            url: `${BASE_URL}/${videoUrl}`,
                            method: 'GET',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': `${BASE_URL}/`
                            },
                            metadata: {
                                followRedirects: true,
                                pageUrl: `${BASE_URL}/`
                            }
                        }]
                    };
                }
            }

            console.log('⚠️  No video URL found');
            return { streams: [] };
        } catch (e) {
            console.log('⚠️  Stream get video error:', e.message);
            return { streams: [] };
        }
    }

    // Stream - Get episode URL
    if (purpose === 'stream_get_episode_url') {
        try {
            const data = JSON.parse(body);
            const videos = data.videos || [];
            const { episodeNum } = fetchResult.metadata;

            const video = videos.find(v => v.episode_num === episodeNum);

            if (video && video.url) {
                const randomId = Math.random().toString(36).substring(2, 10);
                const requestId = `animecix-extract-${Date.now()}-${randomId}`;

                return {
                    instructions: [{
                        requestId,
                        purpose: 'stream_extract',
                        url: `${BASE_URL}/${video.url}`,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': `${BASE_URL}/`
                        },
                        metadata: {
                            followRedirects: true,
                            pageUrl: `${BASE_URL}/`
                        }
                    }]
                };
            }

            console.log('⚠️  Episode not found');
            return { streams: [] };
        } catch (e) {
            console.log('⚠️  Episode URL error:', e.message);
            return { streams: [] };
        }
    }

    // Stream - Extract (TauVideo)
    if (purpose === 'stream_extract') {
        const streams = [];

        try {
            // İframe URL'yi al (follow redirects sonrası gelen URL'den)
            let iframeUrl = url;

            console.log(`📌 Original iframeUrl: ${iframeUrl}`);

            // Eğer iframeLink içinde çift URL varsa düzelt (Kotlin'deki gibi)
            const doubleUrlRegex = /https:\/\/animecix\.tv\/(https:\/\/animecix\.tv\/secure\/[^\s]+)/;
            const match = iframeUrl.match(doubleUrlRegex);
            if (match) {
                iframeUrl = match[1];
                console.log(`✅ Corrected iframeUrl: ${iframeUrl}`);
            }

            // Eğer dizi (best-video) ise yönlendirmeyi takip et
            if (iframeUrl.includes('/secure/best-video')) {
                console.log('📌 Detected best-video, need to follow redirect');

                const randomId = Math.random().toString(36).substring(2, 10);
                const requestId = `animecix-redirect-${Date.now()}-${randomId}`;

                return {
                    instructions: [{
                        requestId,
                        purpose: 'stream_redirect',
                        url: iframeUrl,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': `${BASE_URL}/`
                        },
                        metadata: {
                            followRedirects: true,
                            pageUrl: fetchResult.metadata?.pageUrl || `${BASE_URL}/`
                        }
                    }]
                };
            }

            // Eğer tau-video içeriyorsa direkt extract et
            if (iframeUrl.includes('tau-video')) {
                // Extract video key
                const videoKey = iframeUrl.split('/').pop();

                const randomId = Math.random().toString(36).substring(2, 10);
                const requestId = `animecix-tauvideo-${Date.now()}-${randomId}`;

                return {
                    instructions: [{
                        requestId,
                        purpose: 'extract_tauvideo',
                        url: `https://tau-video.xyz/api/video/${videoKey}`,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': iframeUrl
                        },
                        metadata: {
                            pageUrl: fetchResult.metadata?.pageUrl || `${BASE_URL}/`
                        }
                    }]
                };
            }

            console.log('⚠️  Unknown video source');
            return { streams: [] };
        } catch (e) {
            console.log('⚠️  Extract error:', e.message);
            return { streams: [] };
        }
    }

    // Stream - Redirect from best-video
    if (purpose === 'stream_redirect') {
        try {
            const redirectedUrl = url; // Follow redirects sonrası gelen final URL

            console.log(`📌 Redirected final URL: ${redirectedUrl}`);

            if (redirectedUrl.includes('tau-video')) {
                const videoKey = redirectedUrl.split('/').pop();

                const randomId = Math.random().toString(36).substring(2, 10);
                const requestId = `animecix-tauvideo-${Date.now()}-${randomId}`;

                return {
                    instructions: [{
                        requestId,
                        purpose: 'extract_tauvideo',
                        url: `https://tau-video.xyz/api/video/${videoKey}`,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': redirectedUrl
                        },
                        metadata: {
                            pageUrl: fetchResult.metadata?.pageUrl || `${BASE_URL}/`
                        }
                    }]
                };
            } else {
                console.log(`⚠️  Redirect failed or unexpected URL: ${redirectedUrl}`);
                return { streams: [] };
            }
        } catch (e) {
            console.log('⚠️  Redirect error:', e.message);
            return { streams: [] };
        }
    }

    // TauVideo Extractor
    if (purpose === 'extract_tauvideo') {
        const streams = [];

        try {
            const data = JSON.parse(body);

            if (data.urls && Array.isArray(data.urls)) {
                data.urls.forEach(video => {
                    const quality = video.label || 'Unknown';

                    streams.push({
                        name: `AnimeciX - TauVideo`,
                        title: `TauVideo - ${quality}`,
                        url: video.url,
                        type: 'm3u8',
                        behaviorHints: {
                            notWebReady: false,
                            bingeGroup: `animecix-tauvideo-${quality}`
                        },
                        // Referer header Kotlin'deki gibi
                        headers: {
                            'Referer': fetchResult.metadata?.pageUrl || `${BASE_URL}/`,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });

                    console.log(`   ✅ Added stream: TauVideo - ${quality}`);
                });

                console.log(`✅ TauVideo: Extracted ${streams.length} stream(s)`);
            }
        } catch (e) {
            console.log('⚠️  TauVideo extraction error:', e.message);
        }

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


