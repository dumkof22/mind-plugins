
const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.tv8',
    version: '1.0.0',
    name: 'Tv8',
    description: 'Tv8 canlı yayını ve programları - Yarışmalar, diziler ve programlar',
    resources: ['catalog', 'meta', 'stream'],
    types: ['series'],
    catalogs: [
        {
            type: 'series',
            id: 'tv8_yarismalar',
            name: 'Yarışmalar',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'tv8_diziler',
            name: 'Diziler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'tv8_programlar',
            name: 'Programlar',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'tv8_search',
            name: 'Arama',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['tv8']
};

const BASE_URL = 'https://www.tv8.com.tr';

// Katalog kategorileri
const CATEGORIES = ['Yarışmalar', 'Diziler', 'Programlar'];

// Cache (30 dakika)
let allContentCache = [];
let cacheTime = 0;
const CACHE_VALIDITY = 30 * 60 * 1000;

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [Tv8 Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search - önce tüm içeriği çek
    if (catalogId === 'tv8_search' && searchQuery) {
        const requestId = `tv8-all-content-${Date.now()}-${randomId}`;
        return {
            instructions: [{
                requestId,
                purpose: 'all_content',
                url: BASE_URL,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                metadata: { searchQuery }
            }]
        };
    }

    // Normal catalog
    const categoryName = catalogId.replace('tv8_', '').charAt(0).toUpperCase() + catalogId.replace('tv8_', '').slice(1);
    const requestId = `tv8-catalog-${catalogId}-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: BASE_URL,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            metadata: { categoryName }
        }]
    };
}

async function handleMeta(args) {
    const url = Buffer.from(args.id.replace('tv8:', ''), 'base64').toString('utf-8');

    console.log(`📺 [Tv8 Meta] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `tv8-meta-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        }]
    };
}

async function handleStream(args) {
    // Stream URL direkt video URL
    const videoUrl = Buffer.from(args.id.replace('tv8:', ''), 'base64').toString('utf-8');

    console.log(`🎬 [Tv8 Stream] Direct video URL: ${videoUrl.substring(0, 80)}...`);

    // Video URL direkt .mp4 ise, instruction olmadan metadata ile döndür
    if (videoUrl.includes('.mp4')) {
        // HTTPS'e çevir
        const httpsUrl = videoUrl.replace('http://', 'https://');
        const url720p = httpsUrl.replace('.mp4', '-720p.mp4');
        const url480p = httpsUrl.replace('.mp4', '-480p.mp4');

        console.log(`✅ [Tv8 Stream] Returning direct video URLs (no fetch needed)`);

        // Direkt stream metadata ile döndür
        return {
            instructions: [],
            metadata: {
                directStreams: [
                    {
                        name: 'Tv8',
                        title: 'Tv8 - 720p',
                        url: url720p,
                        behaviorHints: {
                            notWebReady: false
                        }
                    },
                    {
                        name: 'Tv8',
                        title: 'Tv8 - 480p',
                        url: url480p,
                        behaviorHints: {
                            notWebReady: false
                        }
                    }
                ]
            }
        };
    }

    // .mp4 değilse, boş döndür
    console.log(`⚠️  [Tv8 Stream] Not a direct MP4 URL`);
    return { instructions: [] };
}

// ============ HELPER FUNCTIONS ============

function finalizeMeta(originalMeta, accumulatedVideos) {
    if (!originalMeta) {
        console.log('❌ No originalMeta to finalize');
        return { meta: null };
    }

    // Tarihe göre sırala (eskiden yeniye)
    accumulatedVideos.sort((a, b) => {
        const dateA = a.released ? new Date(a.released).getTime() : 0;
        const dateB = b.released ? new Date(b.released).getTime() : 0;
        return dateA - dateB;
    });

    // Episode numarası ekle
    const videosWithEpisodes = accumulatedVideos.map((video, idx) => ({
        ...video,
        episode: idx + 1,
        season: 1
    }));

    originalMeta.videos = videosWithEpisodes;
    console.log(`✅ Finalized meta with ${videosWithEpisodes.length} episodes`);
    return { meta: originalMeta };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata } = fetchResult;

    console.log(`\n⚙️ [Tv8 Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);
    console.log(`   Body size: ${body?.length || 0} bytes`);
    console.log(`   Metadata: ${metadata ? JSON.stringify(metadata).substring(0, 100) : 'none'}`);

    // Direkt stream (metadata ile gelir, body yok)
    if (!body && metadata?.directStreams) {
        console.log(`📺 [Tv8 Process] Processing direct streams from metadata`);
        return { streams: metadata.directStreams };
    }

    // All Content (search için)
    if (purpose === 'all_content') {
        try {
            const $ = cheerio.load(body);
            const searchQuery = metadata?.searchQuery?.toLowerCase() || '';
            const allContent = [];

            // Tüm kategorileri tara
            CATEGORIES.forEach(categoryName => {
                const categoryElement = $('li.dropdown').filter(function () {
                    return $(this).find('a[title]').attr('title') === categoryName;
                });

                if (categoryElement.length > 0) {
                    categoryElement.find('ul.clearfix li').each((i, elem) => {
                        const link = $(elem).find('a');
                        const title = link.attr('data-title') || link.text().trim();
                        const href = link.attr('href');
                        const poster = 'https://img.tv8.com.tr/' + link.attr('data-image');

                        if (title && href) {
                            const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

                            allContent.push({
                                id: 'tv8:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, ''),
                                type: 'series',
                                name: title,
                                poster: poster || null
                            });
                        }
                    });
                }
            });

            // Arama yap
            const metas = allContent.filter(item =>
                item.name.toLowerCase().includes(searchQuery)
            );

            console.log(`✅ Found ${metas.length} search results (from ${allContent.length} total)`);
            return { metas };
        } catch (error) {
            console.log('❌ All content error:', error.message);
            return { metas: [] };
        }
    }

    // Catalog
    if (purpose === 'catalog') {
        try {
            const $ = cheerio.load(body);
            const categoryName = metadata?.categoryName;
            const metas = [];

            const categoryElement = $('li.dropdown').filter(function () {
                return $(this).find('a[title]').attr('title') === categoryName;
            });

            if (categoryElement.length === 0) {
                console.log('❌ Category not found:', categoryName);
                return { metas: [] };
            }

            categoryElement.find('ul.clearfix li').each((i, elem) => {
                const link = $(elem).find('a');
                const title = link.attr('data-title') || link.text().trim();
                const href = link.attr('href');
                const poster = 'https://img.tv8.com.tr/' + link.attr('data-image');

                if (title && href) {
                    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                    const id = 'tv8:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                    metas.push({
                        id: id,
                        type: 'series',
                        name: title,
                        poster: poster || null
                    });
                }
            });

            console.log(`✅ Found ${metas.length} items in ${categoryName} category`);
            return { metas };
        } catch (error) {
            console.log('❌ Catalog parse error:', error.message);
            return { metas: [] };
        }
    }

    // Meta Episodes - Ajax JSON response (metadata içinde page varsa)
    if (purpose === 'meta' && metadata?.page) {
        try {
            const responseText = body.trim();
            const page = metadata.page;
            const maxPages = metadata.maxPages || 5;
            const dataId = metadata.dataId;
            const accumulatedVideos = metadata.accumulatedVideos || [];
            const originalMeta = metadata.originalMeta;

            console.log(`📄 Page ${page}: Processing...`);

            // Boş veya false response kontrolü
            if (responseText === 'false' || responseText === '' || responseText === 'null') {
                console.log(`⚠️  Page ${page}: No more episodes (empty response)`);

                // Finalize meta
                if (accumulatedVideos.length > 0 && originalMeta) {
                    return finalizeMeta(originalMeta, accumulatedVideos);
                }

                return { meta: originalMeta || null };
            }

            const jsonArray = JSON.parse(responseText);
            console.log(`📄 Page ${page}: Found ${jsonArray.length} episodes`);

            // Parse episodes
            jsonArray.forEach((episodeJson) => {
                const title = episodeJson.baslik || '';
                const duration = episodeJson.video_suresi || '';
                const videoUrl = episodeJson.tip_deger || '';
                const dateString = episodeJson.kayit_tarihi || '';

                // Poster
                let posterUrl = null;
                try {
                    const resimJson = JSON.parse(episodeJson.resim || '{}');
                    const originalPath = resimJson.original || '';
                    if (originalPath) {
                        posterUrl = `https://img.tv8.com.tr/${originalPath}`;
                    }
                } catch (e) {
                    // Poster parse error
                }

                if (title && videoUrl) {
                    const episodeTitle = duration ? `${title} (${duration})` : title;

                    // Parse date
                    let dateTimestamp = null;
                    try {
                        if (dateString) {
                            const parsedDate = new Date(dateString);
                            dateTimestamp = parsedDate.getTime();
                        }
                    } catch (e) {
                        // Date parse error
                    }

                    const videoId = 'tv8:' + Buffer.from(videoUrl).toString('base64').replace(/=/g, '');

                    accumulatedVideos.push({
                        id: videoId,
                        title: episodeTitle,
                        released: dateTimestamp ? new Date(dateTimestamp).toISOString().split('T')[0] : null,
                        thumbnail: posterUrl
                    });
                }
            });

            console.log(`🔄 Total accumulated: ${accumulatedVideos.length} episodes`);

            // Son sayfa mı kontrol et
            const isLastPage = jsonArray.length === 0;
            const reachedMaxPages = page >= maxPages;

            if (isLastPage || reachedMaxPages) {
                console.log(`✅ Reached end (page ${page}, last=${isLastPage}, max=${reachedMaxPages})`);
                return finalizeMeta(originalMeta, accumulatedVideos);
            }

            // Sonraki sayfa için instruction oluştur
            const nextPage = page + 1;
            const randomId = Math.random().toString(36).substring(2, 10);

            console.log(`➡️  Fetching next page: ${nextPage}`);

            return {
                instructions: [{
                    requestId: `tv8-episodes-${nextPage}-${Date.now()}-${randomId}`,
                    purpose: 'meta',
                    url: `${BASE_URL}/Ajax/icerik/haberler/${dataId}/${nextPage}?tip=videolar&id=${dataId}&sayfa=${nextPage}&tip=videolar&hedef=%23tab-alt-${dataId}-icerik`,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        'Referer': BASE_URL
                    },
                    metadata: {
                        page: nextPage,
                        maxPages: maxPages,
                        accumulatedVideos: accumulatedVideos,
                        originalMeta: originalMeta,
                        dataId: dataId
                    }
                }]
            };
        } catch (error) {
            console.log('❌ Episodes parse error:', error.message);

            // Hata olsa bile toplanan videoları döndürmeyi dene
            const accumulatedVideos = metadata?.accumulatedVideos || [];
            if (accumulatedVideos.length > 0) {
                const originalMeta = metadata?.originalMeta;
                if (originalMeta) {
                    return finalizeMeta(originalMeta, accumulatedVideos);
                }
            }

            return { meta: null };
        }
    }

    // Meta - HTML response (ilk istek)
    if (purpose === 'meta') {
        try {
            const $ = cheerio.load(body);

            console.log(`🔍 [Tv8 Meta Parse] Starting...`);
            console.log(`   URL: ${url?.substring(0, 80)}`);

            const title = $('h1').text().trim();
            if (!title) {
                console.log('❌ No title found');
                return { meta: null };
            }

            console.log(`   Title: ${title}`);

            const poster = $('div.item img[src]').attr('src');
            console.log(`   Poster: ${poster?.substring(0, 60)}`);

            // data-id'yi al
            const dataId = $('li.tabs a.tab[data-id]').attr('data-id');
            if (!dataId) {
                console.log('❌ No data-id found');
                return { meta: null };
            }

            console.log(`📺 Program data-id: ${dataId}`);

            // İlk sayfayı fetch etmek için tek instruction döndür
            const randomId = Math.random().toString(36).substring(2, 10);
            const originalMeta = {
                id: 'tv8:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                type: 'series',
                name: title,
                poster: poster || null,
                background: poster || null,
                description: `Tv8 ${title} programı`
            };

            console.log(`✅ [Tv8 Meta] Creating first page instruction`);
            return {
                instructions: [{
                    requestId: `tv8-episodes-1-${Date.now()}-${randomId}`,
                    purpose: 'meta',
                    url: `${BASE_URL}/Ajax/icerik/haberler/${dataId}/1?tip=videolar&id=${dataId}&sayfa=1&tip=videolar&hedef=%23tab-alt-${dataId}-icerik`,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        'Referer': BASE_URL
                    },
                    metadata: {
                        page: 1,
                        maxPages: 5,
                        accumulatedVideos: [],
                        originalMeta: originalMeta,
                        dataId: dataId
                    }
                }]
            };
        } catch (error) {
            console.log('❌ Meta parse error:', error.message);
            return { meta: null };
        }
    }

    console.log(`⚠️ [Tv8] Unhandled purpose: ${purpose}`);
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
