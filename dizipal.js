const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.dizipal',
    version: '2.0.0',
    name: 'DiziPal',
    description: 'Türkçe dizi ve film izleme platformu - DiziPal için Stremio eklentisi (Instruction Mode)',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'series',
            id: 'dizipal_latest_episodes',
            name: 'Son Bölümler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizipal_series',
            name: 'Yeni Diziler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'dizipal_movies',
            name: 'Yeni Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizipal_netflix',
            name: 'Netflix Dizileri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizipal_exxen',
            name: 'Exxen Dizileri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizipal_blutv',
            name: 'BluTV Dizileri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizipal_disney',
            name: 'Disney+ Dizileri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizipal_prime',
            name: 'Amazon Prime Dizileri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizipal_anime',
            name: 'Anime',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizipal_scifi_series',
            name: 'Bilimkurgu Dizileri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'dizipal_scifi_movies',
            name: 'Bilimkurgu Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'dizipal_comedy_series',
            name: 'Komedi Dizileri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'dizipal_comedy_movies',
            name: 'Komedi Filmleri',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'dizipal_search',
            name: 'Film Ara',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'dizipal_search_series',
            name: 'Dizi Ara',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }]
        }
    ],
    idPrefixes: ['dizipal']
};

const BASE_URL = 'https://dizipal1210.com';

// Katalog URL'lerini dinamik olarak al
function getCatalogUrls() {
    return {
        'dizipal_latest_episodes': `${BASE_URL}/diziler/son-bolumler`,
        'dizipal_series': `${BASE_URL}/diziler`,
        'dizipal_movies': `${BASE_URL}/filmler`,
        'dizipal_netflix': `${BASE_URL}/koleksiyon/netflix`,
        'dizipal_exxen': `${BASE_URL}/koleksiyon/exxen`,
        'dizipal_blutv': `${BASE_URL}/koleksiyon/blutv`,
        'dizipal_disney': `${BASE_URL}/koleksiyon/disney`,
        'dizipal_prime': `${BASE_URL}/koleksiyon/amazon-prime`,
        'dizipal_anime': `${BASE_URL}/diziler?kelime=&durum=&tur=26&type=&siralama=`,
        'dizipal_scifi_series': `${BASE_URL}/diziler?kelime=&durum=&tur=5&type=&siralama=`,
        'dizipal_scifi_movies': `${BASE_URL}/tur/bilimkurgu`,
        'dizipal_comedy_series': `${BASE_URL}/diziler?kelime=&durum=&tur=11&type=&siralama=`,
        'dizipal_comedy_movies': `${BASE_URL}/tur/komedi`
    };
}

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [DiziPal Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    // Search catalogs
    if ((catalogId === 'dizipal_search' || catalogId === 'dizipal_search_series') && searchQuery) {
        const requestId = `dizipal-search-${catalogId}-${Date.now()}-${randomId}`;
        return {
            instructions: [{
                requestId,
                purpose: 'catalog-search',
                url: `${BASE_URL}/api/search-autocomplete`,
                method: 'POST',
                headers: {
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: `query=${encodeURIComponent(searchQuery)}`,
                metadata: { catalogId }
            }]
        };
    }

    // Normal catalogs
    const catalogUrls = getCatalogUrls();
    const url = catalogUrls[catalogId];

    if (!url) {
        console.log(`Katalog URL bulunamadı: ${catalogId}`);
        return { instructions: [] };
    }

    const requestId = `dizipal-catalog-${catalogId}-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'catalog',
            url: url,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                'Referer': BASE_URL
            },
            metadata: { catalogId }
        }]
    };
}

async function handleMeta(args) {
    const urlBase64 = args.id.replace('dizipal:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`📺 [DiziPal Meta] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `dizipal-meta-${Date.now()}-${randomId}`;
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
    const urlBase64 = args.id.replace('dizipal:', '');
    const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

    console.log(`🎬 [DiziPal Stream] Generating instructions for: ${url.substring(0, 80)}...`);

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `dizipal-stream-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: 'stream',
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

// Son bölümler parse etme
function parseSonBolumler($, elem) {
    try {
        const name = $(elem).find('div.name').text().trim();
        if (!name) return null;

        const episode = $(elem).find('div.episode').text().trim()
            .replace('. Sezon ', 'x')
            .replace('. Bölüm', '');

        const title = `${name} ${episode}`;
        const href = $(elem).find('a').attr('href');
        if (!href) return null;

        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        const posterUrl = $(elem).find('img').attr('src');

        // URL'den sezon bilgisini kaldır
        const seriesUrl = fullUrl.split('/sezon')[0];

        const id = 'dizipal:' + Buffer.from(seriesUrl).toString('base64').replace(/=/g, '');

        return {
            id: id,
            type: 'series',
            name: title,
            poster: posterUrl || null
        };
    } catch (e) {
        return null;
    }
}

// Normal dizi/film parse etme
function parseDiziler($, elem) {
    try {
        const title = $(elem).find('span.title').text().trim();
        if (!title) return null;

        const href = $(elem).find('a').attr('href');
        if (!href) return null;

        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        const posterUrl = $(elem).find('img').attr('src');

        const id = 'dizipal:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');
        const type = fullUrl.includes('/dizi/') ? 'series' : 'movie';

        return {
            id: id,
            type: type,
            name: title,
            poster: posterUrl || null
        };
    } catch (e) {
        return null;
    }
}

async function processFetchResult(fetchResult) {
    const { purpose, body, url, metadata } = fetchResult;

    console.log(`\n⚙️ [DiziPal Process] Purpose: ${purpose}`);
    console.log(`   URL: ${url?.substring(0, 80)}...`);

    if (purpose === 'catalog-search') {
        // Search results are JSON
        try {
            const searchResults = JSON.parse(body);
            const metas = [];
            const catalogId = metadata?.catalogId;

            for (const key in searchResults) {
                const item = searchResults[key];
                if (item && item.title && item.url) {
                    const fullUrl = `${BASE_URL}${item.url}`;
                    const type = item.type === 'series' ? 'series' : 'movie';

                    // Katalog tipine göre filtrele
                    if (catalogId === 'dizipal_search' && type !== 'movie') continue;
                    if (catalogId === 'dizipal_search_series' && type !== 'series') continue;

                    const id = 'dizipal:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                    metas.push({
                        id: id,
                        type: type,
                        name: item.title,
                        poster: item.poster || null
                    });
                }
            }

            console.log(`✅ Found ${metas.length} search results`);
            return { metas };
        } catch (error) {
            console.log('❌ Search parsing error:', error.message);
            return { metas: [] };
        }
    }

    if (purpose === 'catalog') {
        const $ = cheerio.load(body);
        const metas = [];
        const catalogId = metadata?.catalogId;

        // Son bölümler için özel parsing
        if (catalogId === 'dizipal_latest_episodes') {
            $('div.episode-item').each((i, elem) => {
                const meta = parseSonBolumler($, elem);
                if (meta) metas.push(meta);
            });
        } else {
            // Normal dizi/film listesi - birden fazla selector dene
            $('article.type2 ul li').each((i, elem) => {
                const meta = parseDiziler($, elem);
                if (meta) metas.push(meta);
            });

            // Eğer bulunamadıysa alternatif selector'ları dene
            if (metas.length === 0) {
                $('li.film').each((i, elem) => {
                    const title = $(elem).find('span.film-title, span.title, .title').text().trim();
                    const href = $(elem).find('a').attr('href');
                    const posterUrl = $(elem).find('img').attr('src') || $(elem).find('img').attr('data-src');

                    if (title && href) {
                        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                        const id = 'dizipal:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');
                        const type = fullUrl.includes('/dizi/') ? 'series' : 'movie';

                        metas.push({
                            id: id,
                            type: type,
                            name: title,
                            poster: posterUrl || null
                        });
                    }
                });
            }

            // Hala bulunamadıysa tüm li'leri dene
            if (metas.length === 0) {
                $('ul li').each((i, elem) => {
                    const title = $(elem).find('span.title, .title, span').first().text().trim();
                    const href = $(elem).find('a').attr('href');
                    const posterUrl = $(elem).find('img').attr('src') || $(elem).find('img').attr('data-src');

                    if (title && href && href.includes('/dizi/')) {
                        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                        const id = 'dizipal:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                        metas.push({
                            id: id,
                            type: 'series',
                            name: title,
                            poster: posterUrl || null
                        });
                    }
                });
            }
        }

        console.log(`✅ Found ${metas.length} items in catalog`);
        return { metas };
    }

    if (purpose === 'meta') {
        const $ = cheerio.load(body);

        const poster = $('[property="og:image"]').attr('content');
        const description = $('div.summary p').text().trim();

        // Yapım yılı
        let year = null;
        $('div.col-md-6').each((i, elem) => {
            const label = $(elem).find('div').first().text().trim();
            if (label === 'Yapım Yılı') {
                year = $(elem).find('div').last().text().trim();
            }
        });

        // Türler
        const tags = [];
        $('div.col-md-6').each((i, elem) => {
            const label = $(elem).find('div').first().text().trim();
            if (label === 'Türler') {
                const genresText = $(elem).find('div').last().text().trim();
                tags.push(...genresText.split(' ').map(t => t.trim()).filter(t => t));
            }
        });

        // IMDB Puanı
        let imdbRating = null;
        $('div.col-md-6').each((i, elem) => {
            const label = $(elem).find('div').first().text().trim();
            if (label === 'IMDB Puanı') {
                imdbRating = $(elem).find('div').last().text().trim();
            }
        });

        // Ortalama Süre
        let runtime = null;
        $('div.col-md-6').each((i, elem) => {
            const label = $(elem).find('div').first().text().trim();
            if (label === 'Ortalama Süre') {
                const durationText = $(elem).find('div').last().text().trim();
                const match = durationText.match(/(\d+)/);
                if (match) runtime = `${match[1]} dk`;
            }
        });

        // Dizi mi film mi kontrol et
        if (url.includes('/dizi/')) {
            const title = $('div.cover h5').text().trim();

            // Bölümleri topla
            const videos = [];
            $('div.episode-item').each((i, elem) => {
                const epName = $(elem).find('div.name').text().trim();
                const epHref = $(elem).find('a').attr('href');
                const epText = $(elem).find('div.episode').text().trim();

                if (epHref && epText) {
                    const parts = epText.split(' ');
                    const season = parts[0] ? parseInt(parts[0].replace('.', '')) : null;
                    const episode = parts[2] ? parseInt(parts[2].replace('.', '')) : null;

                    const fullUrl = epHref.startsWith('http') ? epHref : `${BASE_URL}${epHref}`;
                    const videoId = 'dizipal:' + Buffer.from(fullUrl).toString('base64').replace(/=/g, '');

                    videos.push({
                        id: videoId,
                        title: epName || `${season}. Sezon ${episode}. Bölüm`,
                        season: season,
                        episode: episode
                    });
                }
            });

            return {
                meta: {
                    id: 'dizipal:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                    type: 'series',
                    name: title,
                    poster: poster || null,
                    background: poster || null,
                    description: description || 'Açıklama mevcut değil',
                    releaseInfo: year || null,
                    imdbRating: imdbRating || null,
                    genres: tags.length > 0 ? tags : undefined,
                    runtime: runtime || null,
                    videos: videos
                }
            };
        } else {
            // Film
            const title = $('div.g-title').eq(1).find('div').text().trim() ||
                $('[property="og:title"]').attr('content') ||
                'Film';

            return {
                meta: {
                    id: 'dizipal:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
                    type: 'movie',
                    name: title,
                    poster: poster || null,
                    background: poster || null,
                    description: description || 'Açıklama mevcut değil',
                    releaseInfo: year || null,
                    imdbRating: imdbRating || null,
                    genres: tags.length > 0 ? tags : undefined,
                    runtime: runtime || null
                }
            };
        }
    }

    if (purpose === 'stream') {
        const $ = cheerio.load(body);
        const streams = [];

        // M3U8 linkini farklı pattern'lerle ara
        let m3uMatch = body.match(/file:"([^"]+\.m3u8[^"]*)"/);
        if (!m3uMatch) m3uMatch = body.match(/file:'([^']+\.m3u8[^']*)'/);
        if (!m3uMatch) m3uMatch = body.match(/"file":"([^"]+\.m3u8[^"]*)"/);
        if (!m3uMatch) m3uMatch = body.match(/sources:\s*\[\s*\{\s*file:\s*"([^"]+)"/);
        if (!m3uMatch) m3uMatch = body.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);

        // Script tag'lerini kontrol et
        if (!m3uMatch) {
            const scripts = $('script').toArray();
            for (let script of scripts) {
                const scriptContent = $(script).html() || '';
                if (scriptContent.includes('.m3u8') || scriptContent.includes('file:')) {
                    // Script içinde m3u8 ara
                    m3uMatch = scriptContent.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/);
                    if (!m3uMatch) m3uMatch = scriptContent.match(/["']([^"']*\.m3u8[^"']*)["']/);
                    if (!m3uMatch) m3uMatch = scriptContent.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
                    if (!m3uMatch) {
                        // Manuel extraction
                        const m3u8Pos = scriptContent.indexOf('.m3u8');
                        if (m3u8Pos !== -1) {
                            let urlStart = scriptContent.lastIndexOf('http://', m3u8Pos);
                            if (urlStart === -1) urlStart = scriptContent.lastIndexOf('https://', m3u8Pos);

                            if (urlStart !== -1) {
                                let urlEnd = m3u8Pos + 5;
                                while (urlEnd < scriptContent.length &&
                                    !/[\s"'<>]/.test(scriptContent[urlEnd])) {
                                    urlEnd++;
                                }

                                const extractedUrl = scriptContent.substring(urlStart, urlEnd);
                                m3uMatch = [extractedUrl, extractedUrl];
                            }
                        }
                    }

                    if (m3uMatch) break;
                }
            }
        }

        if (m3uMatch) {
            const m3uLink = m3uMatch[1] || m3uMatch[0];
            console.log(`✅ M3U8 bulundu: ${m3uLink.substring(0, 80)}...`);

            streams.push({
                name: 'DiziPal',
                title: 'DiziPal Server',
                url: m3uLink,
                behaviorHints: {
                    notWebReady: true,
                    bingeGroup: 'dizipal-stream'
                }
            });

            // Altyazıları bul
            const subtitles = [];
            const subtitleMatch = body.match(/"subtitle":"([^"]+)"/);

            if (subtitleMatch) {
                const subtitleData = subtitleMatch[1];

                if (subtitleData.includes(',')) {
                    const subtitleParts = subtitleData.split(',');
                    for (const part of subtitleParts) {
                        const langMatch = part.match(/\[([^\]]+)\]/);
                        if (langMatch) {
                            const lang = langMatch[1];
                            const subUrl = part.replace(`[${lang}]`, '');
                            subtitles.push({
                                id: lang.toLowerCase(),
                                url: subUrl.startsWith('http') ? subUrl : `${BASE_URL}${subUrl}`,
                                lang: lang
                            });
                        }
                    }
                } else {
                    const langMatch = subtitleData.match(/\[([^\]]+)\]/);
                    if (langMatch) {
                        const lang = langMatch[1];
                        const subUrl = subtitleData.replace(`[${lang}]`, '');
                        subtitles.push({
                            id: lang.toLowerCase(),
                            url: subUrl.startsWith('http') ? subUrl : `${BASE_URL}${subUrl}`,
                            lang: lang
                        });
                    }
                }
            }

            if (subtitles.length > 0) {
                streams[0].subtitles = subtitles;
            }
        } else {
            console.log('⚠️ M3U8 bulunamadı');
        }

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
