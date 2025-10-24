const cheerio = require('cheerio');

// ============ SelcukFlix Addon ============
// SelcukFlix sitesi için Stremio eklentisi (Instruction Mode)
// Kotlin kodundan JavaScript'e port edilmiştir
// ===========================================

const manifest = {
    id: 'community.selcukflix',
    version: '1.0.0',
    name: 'SelcukFlix',
    description: 'Türkçe dizi ve film izleme platformu - SelcukFlix için Stremio eklentisi (Instruction Mode)',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'series',
            id: 'selcukflix_latest_episodes',
            name: 'Yeni Eklenen Bölümler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_new_series',
            name: 'Yeni Diziler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_korean',
            name: 'Kore Dizileri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_turkish',
            name: 'Yerli Diziler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_aile',
            name: 'Aile',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_animasyon',
            name: 'Animasyon',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_aksiyon',
            name: 'Aksiyon',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_bilimkurgu',
            name: 'Bilim Kurgu',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_dram',
            name: 'Dram',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_fantastik',
            name: 'Fantastik',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_gerilim',
            name: 'Gerilim',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_gizem',
            name: 'Gizem',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_korku',
            name: 'Korku',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_komedi',
            name: 'Komedi',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'selcukflix_romantik',
            name: 'Romantik',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'selcukflix_search',
            name: 'Film Ara',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'selcukflix_search_series',
            name: 'Dizi Ara',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['selcukflix']
};

const BASE_URL = 'https://selcukflix.net';

// Enhanced headers for SelcukFlix
function getEnhancedHeaders(referer = BASE_URL, isAjax = false) {
    const headers = {
        'Accept': isAjax ? 'application/json, text/plain, */*' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
        'Sec-Fetch-Dest': isAjax ? 'empty' : 'document',
        'Sec-Fetch-Mode': isAjax ? 'cors' : 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Cache-Control': 'max-age=0'
    };

    if (referer) {
        headers['Referer'] = referer;
    }

    if (isAjax) {
        headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    return headers;
}

// Kategori ID mapping (Kotlin'deki mainPage'den)
const CATEGORY_MAP = {
    'selcukflix_aile': '15',
    'selcukflix_animasyon': '17',
    'selcukflix_aksiyon': '9',
    'selcukflix_bilimkurgu': '5',
    'selcukflix_dram': '2',
    'selcukflix_fantastik': '12',
    'selcukflix_gerilim': '18',
    'selcukflix_gizem': '3',
    'selcukflix_korku': '8',
    'selcukflix_komedi': '4',
    'selcukflix_romantik': '7'
};

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [SelcukFlix Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const searchQuery = args.extra?.search;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 24) + 1;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalogs
    if ((catalogId === 'selcukflix_search' || catalogId === 'selcukflix_search_series') && searchQuery) {
        const requestId = `selcukflix-search-${catalogId}-${Date.now()}-${randomId}`;
        const searchUrl = `${BASE_URL}/api/bg/searchcontent?searchterm=${encodeURIComponent(searchQuery)}`;

        return {
            instructions: [{
                requestId,
                purpose: 'catalog-search',
                url: searchUrl,
                method: 'POST',
                headers: getEnhancedHeaders(BASE_URL, true),
                metadata: { catalogId }
            }]
        };
    }

    // Latest Episodes catalog
    if (catalogId === 'selcukflix_latest_episodes') {
        const requestId = `selcukflix-episodes-${Date.now()}-${randomId}`;
        return {
            instructions: [{
                requestId,
                purpose: 'catalog-episodes',
                url: `${BASE_URL}/tum-bolumler`,
                method: 'GET',
                headers: getEnhancedHeaders(BASE_URL, false),
                metadata: { catalogId }
            }]
        };
    }

    // API-based catalogs
    let apiUrl = '';
    const categoryId = CATEGORY_MAP[catalogId];

    if (catalogId === 'selcukflix_turkish') {
        apiUrl = `${BASE_URL}/api/bg/findSeries?releaseYearStart=1900&releaseYearEnd=2024&imdbPointMin=5&imdbPointMax=10&categoryIdsComma=&countryIdsComma=29&orderType=date_desc&languageId=-1&currentPage=${page}&currentPageCount=24&queryStr=&categorySlugsComma=&countryCodesComma=`;
    } else if (catalogId === 'selcukflix_korean') {
        apiUrl = `${BASE_URL}/api/bg/findSeries?releaseYearStart=1900&releaseYearEnd=2026&imdbPointMin=1&imdbPointMax=10&categoryIdsComma=&countryIdsComma=21&orderType=date_desc&languageId=-1&currentPage=${page}&currentPageCount=24&queryStr=&categorySlugsComma=&countryCodesComma=KR`;
    } else if (categoryId) {
        apiUrl = `${BASE_URL}/api/bg/findSeries?releaseYearStart=1900&releaseYearEnd=2026&imdbPointMin=1&imdbPointMax=10&categoryIdsComma=${categoryId}&countryIdsComma=&orderType=date_desc&languageId=-1&currentPage=${page}&currentPageCount=24&queryStr=&categorySlugsComma=&countryCodesComma=`;
    } else {
        // Default: New Series
        apiUrl = `${BASE_URL}/api/bg/findSeries?releaseYearStart=1900&releaseYearEnd=2026&imdbPointMin=1&imdbPointMax=10&categoryIdsComma=&countryIdsComma=&orderType=date_desc&languageId=-1&currentPage=${page}&currentPageCount=24&queryStr=&categorySlugsComma=&countryCodesComma=`;
    }

    const requestId = `selcukflix-catalog-${catalogId}-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'catalog-api',
            url: apiUrl,
            method: 'POST',
            headers: getEnhancedHeaders(BASE_URL, true),
            metadata: { catalogId }
        }]
    };
}

async function handleMeta(args) {
    const urlBase64 = args.id.replace('selcukflix:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`📺 [SelcukFlix Meta] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `selcukflix-meta-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: url,
            method: 'GET',
            headers: getEnhancedHeaders(BASE_URL, false)
        }]
    };
}

async function handleStream(args) {
    const urlBase64 = args.id.replace('selcukflix:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`🎬 [SelcukFlix Stream] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `selcukflix-stream-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: url,
            method: 'GET',
            headers: getEnhancedHeaders(BASE_URL, false)
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

// Base64 decode helper
function base64Decode(str) {
    return Buffer.from(str, 'base64').toString('utf-8');
}

// Base64 decode for ISO-8859-1 to UTF-8 conversion
function base64DecodeISO(str) {
    // Decode base64 to latin1 (ISO-8859-1), then re-encode as UTF-8
    const latin1 = Buffer.from(str, 'base64').toString('latin1');
    return Buffer.from(latin1, 'latin1').toString('utf-8');
}

// Poster URL fixer
function fixPosterUrl(url) {
    if (!url) return null;
    return url
        .replace('images-macellan-online.cdn.ampproject.org/i/s/', '')
        .replace('file.dizilla.club', 'file.macellan.online')
        .replace('images.dizilla.club', 'images.macellan.online')
        .replace('images.dizimia4.com', 'images.macellan.online')
        .replace('file.dizimia4.com', 'file.macellan.online')
        .replace('/f/f/', '/630/910/')
        .replace(/file\.[\w\.]+\/?/g, 'file.macellan.online/')
        .replace(/images\.[\w\.]+\/?/g, 'images.macellan.online/');
}

async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata } = fetchResult;

    console.log(`\n⚙️ [SelcukFlix Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    // ========== CATALOG SEARCH ==========
    if (purpose === 'catalog-search') {
        try {
            const response = JSON.parse(body);

            if (!response.response) {
                console.log('❌ No response field in search response');
                return { metas: [] };
            }

            // Base64 decode with ISO-8859-1 to UTF-8 conversion
            const decodedSearch = base64DecodeISO(response.response);

            console.log(`📦 Search decoded data length: ${decodedSearch.length}`);

            // JSON parse etmeden önce kontrol karakterlerini temizle
            const cleanedJson = decodedSearch.replace(/[\x00-\x1F\x7F]/g, ' ');

            const searchData = JSON.parse(cleanedJson);

            const metas = [];
            const catalogId = metadata?.catalogId;

            if (searchData.result && Array.isArray(searchData.result)) {
                for (const item of searchData.result) {
                    const title = item.object_name || item.title;
                    const slug = item.used_slug || item.slug;
                    const poster = item.object_poster_url || item.poster;
                    const type = item.used_type || item.type;

                    if (!title || !slug) continue;

                    // Seri-filmler'i atla
                    if (slug.includes('/seri-filmler/')) continue;

                    // Slug'ı düzelt - slash ile başlamıyorsa ekle
                    const fixedSlug = slug.startsWith('/') ? slug : `/${slug}`;
                    const fullUrl = fixedSlug.startsWith('http') ? fixedSlug : `${BASE_URL}${fixedSlug}`;
                    const itemType = type === 'Movies' ? 'movie' : 'series';

                    // Katalog tipine göre filtrele
                    if (catalogId === 'selcukflix_search' && itemType !== 'movie') continue;
                    if (catalogId === 'selcukflix_search_series' && itemType !== 'series') continue;

                    const id = 'selcukflix:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                    metas.push({
                        id: id,
                        type: itemType,
                        name: title,
                        poster: fixPosterUrl(poster)
                    });
                }
            }

            console.log(`✅ Found ${metas.length} search results`);
            return { metas };
        } catch (error) {
            console.log('❌ Search parsing error:', error.message);
            console.log('   Stack:', error.stack);
            return { metas: [] };
        }
    }

    // ========== CATALOG EPISODES ==========
    if (purpose === 'catalog-episodes') {
        try {
            const $ = cheerio.load(body);
            const metas = [];
            const instructions = [];

            // Her bölüm için detay sayfasını fetch etmemiz gerekiyor
            $('div.col-span-3 a').each((i, elem) => {
                const name = $(elem).find('h2').text().trim();
                const epName = $(elem).find('div.opacity-80').text().trim()
                    .replace('. Sezon ', 'x')
                    .replace('. Bölüm', '');
                const epHref = $(elem).attr('href');
                const posterUrl = $(elem).find('div.image img').attr('src');

                if (name && epHref) {
                    const title = `${name} - ${epName}`;
                    const fixedHref = epHref.startsWith('/') ? epHref : `/${epHref}`;
                    const fullUrl = fixedHref.startsWith('http') ? fixedHref : `${BASE_URL}${fixedHref}`;
                    const randomId = Math.random().toString(36).substring(2, 10);

                    instructions.push({
                        requestId: `selcukflix-episode-detail-${Date.now()}-${randomId}`,
                        purpose: 'episode-detail',
                        url: fullUrl,
                        method: 'GET',
                        headers: getEnhancedHeaders(BASE_URL, false),
                        metadata: {
                            title: title,
                            posterUrl: fixPosterUrl(posterUrl)
                        }
                    });
                }
            });

            console.log(`📊 Generated ${instructions.length} episode detail instructions`);
            return { instructions };
        } catch (error) {
            console.log('❌ Episodes parsing error:', error.message);
            return { metas: [] };
        }
    }

    // ========== EPISODE DETAIL ==========
    if (purpose === 'episode-detail') {
        try {
            const $ = cheerio.load(body);

            // Dizi ana sayfasını bul
            let seriesHref = $('div.poster a').attr('href');

            if (!seriesHref) {
                seriesHref = $('a[href*="/dizi/"]').first().attr('href');
            }

            if (!seriesHref) {
                const canonical = $('link[rel="canonical"]').attr('href');
                if (canonical) {
                    const diziSlug = canonical.split('/').pop().split('-')[0];
                    seriesHref = `/dizi/${diziSlug}`;
                }
            }

            if (!seriesHref) {
                return { metas: [] };
            }

            const fixedHref = seriesHref.startsWith('/') ? seriesHref : `/${seriesHref}`;
            const fullUrl = fixedHref.startsWith('http') ? fixedHref : `${BASE_URL}${fixedHref}`;
            const id = 'selcukflix:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

            return {
                metas: [{
                    id: id,
                    type: 'series',
                    name: metadata.title,
                    poster: metadata.posterUrl
                }]
            };
        } catch (error) {
            console.log('❌ Episode detail parsing error:', error.message);
            return { metas: [] };
        }
    }

    // ========== CATALOG API ==========
    if (purpose === 'catalog-api') {
        try {
            const response = JSON.parse(body);

            if (!response.response) {
                console.log('❌ No response field in API response');
                return { metas: [] };
            }

            // Base64 decode with ISO-8859-1 to UTF-8 conversion
            const decodedData = base64DecodeISO(response.response);

            console.log(`📦 Decoded data length: ${decodedData.length}`);
            console.log(`📄 First 500 chars: ${decodedData.substring(0, 500)}`);

            // JSON parse etmeden önce kontrol karakterlerini temizle
            const cleanedJson = decodedData.replace(/[\x00-\x1F\x7F]/g, ' ');

            const mediaList = JSON.parse(cleanedJson);

            const metas = [];

            if (mediaList.result && Array.isArray(mediaList.result)) {
                // Debug: İlk item'ı tamamen logla
                if (mediaList.result.length > 0) {
                    console.log(`🔍 First item:`, JSON.stringify(mediaList.result[0], null, 2));
                }

                for (const item of mediaList.result) {
                    const title = item.original_title || item.originalTitle;
                    const slug = item.used_slug || item.usedSlug;
                    const poster = item.poster_url || item.posterUrl;
                    const imdbPoint = item.imdb_point || item.imdbPoint;

                    if (!title || !slug) continue;

                    // Slug'ı düzelt - slash ile başlamıyorsa ekle
                    const fixedSlug = slug.startsWith('/') ? slug : `/${slug}`;
                    const fullUrl = fixedSlug.startsWith('http') ? fixedSlug : `${BASE_URL}${fixedSlug}`;
                    const id = 'selcukflix:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                    metas.push({
                        id: id,
                        type: 'series',
                        name: title,
                        poster: fixPosterUrl(poster)
                    });
                }
            }

            console.log(`✅ Found ${metas.length} items in catalog`);
            return { metas };
        } catch (error) {
            console.log('❌ Catalog API parsing error:', error.message);
            console.log('   Stack:', error.stack);
            console.log('   Body preview:', body.substring(0, 500));
            return { metas: [] };
        }
    }

    // ========== META ==========
    if (purpose === 'meta') {
        try {
            const $ = cheerio.load(body);
            const scriptData = $('script#__NEXT_DATA__').html();

            if (!scriptData) {
                console.log('❌ __NEXT_DATA__ script not found');
                return { meta: null };
            }

            const nextData = JSON.parse(scriptData);
            const secureData = nextData?.props?.pageProps?.secureData;

            if (!secureData) {
                console.log('❌ secureData not found');
                return { meta: null };
            }

            // Base64 decode with ISO-8859-1 to UTF-8 conversion (Kotlin load fonksiyonundaki gibi)
            const decodedJson = base64DecodeISO(secureData);

            console.log(`📦 Meta decoded data length: ${decodedJson.length}`);

            // JSON parse etmeden önce kontrol karakterlerini temizle
            const cleanedJson = decodedJson.replace(/[\x00-\x1F\x7F]/g, ' ');

            const contentDetails = JSON.parse(cleanedJson);

            const item = contentDetails.contentItem;
            const relatedData = contentDetails.RelatedResults;

            const title = item.original_title || item.originalTitle;
            const poster = fixPosterUrl(item.poster_url || item.posterUrl);
            const description = item.description;
            const year = item.release_year || item.releaseYear;
            const tags = item.categories ? item.categories.split(',') : [];
            const rating = item.imdb_point || item.imdbPoint;
            const duration = item.total_minutes || item.totalMinutes;

            // Cast
            const actors = [];
            if (relatedData.getMovieCastsById?.result) {
                for (const cast of relatedData.getMovieCastsById.result) {
                    if (cast.name) {
                        actors.push(cast.name);
                    }
                }
            }

            // Trailer
            let trailer = null;
            if (relatedData.getContentTrailers?.state && relatedData.getContentTrailers?.result?.length > 0) {
                trailer = relatedData.getContentTrailers.result[0].raw_url || relatedData.getContentTrailers.result[0].rawUrl;
            }

            // Series check
            if (relatedData.getSerieSeasonAndEpisodes) {
                const videos = [];
                const seriesData = relatedData.getSerieSeasonAndEpisodes;

                if (seriesData.result) {
                    for (const season of seriesData.result) {
                        const seasonNo = season.season_no || season.seasonNo;

                        if (season.episodes) {
                            for (const episode of season.episodes) {
                                const epSlug = episode.used_slug || episode.usedSlug;
                                const epText = episode.episode_text || episode.epText || episode.ep_text;
                                const epNo = episode.episode_no || episode.episodeNo;

                                if (epSlug) {
                                    const fixedSlug = epSlug.startsWith('/') ? epSlug : `/${epSlug}`;
                                    const epUrl = fixedSlug.startsWith('http') ? fixedSlug : `${BASE_URL}${fixedSlug}`;
                                    const videoId = 'selcukflix:' + Buffer.from(epUrl).toString('base64').replace(/=/g, '');

                                    videos.push({
                                        id: videoId,
                                        title: epText || `${seasonNo}. Sezon ${epNo}. Bölüm`,
                                        season: seasonNo,
                                        episode: epNo
                                    });
                                }
                            }
                        }
                    }
                }

                return {
                    meta: {
                        id: 'selcukflix:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                        type: 'series',
                        name: title,
                        poster: poster,
                        background: poster,
                        description: description || 'Açıklama mevcut değil',
                        releaseInfo: year?.toString() || null,
                        imdbRating: rating?.toString() || null,
                        genres: tags.length > 0 ? tags : undefined,
                        cast: actors.length > 0 ? actors : undefined,
                        videos: videos
                    }
                };
            } else {
                // Movie
                return {
                    meta: {
                        id: 'selcukflix:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                        type: 'movie',
                        name: title,
                        poster: poster,
                        background: poster,
                        description: description || 'Açıklama mevcut değil',
                        releaseInfo: year?.toString() || null,
                        imdbRating: rating?.toString() || null,
                        genres: tags.length > 0 ? tags : undefined,
                        runtime: duration ? `${duration} dk` : null,
                        cast: actors.length > 0 ? actors : undefined
                    }
                };
            }
        } catch (error) {
            console.log('❌ Meta parsing error:', error.message);
            return { meta: null };
        }
    }

    // ========== STREAM ==========
    if (purpose === 'stream') {
        try {
            const $ = cheerio.load(body);
            const scriptData = $('script#__NEXT_DATA__').html();

            if (!scriptData) {
                console.log('❌ __NEXT_DATA__ script not found');
                return { streams: [] };
            }

            const nextData = JSON.parse(scriptData);
            const secureData = nextData?.props?.pageProps?.secureData;

            if (!secureData) {
                console.log('❌ secureData not found');
                return { streams: [] };
            }

            // Base64 decode - Kotlin loadLinks fonksiyonundaki gibi direkt UTF-8
            const decodedJson = base64Decode(secureData);

            console.log(`📦 Stream decoded data length: ${decodedJson.length}`);

            // JSON parse etmeden önce kontrol karakterlerini temizle
            const cleanedJson = decodedJson.replace(/[\x00-\x1F\x7F]/g, ' ');

            const contentDetails = JSON.parse(cleanedJson);

            const relatedData = contentDetails.RelatedResults;
            let sourceContent = null;

            // Dizi mi film mi kontrol et
            if (url.includes('/dizi/')) {
                // Series - Episode sources
                if (relatedData.getEpisodeSources?.state && relatedData.getEpisodeSources?.result?.length > 0) {
                    const firstSource = relatedData.getEpisodeSources.result[0];
                    sourceContent = firstSource.source_content || firstSource.sourceContent;
                }
            } else {
                // Movie - Movie parts
                if (relatedData.getMoviePartsById?.state && relatedData.getMoviePartsById?.result?.length > 0) {
                    const firstPart = relatedData.getMoviePartsById.result[0];
                    const partId = firstPart.id;

                    // Source'u JSON'dan çek
                    const sourceKey = `getMoviePartSourcesById_${partId}`;
                    if (relatedData[sourceKey]?.result?.length > 0) {
                        const firstSource = relatedData[sourceKey].result[0];
                        sourceContent = firstSource.source_content || firstSource.sourceContent;
                    }
                }
            }

            if (!sourceContent) {
                console.log('❌ No source content found');
                return { streams: [] };
            }

            console.log('✅ Source content found, extracting iframe...');

            // Parse iframe from sourceContent
            const $source = cheerio.load(sourceContent);
            let iframeUrl = $source('iframe').attr('src');

            if (!iframeUrl) {
                console.log('❌ No iframe found in source content');
                return { streams: [] };
            }

            // Fix iframe URL
            iframeUrl = iframeUrl.startsWith('http') ? iframeUrl : `https:${iframeUrl}`;

            // sn.dplayer74.site fix (Kotlin'deki gibi)
            if (iframeUrl.includes('sn.dplayer74.site')) {
                iframeUrl = iframeUrl.replace('sn.dplayer74.site', 'sn.hotlinger.com');
            }

            console.log(`📊 Iframe URL: ${iframeUrl.substring(0, 80)}...`);

            // Video extractor instruction döndür
            const randomId = Math.random().toString(36).substring(2, 10);
            const requestId = `selcukflix-extractor-${Date.now()}-${randomId}`;

            return {
                instructions: [{
                    requestId,
                    purpose: 'video-extractor',
                    url: iframeUrl,
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': BASE_URL + '/'
                    },
                    metadata: {
                        originalUrl: url,
                        extractorType: 'auto',
                        iframeUrl: iframeUrl
                    }
                }]
            };
        } catch (error) {
            console.log('❌ Stream parsing error:', error.message);
            return { streams: [] };
        }
    }

    // ========== VIDEO EXTRACTOR ==========
    if (purpose === 'video-extractor') {
        try {
            const streams = [];
            const $ = cheerio.load(body);

            console.log('\n🔍 [VIDEO EXTRACTOR] Analyzing iframe content...');
            console.log(`📄 Body length: ${body.length} bytes`);

            // Detect extractor type from URL or content
            const extractorUrl = url.toLowerCase();

            // ========== ContentX / Hotlinger / Pichive / PlayRu / Dplayer ==========
            if (extractorUrl.includes('contentx.me') ||
                extractorUrl.includes('hotlinger.com') ||
                extractorUrl.includes('pichive.online') ||
                extractorUrl.includes('playru.net') ||
                extractorUrl.includes('dplayer82.site') ||
                extractorUrl.includes('dplayer74.site')) {

                console.log('   Detected: ContentX family extractor');

                // window.openPlayer('...') extraction
                const openPlayerMatch = body.match(/window\.openPlayer\('([^']+)'/);
                if (openPlayerMatch) {
                    const iExtract = openPlayerMatch[1];
                    const domain = new URL(url).origin;
                    const sourceUrl = `${domain}/source2.php?v=${iExtract}`;

                    console.log(`   Found openPlayer ID: ${iExtract}`);

                    const randomId = Math.random().toString(36).substring(2, 10);
                    return {
                        instructions: [{
                            requestId: `selcukflix-contentx-source-${Date.now()}-${randomId}`,
                            purpose: 'contentx-source',
                            url: sourceUrl,
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json, text/plain, */*',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': url,
                                'Origin': new URL(url).origin
                            },
                            metadata: {
                                originalUrl: metadata?.originalUrl || url,
                                iframeUrl: url,
                                extractorName: 'ContentX'
                            }
                        }]
                    };
                }
            }

            // ========== RapidVid ==========
            if (extractorUrl.includes('rapidvid.net')) {
                console.log('   Detected: RapidVid extractor');

                // av() function pattern
                const avMatch = body.match(/file:\s*av\('([^']+)'\)/);
                if (avMatch) {
                    const encrypted = avMatch[1];
                    const decrypted = decodeAv(encrypted);

                    console.log(`✅ RapidVid stream found (av decoded)`);
                    streams.push({
                        name: 'RapidVid',
                        title: 'RapidVid',
                        url: decrypted,
                        type: 'm3u8',
                        behaviorHints: { notWebReady: false }
                    });
                } else {
                    // Fallback: eval-based extraction
                    const evalMatch = body.match(/eval\(function.*?\)\)\)/s);
                    if (evalMatch) {
                        // Bu kısım complex, basit regex ile m3u8 ara
                        const m3uMatch = body.match(/(https?:\/\/[^\s"'<>()]+\.m3u8[^\s"'<>()]*)/);
                        if (m3uMatch) {
                            streams.push({
                                name: 'RapidVid',
                                title: 'RapidVid',
                                url: m3uMatch[1],
                                type: 'm3u8',
                                behaviorHints: { notWebReady: false }
                            });
                        }
                    }
                }
            }

            // ========== VidMoxy ==========
            if (extractorUrl.includes('vidmoxy.com')) {
                console.log('   Detected: VidMoxy extractor');

                const eeMatch = body.match(/file\s*:\s*EE\.dd\("([^"]+)"/);
                if (eeMatch) {
                    const encoded = eeMatch[1];
                    const decoded = decodeEE(encoded);

                    console.log(`✅ VidMoxy stream found (EE decoded)`);
                    streams.push({
                        name: 'VidMoxy',
                        title: 'VidMoxy',
                        url: decoded,
                        type: 'm3u8',
                        behaviorHints: { notWebReady: false }
                    });
                }
            }

            // ========== VidMoly ==========
            if (extractorUrl.includes('vidmoly.to') || extractorUrl.includes('vidmoly.net')) {
                console.log('   Detected: VidMoly extractor');

                const m3uMatches = body.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/g);
                if (m3uMatches) {
                    m3uMatches.forEach((match, index) => {
                        const urlMatch = match.match(/"([^"]+)"/);
                        if (urlMatch) {
                            streams.push({
                                name: `VidMoly ${index > 0 ? index + 1 : ''}`,
                                title: `VidMoly ${index > 0 ? index + 1 : ''}`,
                                url: urlMatch[1],
                                type: 'm3u8',
                                behaviorHints: { notWebReady: false }
                            });
                        }
                    });
                }
            }

            // ========== TRsTX / Sobreatsesuyp ==========
            if (extractorUrl.includes('trstx.org') || extractorUrl.includes('sobreatsesuyp.com')) {
                console.log('   Detected: TRsTX/Sobreatsesuyp extractor');

                const fileMatch = body.match(/file":"([^"]+)"/);
                if (fileMatch) {
                    const fileUrl = fileMatch[1].replace(/\\/g, '');
                    const domain = new URL(url).origin;
                    const postUrl = `${domain}/${fileUrl}`;

                    const randomId = Math.random().toString(36).substring(2, 10);
                    return {
                        instructions: [{
                            requestId: `selcukflix-trstx-post-${Date.now()}-${randomId}`,
                            purpose: 'trstx-post',
                            url: postUrl,
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json, text/plain, */*',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': url,
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            metadata: {
                                originalUrl: url,
                                extractorName: extractorUrl.includes('trstx') ? 'TRsTX' : 'Sobreatsesuyp'
                            }
                        }]
                    };
                }
            }

            // ========== TurkeyPlayer ==========
            if (extractorUrl.includes('turkeyplayer.com')) {
                console.log('   Detected: TurkeyPlayer extractor');

                const fileMatch = body.match(/"file":"([^"]+)"/);
                if (fileMatch) {
                    const rawM3u = fileMatch[1].replace(/\\/g, '');
                    const fixM3u = rawM3u.replace('thumbnails.vtt', 'master.txt');

                    const titleMatch = body.match(/"title":"([^"]*)"/);
                    const title = titleMatch ? titleMatch[1] : '';
                    const lang = title.includes('SUB') ? 'Altyazılı' : title.includes('DUB') ? 'Dublaj' : '';

                    console.log(`✅ TurkeyPlayer stream found: ${lang}`);
                    streams.push({
                        name: `TurkeyPlayer ${lang}`,
                        title: `TurkeyPlayer ${lang}`,
                        url: fixM3u,
                        type: 'm3u8',
                        behaviorHints: { notWebReady: false }
                    });
                }
            }

            // ========== TurboImgz ==========
            if (extractorUrl.includes('turbo.imgz.me')) {
                console.log('   Detected: TurboImgz extractor');

                const fileMatch = body.match(/file:\s*"([^"]+)"/);
                if (fileMatch) {
                    console.log(`✅ TurboImgz stream found`);
                    streams.push({
                        name: 'TurboImgz',
                        title: 'TurboImgz',
                        url: fileMatch[1],
                        type: 'm3u8',
                        behaviorHints: { notWebReady: false }
                    });
                }
            }

            // ========== GENERIC M3U8 FALLBACK ==========
            if (streams.length === 0) {
                console.log('   No specific extractor matched, trying generic m3u8 extraction...');

                const m3uMatch = body.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/);
                if (m3uMatch) {
                    console.log(`✅ Generic m3u8 stream found`);
                    streams.push({
                        name: 'SelcukFlix',
                        title: 'SelcukFlix',
                        url: m3uMatch[1],
                        type: 'm3u8',
                        behaviorHints: { notWebReady: false }
                    });
                }
            }

            console.log(`\n📊 Total streams found: ${streams.length}`);
            return { streams };
        } catch (error) {
            console.log('❌ Video extractor error:', error.message);
            return { streams: [] };
        }
    }

    // ========== ContentX Source ==========
    if (purpose === 'contentx-source') {
        try {
            console.log(`\n📦 [ContentX Source] Body length: ${body.length}`);
            console.log(`📦 [ContentX Source] Body preview: ${body.substring(0, 800)}`);

            // JSON parse dene
            let m3uLink = null;
            try {
                const jsonData = JSON.parse(body);
                console.log(`📦 [ContentX Source] JSON parsed successfully`);
                console.log(`📦 [ContentX Source] JSON keys: ${Object.keys(jsonData).join(', ')}`);

                // Kotlin'deki gibi playlist[0].sources[0].file path'ini kontrol et
                if (jsonData.playlist &&
                    jsonData.playlist[0] &&
                    jsonData.playlist[0].sources &&
                    jsonData.playlist[0].sources[0] &&
                    jsonData.playlist[0].sources[0].file) {
                    m3uLink = jsonData.playlist[0].sources[0].file;
                    console.log(`📦 [ContentX Source] Found file in playlist: ${m3uLink.substring(0, 100)}...`);
                }
                // Fallback: direkt file field'ı
                else if (jsonData.file) {
                    m3uLink = jsonData.file;
                    console.log(`📦 [ContentX Source] Found file in JSON root: ${m3uLink.substring(0, 100)}...`);
                }
            } catch (e) {
                console.log(`📦 [ContentX Source] Not JSON, trying regex...`);
            }

            // Eğer JSON'dan bulunamadıysa regex ile dene
            if (!m3uLink) {
                const fileMatch = body.match(/file":"([^"]+)"/);
                if (fileMatch) {
                    m3uLink = fileMatch[1].replace(/\\/g, '');
                    console.log(`📦 [ContentX Source] Found file via regex: ${m3uLink.substring(0, 100)}...`);
                }
            }

            if (m3uLink) {
                const extractorName = metadata?.extractorName || 'ContentX';

                console.log(`✅ ${extractorName} stream found`);
                console.log(`   M3U8 URL type: ${m3uLink.includes('m.php') ? 'm.php (proxy)' : 'direct M3U8'}`);
                console.log(`   Initial URL: ${m3uLink.substring(0, 100)}...`);

                // Eğer m.php URL'si ise, gerçek M3U8'i almak için fetch edelim
                if (m3uLink.includes('m.php')) {
                    console.log(`🔄 m.php detected, fetching real M3U8...`);
                    const randomId = Math.random().toString(36).substring(2, 10);
                    return {
                        instructions: [{
                            requestId: `selcukflix-m3u8-resolve-${Date.now()}-${randomId}`,
                            purpose: 'm3u8-resolve',
                            url: m3uLink,
                            method: 'GET',
                            headers: {
                                'Accept': '*/*',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': metadata?.iframeUrl || url,
                                'Origin': new URL(metadata?.iframeUrl || url).origin
                            },
                            metadata: {
                                originalUrl: metadata?.originalUrl,
                                iframeUrl: metadata?.iframeUrl || url,
                                extractorName: extractorName,
                                proxyUrl: m3uLink
                            }
                        }]
                    };
                }

                console.log(`   Final M3U8 URL: ${m3uLink.substring(0, 100)}...`);

                const m3u8Origin = new URL(m3uLink).origin;
                const iframeReferer = metadata?.iframeUrl || url;

                const streamHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': iframeReferer,
                    'Origin': m3u8Origin
                };

                const streams = [{
                    name: extractorName,
                    title: extractorName,
                    url: m3uLink,
                    behaviorHints: {
                        notWebReady: false,
                        proxyHeaders: {
                            request: streamHeaders
                        }
                    }
                }];

                // Altyazıları bul
                const subtitles = [];
                const subRegex = /"file":"((?:\\"|[^"])+)","label":"((?:\\"|[^"])+)"/g;
                let subMatch;
                while ((subMatch = subRegex.exec(body)) !== null) {
                    const subUrlRaw = subMatch[1];
                    const subLangRaw = subMatch[2];

                    // URL ve Dil için escape karakterleri temizleme (Kotlin'deki gibi)
                    const subUrl = subUrlRaw
                        .replace(/\\\//g, '/')
                        .replace(/\\u0026/g, '&')
                        .replace(/\\/g, '');

                    const subLang = subLangRaw
                        .replace(/\\u0131/g, 'ı')
                        .replace(/\\u0130/g, 'İ')
                        .replace(/\\u00fc/g, 'ü')
                        .replace(/\\u00e7/g, 'ç')
                        .replace(/\\u011f/g, 'ğ')
                        .replace(/\\u015f/g, 'ş');

                    const keywords = ['tur', 'tr', 'türkçe', 'turkce'];
                    const language = subLang.includes('Forced') ? 'Turkish Forced' :
                        keywords.some(k => subLang.toLowerCase().includes(k)) ? 'Turkish' : subLang;

                    subtitles.push({
                        id: language.toLowerCase().replace(/\s+/g, '_'),
                        url: subUrl.startsWith('http') ? subUrl : `https:${subUrl}`,
                        lang: language
                    });
                }

                if (subtitles.length > 0) {
                    streams[0].subtitles = subtitles;
                    console.log(`   ${subtitles.length} altyazı bulundu`);
                }

                return { streams };
            }

            console.log('❌ No file found in ContentX source');
            return { streams: [] };
        } catch (error) {
            console.log('❌ ContentX source parsing error:', error.message);
            return { streams: [] };
        }
    }

    // ========== TRsTX Post ==========
    if (purpose === 'trstx-post') {
        try {
            const data = JSON.parse(body);
            const streams = [];
            const extractorName = metadata?.extractorName || 'TRsTX';

            // İlk elemanı atla, video data'ları al
            const videoData = data.slice(1);
            const domain = new URL(url).origin;

            for (const item of videoData) {
                if (item.file && item.title) {
                    const fileUrl = `${domain}/playlist/${item.file.substring(1)}.txt`;

                    // Her video için ayrı instruction oluştur
                    const randomId = Math.random().toString(36).substring(2, 10);
                    return {
                        instructions: [{
                            requestId: `selcukflix-trstx-video-${Date.now()}-${randomId}`,
                            purpose: 'trstx-video',
                            url: fileUrl,
                            method: 'POST',
                            headers: {
                                'Accept': '*/*',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': metadata.originalUrl,
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            metadata: {
                                title: item.title,
                                extractorName: extractorName
                            }
                        }]
                    };
                }
            }

            return { streams };
        } catch (error) {
            console.log('❌ TRsTX post parsing error:', error.message);
            return { streams: [] };
        }
    }

    // ========== TRsTX Video ==========
    if (purpose === 'trstx-video') {
        try {
            const m3uLink = body.trim();
            const title = metadata?.title || 'HD';
            const extractorName = metadata?.extractorName || 'TRsTX';

            console.log(`✅ ${extractorName} stream found: ${title}`);

            return {
                streams: [{
                    name: `${extractorName} - ${title}`,
                    title: `${extractorName} - ${title}`,
                    url: m3uLink,
                    type: 'm3u8',
                    behaviorHints: { notWebReady: false }
                }]
            };
        } catch (error) {
            console.log('❌ TRsTX video parsing error:', error.message);
            return { streams: [] };
        }
    }

    // ========== M3U8 Resolve (m.php proxy) ==========
    if (purpose === 'm3u8-resolve') {
        try {
            console.log(`\n📦 [M3U8 Resolve] Body length: ${body.length}`);
            console.log(`📦 [M3U8 Resolve] Body preview: ${body.substring(0, 500)}`);

            const extractorName = metadata?.extractorName || 'ContentX';
            let realM3u8 = null;

            // HTML wrapped M3U8 kontrolü (örn: <html><head></head><body>#EXTM3U...)
            if (body.includes('<html>') && body.includes('#EXTM3U')) {
                console.log(`🔍 HTML wrapped M3U8 detected, extracting...`);
                const $ = cheerio.load(body);
                const bodyText = $('body').text().trim();
                if (bodyText.includes('#EXTM3U')) {
                    console.log(`✅ Extracted M3U8 from HTML body`);
                    realM3u8 = bodyText;
                }
            }
            // Body'nin kendisi M3U8 olabilir (plain text)
            else if (body.includes('#EXTM3U') || body.includes('#EXT-X-STREAM-INF')) {
                console.log(`✅ Direct M3U8 content found`);
                realM3u8 = body.trim();
            }
            // JSON response olabilir
            else {
                try {
                    const jsonData = JSON.parse(body);
                    console.log(`📦 JSON parsed, keys: ${Object.keys(jsonData).join(', ')}`);

                    // Farklı JSON formatlarını dene
                    if (jsonData.url) {
                        realM3u8 = jsonData.url;
                    } else if (jsonData.file) {
                        realM3u8 = jsonData.file;
                    } else if (jsonData.source) {
                        realM3u8 = jsonData.source;
                    }
                } catch (e) {
                    console.log(`❌ Not JSON, treating as plain text`);
                    realM3u8 = body.trim();
                }
            }

            if (realM3u8) {
                // HTML tag'lerini ve unicode escape'lerini temizle
                realM3u8 = realM3u8
                    .replace(/\\u003C/g, '<')
                    .replace(/\\u003E/g, '>')
                    .replace(/<html>.*?<body>/gi, '')
                    .replace(/<\/body>.*?<\/html>/gi, '')
                    .trim();

                console.log(`✅ Real M3U8 content: ${realM3u8.substring(0, 200)}...`);

                // Base URL'yi oluştur (relative path'leri tam URL'ye çevirmek için)
                const proxyUrl = metadata?.proxyUrl || url;
                const baseUrl = new URL(proxyUrl).origin;
                const basePath = proxyUrl.substring(0, proxyUrl.lastIndexOf('/') + 1);

                console.log(`🔗 Base URL: ${baseUrl}`);
                console.log(`🔗 Base Path: ${basePath}`);

                // M3U8 içeriğini parse et ve gerçek stream URL'lerini çıkar
                const streams = [];
                const subtitles = [];
                const lines = realM3u8.split('\n');

                let currentQuality = null;
                let currentAudio = null;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();

                    // Audio track
                    if (line.startsWith('#EXT-X-MEDIA:TYPE=AUDIO')) {
                        const nameMatch = line.match(/NAME="([^"]+)"/);
                        const uriMatch = line.match(/URI="([^"]+)"/);
                        if (nameMatch && uriMatch) {
                            currentAudio = {
                                name: nameMatch[1],
                                url: uriMatch[1]
                            };
                        }
                    }

                    // Subtitle track
                    if (line.startsWith('#EXT-X-MEDIA:TYPE=SUBTITLES')) {
                        const nameMatch = line.match(/NAME="([^"]+)"/);
                        const langMatch = line.match(/LANGUAGE="([^"]+)"/);
                        const uriMatch = line.match(/URI="([^"]+)"/);

                        if (uriMatch) {
                            let subUrl = uriMatch[1];

                            // Relative URL'yi tam URL'ye çevir
                            if (!subUrl.startsWith('http://') && !subUrl.startsWith('https://')) {
                                if (subUrl.startsWith('/')) {
                                    subUrl = `${baseUrl}${subUrl}`;
                                } else {
                                    subUrl = `${basePath}${subUrl}`;
                                }
                            }

                            const subName = nameMatch ? nameMatch[1] : (langMatch ? langMatch[1] : 'Unknown');
                            const subLang = langMatch ? langMatch[1] : subName;

                            subtitles.push({
                                id: subLang.toLowerCase().replace(/\s+/g, '_'),
                                url: subUrl,
                                lang: subName
                            });
                        }
                    }

                    // Video stream
                    if (line.startsWith('#EXT-X-STREAM-INF')) {
                        const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
                        const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);

                        if (resolutionMatch && i + 1 < lines.length) {
                            const streamUrl = lines[i + 1].trim();
                            if (streamUrl && !streamUrl.startsWith('#')) {
                                const resolution = resolutionMatch[1];
                                const height = resolution.split('x')[1];

                                // Relative URL'yi tam URL'ye çevir
                                let fullStreamUrl;
                                if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://')) {
                                    fullStreamUrl = streamUrl;
                                } else if (streamUrl.startsWith('/')) {
                                    // Absolute path (domain'den başlıyor)
                                    fullStreamUrl = `${baseUrl}${streamUrl}`;
                                } else {
                                    // Relative path (mevcut dizinden başlıyor)
                                    fullStreamUrl = `${basePath}${streamUrl}`;
                                }

                                console.log(`   📺 ${height}p: ${fullStreamUrl.substring(0, 80)}...`);

                                const streamOrigin = new URL(fullStreamUrl).origin;
                                const iframeReferer = metadata?.iframeUrl || url;

                                const streamHeaders = {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                    'Referer': iframeReferer,
                                    'Origin': streamOrigin
                                };

                                const streamObj = {
                                    name: `${extractorName} - ${height}p`,
                                    title: `${extractorName} - ${height}p`,
                                    url: fullStreamUrl,
                                    behaviorHints: {
                                        notWebReady: false,
                                        proxyHeaders: {
                                            request: streamHeaders
                                        }
                                    }
                                };

                                // Altyazıları ekle (sadece ilk stream'e)
                                if (streams.length === 0 && subtitles.length > 0) {
                                    streamObj.subtitles = subtitles;
                                }

                                streams.push(streamObj);
                            }
                        }
                    }
                }

                // Altyazı log
                if (subtitles.length > 0) {
                    console.log(`   📝 ${subtitles.length} altyazı bulundu`);
                }

                // Eğer hiç stream bulunamadıysa, tüm M3U8'i data URL olarak döndür
                if (streams.length === 0) {
                    console.log(`⚠️ No individual streams found, returning as data URL`);

                    // M3U8 içindeki relative URL'leri tam URL'ye çevir
                    const fixedM3u8Lines = realM3u8.split('\n').map(line => {
                        const trimmedLine = line.trim();

                        // Yorum satırları ve boş satırları olduğu gibi bırak
                        if (trimmedLine.startsWith('#') || trimmedLine === '') {
                            return line;
                        }

                        // URL satırlarını düzelt
                        if (trimmedLine.startsWith('http://') || trimmedLine.startsWith('https://')) {
                            return line;
                        } else if (trimmedLine.startsWith('/')) {
                            return `${baseUrl}${trimmedLine}`;
                        } else {
                            return `${basePath}${trimmedLine}`;
                        }
                    }).join('\n');

                    // M3U8 içeriğini data URL olarak döndür
                    const base64M3u8 = Buffer.from(fixedM3u8Lines).toString('base64');
                    const dataUrl = `data:application/vnd.apple.mpegurl;base64,${base64M3u8}`;

                    console.log(`📦 Data URL created (${base64M3u8.length} bytes base64)`);

                    const iframeReferer = metadata?.iframeUrl || url;
                    const streamHeaders = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': iframeReferer
                    };

                    return {
                        streams: [{
                            name: extractorName,
                            title: extractorName,
                            url: dataUrl,
                            behaviorHints: {
                                notWebReady: false,
                                proxyHeaders: {
                                    request: streamHeaders
                                }
                            }
                        }]
                    };
                }

                console.log(`✅ Found ${streams.length} quality stream(s)`);
                return { streams };
            }

            console.log(`❌ Could not resolve M3U8 from m.php`);
            return { streams: [] };
        } catch (error) {
            console.log('❌ M3U8 resolve error:', error.message);
            return { streams: [] };
        }
    }

    return { ok: true };
}

// ============ DECODER FUNCTIONS ============

// RapidVid av() decoder
function decodeAv(input) {
    try {
        // 1. Reverse and Base64 decode
        const reversed = input.split('').reverse().join('');
        const firstPass = Buffer.from(reversed, 'base64');

        // 2. Subtract key values
        const key = 'K9L';
        const adjusted = Buffer.alloc(firstPass.length);
        for (let i = 0; i < firstPass.length; i++) {
            const sub = firstPass[i] - ((key.charCodeAt(i % 3) % 5) + 1);
            adjusted[i] = sub;
        }

        // 3. Second Base64 decode
        const secondPass = Buffer.from(adjusted.toString('base64'), 'base64');
        return secondPass.toString('utf-8');
    } catch (e) {
        console.log('❌ decodeAv error:', e.message);
        return '';
    }
}

// VidMoxy EE.dd() decoder
function decodeEE(encoded) {
    try {
        // 1. URL-safe to standard Base64
        let s = encoded.replace(/-/g, '+').replace(/_/g, '/');

        // 2. Add padding
        while (s.length % 4 !== 0) {
            s += '=';
        }

        // 3. Base64 decode
        const decodedBytes = Buffer.from(s, 'base64');
        const a = decodedBytes.toString('utf-8');

        // 4. ROT13
        let rot13 = '';
        for (let i = 0; i < a.length; i++) {
            const c = a[i];
            if (c >= 'A' && c <= 'Z') {
                rot13 += String.fromCharCode(((c.charCodeAt(0) - 65 + 13) % 26) + 65);
            } else if (c >= 'a' && c <= 'z') {
                rot13 += String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97);
            } else {
                rot13 += c;
            }
        }

        // 5. Reverse
        return rot13.split('').reverse().join('');
    } catch (e) {
        console.log('❌ decodeEE error:', e.message);
        return '';
    }
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

