const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.sinefy',
    version: '1.0.0',
    name: 'Sinefy',
    description: 'Türkçe film ve dizi izleme platformu - Netflix içerikleri, yerli ve yabancı yapımlar',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'sinefy_son_eklenenler',
            name: 'Son Eklenenler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'sinefy_yeni_filmler',
            name: 'Yeni Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'sinefy_netflix_filmleri',
            name: 'Netflix Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'sinefy_netflix_dizileri',
            name: 'Netflix Dizileri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'sinefy_turk_filmleri',
            name: 'Türk Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'sinefy_kore_filmleri',
            name: 'Kore Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'sinefy_aksiyon_filmler',
            name: 'Aksiyon Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'sinefy_aksiyon_diziler',
            name: 'Aksiyon Dizileri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'sinefy_komedi_filmler',
            name: 'Komedi Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'sinefy_komedi_diziler',
            name: 'Komedi Dizileri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'sinefy_search',
            name: 'Film Ara',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['sinefy']
};

const BASE_URL = 'https://sinefy3.com';

// Katalog URL'leri
const CATALOG_URLS = {
    'sinefy_son_eklenenler': `${BASE_URL}/page/`,
    'sinefy_yeni_filmler': `${BASE_URL}/en-yenifilmler/`,
    'sinefy_netflix_filmleri': `${BASE_URL}/netflix-filmleri-izle/`,
    'sinefy_netflix_dizileri': `${BASE_URL}/dizi-izle/netflix/`,
    'sinefy_turk_filmleri': `${BASE_URL}/gozat/filmler/ulke/turkiye`,
    'sinefy_kore_filmleri': `${BASE_URL}/gozat/filmler/ulke/kore`,
    'sinefy_aksiyon_filmler': `${BASE_URL}/gozat/filmler/aksiyon`,
    'sinefy_aksiyon_diziler': `${BASE_URL}/gozat/diziler/aksiyon`,
    'sinefy_komedi_filmler': `${BASE_URL}/gozat/filmler/komedi`,
    'sinefy_komedi_diziler': `${BASE_URL}/gozat/diziler/komedi`
};

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [Sinefy Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 18) + 1;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalog
    if (catalogId === 'sinefy_search' && searchQuery) {
        const requestId = `sinefy-search-${Date.now()}-${randomId}`;
        return {
            instructions: [{
                requestId,
                purpose: 'catalog_search',
                url: `${BASE_URL}/bg/searchcontent`,
                method: 'POST',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: `cKey=ca1d4a53d0f4761a949b85e51e18f096&cValue=MTc0NzI2OTAwMDU3ZTEwYmZjMDViNWFmOWIwZDViODg0MjU4MjA1ZmYxOThmZTYwMDdjMWQzMzliNzY5NzFlZmViMzRhMGVmNjgwODU3MGIyZA==&searchTerm=${encodeURIComponent(searchQuery)}`,
                metadata: { catalogId }
            }]
        };
    }

    // Normal catalog
    const baseUrl = CATALOG_URLS[catalogId];
    if (!baseUrl) {
        return { instructions: [] };
    }

    // URL oluşturma
    let url;
    if (catalogId === 'sinefy_son_eklenenler') {
        url = `${baseUrl}${page}`;
    } else if (baseUrl.includes('/en-yenifilmler') || baseUrl.includes('/netflix')) {
        url = page > 1 ? `${baseUrl}${page}` : baseUrl;
    } else if (baseUrl.includes('/gozat/')) {
        url = page > 1 ? `${baseUrl}&page=${page}` : baseUrl;
    } else {
        url = baseUrl;
    }

    const requestId = `sinefy-catalog-${catalogId}-${page}-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            metadata: { catalogId }
        }]
    };
}

async function handleMeta(args) {
    const url = Buffer.from(args.id.replace('sinefy:', ''), 'base64').toString('utf-8');

    console.log(`📺 [Sinefy Meta] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `sinefy-meta-${Date.now()}-${randomId}`;

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
    const url = Buffer.from(args.id.replace('sinefy:', ''), 'base64').toString('utf-8');

    console.log(`🎬 [Sinefy Stream] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `sinefy-stream-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        }]
    };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata } = fetchResult;

    console.log(`\n⚙️ [Sinefy Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    // Catalog Search
    if (purpose === 'catalog_search') {
        try {
            // JSON parse et
            const cleanBody = body.trim().replace(/^\uFEFF/, ''); // BOM karakterini temizle
            let jsonData;

            try {
                jsonData = JSON.parse(cleanBody);
            } catch (e) {
                // JSON hatası varsa, temizleyip tekrar dene
                const jsonStart = cleanBody.indexOf('{');
                if (jsonStart >= 0) {
                    jsonData = JSON.parse(cleanBody.substring(jsonStart));
                } else {
                    throw e;
                }
            }

            const resultArray = jsonData?.data?.result;
            if (!resultArray || !Array.isArray(resultArray)) {
                console.log('❌ No search results');
                return { metas: [] };
            }

            const metas = [];

            resultArray.forEach(item => {
                const name = item.object_name;
                if (!name) return;

                let slug = item.used_slug?.replace(/\\/g, '');
                if (!slug) return;

                const href = slug.startsWith('http') ? slug : `${BASE_URL}/${slug}`;

                // Type belirleme
                const typeStr = item.used_type || 'Movies';
                const type = (typeStr === 'Series' || typeStr === 'TvSeries' || typeStr === 'MovieSeries')
                    ? 'series' : 'movie';

                const year = item.object_release_year || null;

                // Poster URL
                let posterUrl = item.object_poster_url;
                if (posterUrl && posterUrl.includes('cdn.ampproject.org')) {
                    const filename = posterUrl.split('/').pop();
                    posterUrl = `https://images.macellan.online/images/movie/poster/180/275/80/${filename}`;
                } else if (posterUrl) {
                    posterUrl = posterUrl.replace(/\\/g, '');
                }

                const id = 'sinefy:' + Buffer.from(href).toString('base64').replace(/=/g, '');

                metas.push({
                    id: id,
                    type: type,
                    name: name,
                    poster: posterUrl || null,
                    releaseInfo: year ? year.toString() : null
                });
            });

            console.log(`✅ Found ${metas.length} search results`);
            return { metas };
        } catch (error) {
            console.log('❌ Search parse error:', error.message);
            return { metas: [] };
        }
    }

    // Catalog
    if (purpose === 'catalog') {
        try {
            const $ = cheerio.load(body);
            const metas = [];

            $('div.poster-with-subject, div.dark-segment div.poster-md.poster').each((i, elem) => {
                const title = $(elem).find('h2').text().trim();
                if (!title) return;

                const href = $(elem).find('a').attr('href');
                if (!href) return;

                const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

                // Poster - srcset'ten al
                const srcset = $(elem).find('img').attr('data-srcset');
                let posterUrl = null;
                if (srcset) {
                    const parts = srcset.split(',').map(s => s.trim());
                    const first1x = parts.find(p => p.endsWith('1x'));
                    if (first1x) {
                        posterUrl = first1x.split(' ')[0];
                    }
                }

                // Rating
                const rating = $(elem).find('span.rating').text().trim();

                const id = 'sinefy:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                metas.push({
                    id: id,
                    type: 'movie',
                    name: title,
                    poster: posterUrl || null,
                    imdbRating: rating || null
                });
            });

            console.log(`✅ Found ${metas.length} items in catalog`);
            return { metas };
        } catch (error) {
            console.log('❌ Catalog parse error:', error.message);
            return { metas: [] };
        }
    }

    // Meta
    if (purpose === 'meta') {
        try {
            const $ = cheerio.load(body);

            const title = $('h1').text().trim();
            if (!title || title.includes('429 Too Many Requests')) {
                return { meta: null };
            }

            // Poster
            const srcset = $('div.ui.items img').attr('data-srcset');
            let posterUrl = null;
            if (srcset) {
                const parts = srcset.split(',').map(s => s.trim());
                const first1x = parts.find(p => p.endsWith('1x'));
                if (first1x) {
                    posterUrl = first1x.split(' ')[0];
                }
            }

            const description = $('p#tv-series-desc').text().trim();

            // Yapım Yılı
            const yearText = $('table.ui > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(5) > div:nth-child(2)').text().trim();
            const year = yearText ? parseInt(yearText) : null;

            // Türler
            const tags = [];
            $('div.item.categories a').each((i, elem) => {
                tags.push($(elem).text().trim());
            });

            // IMDB Puanı
            const rating = $('span.color-imdb').text().trim();

            // Süre
            const durationText = $('table.ui > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(6) > div:nth-child(2)').text().trim();
            const duration = durationText ? `${durationText.split(' ')[0]} dk` : null;

            // Oyuncular
            const actors = [];
            $('div.content h5').each((i, elem) => {
                actors.push($(elem).text().trim());
            });

            // Trailer
            const trailers = [];
            $('div.media-trailer[data-yt]').each((i, elem) => {
                const ytId = $(elem).attr('data-yt');
                if (ytId) {
                    trailers.push(`https://www.youtube.com/watch?v=${ytId}`);
                }
            });

            // Dizi mi kontrol et
            const hasSeasons = $('section.episodes-box').length > 0;

            if (hasSeasons) {
                // Dizi tespit edildi - Kotlin gibi her sezon için ayrı instruction oluştur
                console.log(`   📺 Dizi tespit edildi, sezonlar bulunuyor...`);

                // Sezon linklerini topla (Kotlin: seasonVarList)
                const seasonUrls = [];
                $('section.episodes-box div.ui.vertical.fluid.tabular.menu a').each((i, elem) => {
                    const seasonHref = $(elem).attr('href');
                    if (seasonHref) {
                        const fullUrl = seasonHref.startsWith('http') ? seasonHref : `${BASE_URL}${seasonHref}`;
                        // Kotlin'deki gibi /bolum-1 ekle
                        seasonUrls.push(fullUrl + '/bolum-1');
                    }
                });

                console.log(`   ${seasonUrls.length} sezon bulundu`);

                if (seasonUrls.length > 0) {
                    // Her sezon için instruction oluştur (Kotlin: app.get(seasonUrl).document)
                    const instructions = seasonUrls.map((seasonUrl, idx) => {
                        const randomId = Math.random().toString(36).substring(2, 10);

                        return {
                            requestId: `sinefy-season-${idx}-${Date.now()}-${randomId}`,
                            purpose: 'meta_season',
                            url: seasonUrl,
                            method: 'GET',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                'Referer': url
                            },
                            metadata: {
                                seasonIndex: idx,
                                totalSeasons: seasonUrls.length,
                                // Sadece SON sezon için originalMeta ekle (memory optimization)
                                ...(idx === seasonUrls.length - 1 ? {
                                    originalMeta: {
                                        id: 'sinefy:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                                        type: 'series',
                                        name: title,
                                        poster: posterUrl,
                                        background: posterUrl,
                                        description: description || 'Açıklama mevcut değil',
                                        releaseInfo: year ? year.toString() : null,
                                        imdbRating: rating || null,
                                        genres: tags.length > 0 ? tags : undefined,
                                        runtime: duration,
                                        cast: actors.length > 0 ? actors : undefined,
                                        trailer: trailers[0] || null
                                    }
                                } : {})
                            }
                        };
                    });

                    console.log(`   ✅ ${instructions.length} sezon için instruction oluşturuldu`);

                    // Instructions döndür - Flutter bunları sırayla işleyecek
                    return { instructions };
                }

                // Fallback - sezon bulunamazsa boş bölümlerle dizi döndür
                console.log(`   ⚠️ Hiç sezon bulunamadı, boş dizi döndürülüyor`);
                return {
                    meta: {
                        id: 'sinefy:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                        type: 'series',
                        name: title,
                        poster: posterUrl || null,
                        background: posterUrl || null,
                        description: description || 'Açıklama mevcut değil',
                        releaseInfo: year ? year.toString() : null,
                        imdbRating: rating || null,
                        genres: tags.length > 0 ? tags : undefined,
                        runtime: duration,
                        cast: actors.length > 0 ? actors : undefined,
                        trailer: trailers[0] || null,
                        videos: []
                    }
                };
            } else {
                // Film
                return {
                    meta: {
                        id: 'sinefy:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                        type: 'movie',
                        name: title,
                        poster: posterUrl || null,
                        background: posterUrl || null,
                        description: description || 'Açıklama mevcut değil',
                        releaseInfo: year ? year.toString() : null,
                        imdbRating: rating || null,
                        genres: tags.length > 0 ? tags : undefined,
                        runtime: duration,
                        cast: actors.length > 0 ? actors : undefined,
                        trailer: trailers[0] || null
                    }
                };
            }
        } catch (error) {
            console.log('❌ Meta parse error:', error.message);
            return { meta: null };
        }
    }

    // Meta Season (Sezon bölümlerini parse et - Kotlin Sinefy.kt'deki gibi)
    if (purpose === 'meta_season') {
        try {
            const $ = cheerio.load(body);

            console.log(`\n📺 [Meta Season] Processing season page...`);
            console.log(`   URL: ${url.substring(0, 80)}...`);

            // Sezon numarası - Kotlin'deki gibi regex ile (line 269)
            let seasonNumber = 1;
            const seasonText = $('span.light-title').text().trim();
            const seasonMatch = seasonText.match(/(\d+)\.\s*Sezon/);

            if (seasonMatch) {
                seasonNumber = parseInt(seasonMatch[1]);
                console.log(`   Sezon numarası: ${seasonNumber}`);
            } else {
                // Fallback: URL'den çıkar
                const urlSeasonMatch = url.match(/\/sezon-(\d+)/);
                if (urlSeasonMatch) {
                    seasonNumber = parseInt(urlSeasonMatch[1]);
                    console.log(`   Sezon numarası (URL'den): ${seasonNumber}`);
                }
            }

            // Bölümleri parse et - Kotlin'deki gibi (line 271-284)
            const currentVideos = [];
            $('div.swiper-slide.ss-episode').each((i, elem) => {
                const episodeNum = $(elem).attr('data-episode');
                const epHref = $(elem).find('a.episode-link').attr('href');
                const epName = $(elem).find('h3').text().trim();

                if (epHref && episodeNum) {
                    const fullUrl = epHref.startsWith('http') ? epHref : `${BASE_URL}${epHref}`;
                    const videoId = 'sinefy:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                    currentVideos.push({
                        id: videoId,
                        title: epName || `${seasonNumber}. Sezon ${episodeNum}. Bölüm`,
                        season: seasonNumber,
                        episode: parseInt(episodeNum)
                    });
                }
            });

            console.log(`   ✅ ${currentVideos.length} bölüm bulundu (Sezon ${seasonNumber})`);

            // Flutter backend'deki getMetaDetailed ile uyumlu format
            // Backend metadata.allVideos'u biriktirir
            const seasonIndex = metadata?.seasonIndex;
            const totalSeasons = metadata?.totalSeasons;

            console.log(`   Progress: ${seasonIndex + 1}/${totalSeasons}`);

            // Eğer bu SON sezon ise, tam meta döndür
            if (seasonIndex !== undefined && totalSeasons !== undefined &&
                seasonIndex >= totalSeasons - 1) {
                console.log(`   🎉 SON SEZON işlendi!`);

                // originalMeta mutlaka olmalı (son sezon için göndermiştik)
                if (metadata?.originalMeta) {
                    const meta = metadata.originalMeta;
                    meta.videos = currentVideos; // Backend bunları birleştirecek
                    return { meta };
                } else {
                    console.log(`   ⚠️ originalMeta bulunamadı!`);
                    return { videos: currentVideos };
                }
            }

            // Henüz son sezon değil - partialMeta döndür
            // Backend bunu allVideos array'ine ekleyecek
            console.log(`   📦 Partial meta döndürülüyor (sezon ${seasonIndex + 1}/${totalSeasons})`);

            return {
                partialMeta: {
                    videos: currentVideos
                }
            };
        } catch (error) {
            console.log('❌ Meta season parse error:', error.message);
            console.log('   Stack:', error.stack);
            return { partialMeta: { videos: [] } };
        }
    }

    // Stream
    if (purpose === 'stream') {
        try {
            const $ = cheerio.load(body);
            let iframeSrc = $('iframe').attr('src');

            if (!iframeSrc) {
                console.log('❌ No iframe found');
                return { streams: [] };
            }

            console.log(`   Raw iframe src: ${iframeSrc.substring(0, 100)}...`);

            // Kotlin'deki fixUrlNull mantığı: iframe src tam URL değilse düzelt
            let fullIframeUrl;
            if (iframeSrc.startsWith('http://') || iframeSrc.startsWith('https://')) {
                // Zaten tam URL
                fullIframeUrl = iframeSrc;
            } else if (iframeSrc.startsWith('//')) {
                // Protocol-relative URL (//domain.com/path)
                fullIframeUrl = `https:${iframeSrc}`;
            } else if (iframeSrc.startsWith('/')) {
                // Absolute path (/path/to/file)
                fullIframeUrl = `${BASE_URL}${iframeSrc}`;
            } else {
                // Relative path (path/to/file) veya domain başlangıcı
                // Eğer domain gibi görünüyorsa (nokta içeriyorsa ve slash ile başlamıyorsa)
                if (iframeSrc.includes('.') && !iframeSrc.startsWith('/')) {
                    fullIframeUrl = `https://${iframeSrc}`;
                } else {
                    fullIframeUrl = `${BASE_URL}/${iframeSrc}`;
                }
            }

            console.log(`✅ Iframe found: ${fullIframeUrl.substring(0, 80)}...`);

            const randomId = Math.random().toString(36).substring(2, 10);

            return {
                instructions: [{
                    requestId: `sinefy-extract-${Date.now()}-${randomId}`,
                    purpose: 'stream_extract',
                    url: fullIframeUrl,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': url
                    },
                    metadata: { streamName: 'Sinefy', originalUrl: url }
                }]
            };
        } catch (error) {
            console.log('❌ Stream error:', error.message);
            return { streams: [] };
        }
    }

    // Stream Extract
    if (purpose === 'stream_extract') {
        try {
            const streams = [];
            const streamName = metadata?.streamName || 'Sinefy';

            console.log(`\n🔍 [STREAM EXTRACT] ${streamName} işleniyor...`);
            console.log(`   URL: ${url.substring(0, 80)}...`);
            console.log(`   Body length: ${body.length} bytes`);

            // Cloudflare check - ERKEN ÇIKIŞ (Kotlin'da loadExtractor bu durumu handle eder)
            if (body.includes('Attention Required') && body.includes('Cloudflare')) {
                console.log('   ⚠️ Cloudflare challenge detected');
                console.log('   💡 CRITICAL: Flutter MUST handle this with WebView + Cookie/Session bypass');
                console.log('   💡 This is blocking the extraction - no window.openPlayer() found');
                console.log('   💡 Kotlin loadExtractor() uses built-in Cloudflare bypass');
                return { streams: [] };
            }

            // ContentX / Pichive extractor (SelcukFlix'teki gibi - TAM VERSİYON)
            if (url.includes('pichive.online') ||
                url.includes('contentx.me') ||
                url.includes('hotlinger.com') ||
                url.includes('playru.net') ||
                url.includes('dplayer82.site') ||
                url.includes('dplayer74.site')) {

                console.log('   🎯 Detected: ContentX/Pichive extractor');

                // Altyazıları iframe'den çek (Kotlin'deki gibi)
                const iframeSubtitles = [];
                const subUrls = new Set();

                // Kotlin'deki pattern: "file":"((?:\\\"|[^"])+)","label":"((?:\\\"|[^"])+)"
                const subRegex = /"file":"((?:\\\\"|[^"])+)","label":"((?:\\\\"|[^"])+)"/g;
                let subMatch;

                while ((subMatch = subRegex.exec(body)) !== null) {
                    const subUrlRaw = subMatch[1];
                    const subLangRaw = subMatch[2];

                    // URL temizleme (Kotlin'deki gibi)
                    const subUrl = subUrlRaw
                        .replace(/\\\//g, '/')
                        .replace(/\\u0026/g, '&')
                        .replace(/\\/g, '');

                    // Dil temizleme (Kotlin'deki gibi - Türkçe karakterler)
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

                    if (!subUrls.has(subUrl)) {
                        subUrls.add(subUrl);
                        iframeSubtitles.push({
                            id: language.toLowerCase().replace(/\s+/g, '_'),
                            url: subUrl.startsWith('http') ? subUrl : `https:${subUrl}`,
                            lang: language
                        });
                        console.log(`   📝 Iframe'den altyazı bulundu: ${language}`);
                    }
                }

                // window.openPlayer() pattern
                const openPlayerMatch = body.match(/window\.openPlayer\(['"]([^'"]+)['"]/);
                if (openPlayerMatch) {
                    const playerId = openPlayerMatch[1];
                    console.log(`   ✅ Found openPlayer ID: ${playerId}`);

                    const domain = new URL(url).origin;
                    const sourceUrl = `${domain}/source2.php?v=${playerId}`;

                    // Dublaj kontrolü (Kotlin'deki gibi)
                    const dublajMatch = body.match(/","([^']+)","Türkçe"/);
                    const iDublaj = dublajMatch ? dublajMatch[1] : null;

                    if (iDublaj) {
                        console.log(`   🎤 Found dublaj ID: ${iDublaj}`);
                    }

                    const randomId = Math.random().toString(36).substring(2, 10);
                    return {
                        instructions: [{
                            requestId: `sinefy-contentx-source-${Date.now()}-${randomId}`,
                            purpose: 'contentx_source',
                            url: sourceUrl,
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json, text/plain, */*',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': url,
                                'Origin': domain
                            },
                            metadata: {
                                streamName,
                                originalUrl: metadata?.originalUrl,
                                iframeUrl: url,
                                extractorName: 'Pichive',
                                iframeSubtitles: iframeSubtitles,
                                iDublaj: iDublaj,
                                domain: domain
                            }
                        }]
                    };
                }
            }

            // Daha kapsamlı M3U8 pattern listesi
            const m3u8Patterns = [
                // Standart JavaScript object patterns
                /file:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/i,
                /source:\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /src:\s*["']([^"']+\.m3u8[^"']*)["']/i,

                // Array patterns
                /sources:\s*\[\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /playlist:\s*\[\s*["']([^"']+\.m3u8[^"']*)["']/i,

                // Script içinde değişken atamaları
                /var\s+\w+\s*=\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /const\s+\w+\s*=\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /let\s+\w+\s*=\s*["']([^"']+\.m3u8[^"']*)["']/i,

                // window.openPlayer gibi fonksiyon çağrıları
                /openPlayer\s*\(\s*["']([^"']+\.m3u8[^"']*)["']/i,
                /loadVideo\s*\(\s*["']([^"']+\.m3u8[^"']*)["']/i,

                // Herhangi bir yerdeki HTTP(S) m3u8 linki (fallback)
                /(https?:\/\/[^\s"'<>()]+\.m3u8[^\s"'<>()]*)/i
            ];

            let m3uUrl = null;

            // Tüm pattern'leri dene
            for (let i = 0; i < m3u8Patterns.length; i++) {
                const match = body.match(m3u8Patterns[i]);
                if (match) {
                    m3uUrl = match[1] || match[0];
                    // Escape karakterlerini temizle
                    m3uUrl = m3uUrl.replace(/\\/g, '').replace(/\\"/g, '"').trim();
                    console.log(`   ✅ M3U8 bulundu (Pattern #${i + 1}): ${m3uUrl.substring(0, 80)}...`);
                    break;
                }
            }

            // Eğer hala bulunamadıysa, script tag'lerinde ara
            if (!m3uUrl && body.includes('.m3u8')) {
                console.log(`   🔍 Script tag'lerinde aranıyor...`);
                const scriptMatches = body.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
                if (scriptMatches) {
                    for (const scriptTag of scriptMatches) {
                        const scriptContent = scriptTag.replace(/<\/?script[^>]*>/gi, '');
                        if (scriptContent.includes('.m3u8')) {
                            const match = scriptContent.match(/(https?:\/\/[^\s"'<>()]+\.m3u8[^\s"'<>()]*)/);
                            if (match) {
                                m3uUrl = match[1] || match[0];
                                console.log(`   ✅ Script'te M3U8 bulundu: ${m3uUrl.substring(0, 80)}...`);
                                break;
                            }
                        }
                    }
                }
            }

            // window.openPlayer() içinde şifreli ID olabilir
            if (!m3uUrl) {
                const openPlayerMatch = body.match(/window\.openPlayer\(['"]([^'"]+)['"]/);
                if (openPlayerMatch) {
                    const playerId = openPlayerMatch[1];
                    console.log(`   🔍 window.openPlayer bulundu, ID: ${playerId}`);

                    // source2.php veya benzeri bir endpoint'e istek at
                    const domain = new URL(url).origin;
                    const sourceUrl = `${domain}/source2.php?v=${playerId}`;

                    const randomId = Math.random().toString(36).substring(2, 10);
                    return {
                        instructions: [{
                            requestId: `sinefy-player-source-${Date.now()}-${randomId}`,
                            purpose: 'player_source',
                            url: sourceUrl,
                            method: 'GET',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': url,
                                'Origin': domain
                            },
                            metadata: { streamName, originalUrl: metadata?.originalUrl }
                        }]
                    };
                }
            }

            if (m3uUrl) {
                // URL'yi tam hale getir
                if (!m3uUrl.startsWith('http://') && !m3uUrl.startsWith('https://')) {
                    const domain = new URL(url).origin;
                    if (m3uUrl.startsWith('/')) {
                        m3uUrl = `${domain}${m3uUrl}`;
                    } else {
                        m3uUrl = `https:${m3uUrl}`;
                    }
                }

                console.log(`✅ Stream hazırlandı: ${m3uUrl.substring(0, 80)}...`);

                streams.push({
                    name: streamName,
                    title: streamName,
                    url: m3uUrl,
                    behaviorHints: {
                        notWebReady: false,
                        proxyHeaders: {
                            request: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': url,
                                'Origin': new URL(url).origin
                            }
                        }
                    }
                });
            } else {
                console.log('❌ No M3U8 found in iframe content');
                console.log(`   Body preview (first 500 chars): ${body.substring(0, 500)}`);
            }

            return { streams };
        } catch (error) {
            console.log('❌ Stream extraction error:', error.message);
            console.log('   Stack:', error.stack);
            return { streams: [] };
        }
    }

    // ContentX Source (Pichive için) - TAM VERSİYON (Altyazı/Audio Track desteği)
    if (purpose === 'contentx_source') {
        try {
            console.log(`\n📦 [ContentX Source] Body length: ${body.length}`);
            console.log(`📦 [ContentX Source] Body preview: ${body.substring(0, 300)}`);

            // Ana stream için M3U8 linkini bul
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
                const extractorName = metadata?.extractorName || 'Pichive';
                const streamName = metadata?.streamName || 'Sinefy';

                console.log(`✅ ${extractorName} stream found`);
                console.log(`   M3U8 URL type: ${m3uLink.includes('m.php') ? 'm.php (proxy)' : 'direct M3U8'}`);

                // Altyazıları bul
                const subtitles = [];

                // Önce iframe'den gelen altyazıları ekle
                if (metadata?.iframeSubtitles && Array.isArray(metadata.iframeSubtitles)) {
                    subtitles.push(...metadata.iframeSubtitles);
                    console.log(`   📝 ${metadata.iframeSubtitles.length} altyazı iframe'den alındı`);
                }

                // Sonra source2.php'den gelen altyazıları ekle
                const subUrls = new Set(subtitles.map(s => s.url));

                // JSON parse ile dene (daha güvenilir)
                try {
                    const jsonData = JSON.parse(body);
                    const tracks = jsonData.playlist?.[0]?.tracks || [];

                    console.log(`   🔍 Tracks array length: ${tracks.length}`);

                    for (const track of tracks) {
                        console.log(`   🔍 Processing track: ${track.kind} - ${track.label}`);

                        if (track.kind === 'captions' && track.file && track.label) {
                            const subUrlRaw = track.file;
                            const subLangRaw = track.label;

                            // URL temizleme
                            const subUrl = subUrlRaw
                                .replace(/\\\//g, '/')
                                .replace(/\\u0026/g, '&')
                                .replace(/\\/g, '');

                            // Dil temizleme (Türkçe karakterler)
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

                            const finalSubUrl = subUrl.startsWith('http') ? subUrl : `https:${subUrl}`;

                            // Duplicate kontrolü
                            if (!subUrls.has(finalSubUrl)) {
                                subUrls.add(finalSubUrl);
                                console.log(`   ✅ Added subtitle: ${language}`);
                                subtitles.push({
                                    id: language.toLowerCase().replace(/\s+/g, '_'),
                                    url: finalSubUrl,
                                    lang: language
                                });
                            }
                        }
                    }

                    if (subtitles.length > 0) {
                        console.log(`   📝 Toplam ${subtitles.length} altyazı bulundu`);
                    } else {
                        console.log(`   ℹ️ Hiç altyazı bulunamadı`);
                    }
                } catch (e) {
                    console.log(`   ℹ️ JSON parse error for subtitles, trying regex...`);

                    // Kotlin'deki regex pattern
                    const trackRegex = /"file":"((?:\\"|[^"])+)","label":"((?:\\"|[^"])+)"/g;
                    let trackMatch;

                    while ((trackMatch = trackRegex.exec(body)) !== null) {
                        const subUrlRaw = trackMatch[1];
                        const subLangRaw = trackMatch[2];

                        // URL temizleme
                        const subUrl = subUrlRaw
                            .replace(/\\\//g, '/')
                            .replace(/\\u0026/g, '&')
                            .replace(/\\/g, '');

                        // Dil temizleme
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

                        const finalSubUrl = subUrl.startsWith('http') ? subUrl : `https:${subUrl}`;

                        if (!subUrls.has(finalSubUrl)) {
                            subUrls.add(finalSubUrl);
                            subtitles.push({
                                id: language.toLowerCase().replace(/\s+/g, '_'),
                                url: finalSubUrl,
                                lang: language
                            });
                        }
                    }
                }

                // Stream object'i oluştur
                const m3u8Origin = new URL(m3uLink).origin;
                const iframeReferer = metadata?.iframeUrl || url;

                const streamHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': iframeReferer,
                    'Origin': m3u8Origin
                };

                const streamObject = {
                    name: streamName,
                    title: streamName,
                    url: m3uLink,
                    behaviorHints: {
                        notWebReady: false,
                        proxyHeaders: {
                            request: streamHeaders
                        }
                    }
                };

                // Altyazıları ekle (varsa)
                if (subtitles.length > 0) {
                    streamObject.subtitles = subtitles;
                    console.log(`✅ Stream + ${subtitles.length} altyazı döndürülüyor`);
                }

                return {
                    streams: [streamObject]
                };
            }

            console.log('❌ No file found in ContentX source');
            return { streams: [] };
        } catch (error) {
            console.log('❌ ContentX source error:', error.message);
            console.log('   Stack:', error.stack);
            return { streams: [] };
        }
    }

    // Player Source (window.openPlayer için - fallback)
    if (purpose === 'player_source') {
        try {
            console.log(`\n📦 [PLAYER SOURCE] Yanıt işleniyor...`);
            console.log(`   Body length: ${body.length}`);

            let m3uUrl = null;

            // JSON yanıt kontrolü
            try {
                const jsonData = JSON.parse(body);
                console.log(`   ✅ JSON parsed, keys: ${Object.keys(jsonData).join(', ')}`);

                // Farklı JSON yapıları için kontrol
                if (jsonData.playlist && jsonData.playlist[0] && jsonData.playlist[0].sources) {
                    m3uUrl = jsonData.playlist[0].sources[0].file;
                } else if (jsonData.file) {
                    m3uUrl = jsonData.file;
                } else if (jsonData.source) {
                    m3uUrl = jsonData.source;
                } else if (jsonData.url) {
                    m3uUrl = jsonData.url;
                }
            } catch (e) {
                console.log(`   ℹ️ Not JSON, trying regex...`);
            }

            // Regex ile dene
            if (!m3uUrl) {
                const fileMatch = body.match(/file["']?\s*:\s*["']([^"']+)["']/i);
                if (fileMatch) {
                    m3uUrl = fileMatch[1].replace(/\\/g, '');
                }
            }

            if (m3uUrl) {
                console.log(`✅ M3U8 bulundu: ${m3uUrl.substring(0, 80)}...`);

                const streamName = metadata?.streamName || 'Sinefy';
                const streams = [{
                    name: streamName,
                    title: streamName,
                    url: m3uUrl,
                    behaviorHints: {
                        notWebReady: false,
                        proxyHeaders: {
                            request: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': url,
                                'Origin': new URL(url).origin
                            }
                        }
                    }
                }];

                return { streams };
            }

            console.log('❌ No file found in player source');
            return { streams: [] };
        } catch (error) {
            console.log('❌ Player source error:', error.message);
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

