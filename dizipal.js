const cheerio = require('cheerio');

// Manifest tanımı
const manifest = {
    id: 'community.dizipal',
    version: '1.0.0',
    name: 'DiziPal',
    description: 'Türkçe dizi ve film izleme platformu - DiziPal için Stremio eklentisi',
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
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['dizipal']
};

const BASE_URL = 'https://dizipal1210.com';

// Catalog name to ID mapping (Flutter sends catalog names)
const CATALOG_NAME_TO_ID = {
    'Son Bölümler': 'dizipal_latest_episodes',
    'Yeni Diziler': 'dizipal_series',
    'Yeni Filmler': 'dizipal_movies',
    'Netflix Dizileri': 'dizipal_netflix',
    'Exxen Dizileri': 'dizipal_exxen',
    'BluTV Dizileri': 'dizipal_blutv',
    'Disney+ Dizileri': 'dizipal_disney',
    'Amazon Prime Dizileri': 'dizipal_prime',
    'Anime': 'dizipal_anime',
    'Bilimkurgu Dizileri': 'dizipal_scifi_series',
    'Bilimkurgu Filmleri': 'dizipal_scifi_movies',
    'Komedi Dizileri': 'dizipal_comedy_series',
    'Komedi Filmleri': 'dizipal_comedy_movies',
    'Film Ara': 'dizipal_search',
    'Dizi Ara': 'dizipal_search_series'
};

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

// ============ CATALOG HANDLER ============
async function handleCatalog(args, proxyFetch) {
    console.log('\n🎯 [DiziPal Catalog Handler] Starting...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    try {
        let catalogId = args.id;

        // Convert catalog name to ID if needed
        if (CATALOG_NAME_TO_ID[catalogId]) {
            console.log(`🔄 Converting catalog name "${catalogId}" to ID "${CATALOG_NAME_TO_ID[catalogId]}"`);
            catalogId = CATALOG_NAME_TO_ID[catalogId];
        }

        const searchQuery = args.extra?.search;
        console.log(`📊 Catalog ID: ${catalogId}, Search Query: ${searchQuery || 'none'}`);

        // Arama katalogları
        if ((catalogId === 'dizipal_search' || catalogId === 'dizipal_search_series') && searchQuery) {
            console.log(`🔍 DiziPal'da arama yapılıyor: ${searchQuery}`);

            let searchResults;

            try {
                // ProxyFetch ile POST isteği yap
                const response = await proxyFetch({
                    url: `${BASE_URL}/api/search-autocomplete`,
                    method: 'POST',
                    body: `query=${encodeURIComponent(searchQuery)}`,
                    headers: {
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 30000,
                    waitUntil: 'domcontentloaded'
                });

                // JSON parse et
                try {
                    searchResults = JSON.parse(response.body);
                    console.log('✅ DiziPal arama başarılı');
                } catch (parseError) {
                    console.log('❌ Arama sonucu JSON değil, boş döndürülüyor');
                    return { metas: [] };
                }
            } catch (error) {
                console.log(`❌ DiziPal arama başarısız: ${error.message}`);
                return { metas: [] };
            }
            const metas = [];

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

            console.log(`${metas.length} arama sonucu bulundu`);
            return { metas };
        }

        // Normal kataloglar
        const catalogUrls = getCatalogUrls();
        const url = catalogUrls[catalogId];
        if (!url) {
            console.log(`Katalog URL bulunamadı: ${catalogId}`);
            return { metas: [] };
        }

        console.log(`🌐 Fetching URL: ${url}`);

        // ProxyFetch ile sayfa içeriğini al
        const response = await proxyFetch({
            url: url,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                'Referer': BASE_URL
            },
            timeout: 60000,
            waitUntil: 'domcontentloaded'
        });

        const html = response.body;
        console.log(`✅ ProxyFetch başarılı, HTML uzunluğu: ${html.length}`);

        const $ = cheerio.load(html);
        const metas = [];

        console.log(`DEBUG: HTML uzunluğu: ${html.length} ${html.length < 50000 ? '⚠️ ÇOK KÜÇÜK!' : '✅'}`);
        console.log(`DEBUG: Total elements: ${$('*').length}`);
        console.log(`DEBUG: Body text uzunluğu: ${$('body').text().length}`);

        // HTML başlangıcını göster
        const htmlStart = html.substring(0, 500).replace(/\n/g, ' ').replace(/\s+/g, ' ');
        console.log(`DEBUG: HTML başlangıcı: ${htmlStart.substring(0, 200)}...`);

        console.log(`DEBUG: episode-item sayısı: ${$('div.episode-item').length}`);
        console.log(`DEBUG: article.type2 ul li sayısı: ${$('article.type2 ul li').length}`);
        console.log(`DEBUG: li.film sayısı: ${$('li.film').length}`);
        console.log(`DEBUG: ul li sayısı: ${$('ul li').length}`);

        // Cloudflare kontrolü
        if (html.includes('Checking your browser') || html.includes('Just a moment') ||
            html.includes('Verifying you are human')) {
            console.log('⚠️⚠️⚠️ CLOUDFLARE CHALLENGE HALA VAR! ⚠️⚠️⚠️');
            console.log('💡 Site Cloudflare korumalı ve bypass çalışmıyor olabilir.');
        }

        // Title kontrol
        const pageTitle = $('title').text();
        console.log(`DEBUG: Sayfa title: "${pageTitle}"`);

        // Son bölümler için özel parsing
        if (catalogId === 'dizipal_latest_episodes') {
            $('div.episode-item').each((i, elem) => {
                const meta = parseSonBolumler($, elem);
                if (meta) metas.push(meta);
            });
        } else {
            // Normal dizi/film listesi - birden fazla selector dene
            // Önce article.type2 ul li dene
            $('article.type2 ul li').each((i, elem) => {
                const meta = parseDiziler($, elem);
                if (meta) metas.push(meta);
            });

            // Eğer bulunamadıysa alternatif selector'ları dene
            if (metas.length === 0) {
                console.log('DEBUG: article.type2 bulunamadı, alternatifler deneniyor...');

                // li.film dene
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
                console.log('DEBUG: li.film de bulunamadı, tüm ul li deneniyor...');
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

        console.log(`${catalogId} için ${metas.length} içerik bulundu`);
        return { metas };
    } catch (error) {
        console.error('❌ Catalog hatası:', error.message);
        return { metas: [] };
    }
}

// ============ META HANDLER ============
async function handleMeta(args, proxyFetch) {
    try {
        const urlBase64 = args.id.replace('dizipal:', '');
        const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

        console.log(`Meta bilgisi alınıyor: ${url}`);

        const response = await proxyFetch({
            url: url,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL
            },
            timeout: 45000,
            waitUntil: 'domcontentloaded'
        });

        const $ = cheerio.load(response.body);

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
                    id: args.id,
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
                    id: args.id,
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
    } catch (error) {
        console.error('❌ Meta hatası:', error.message);
        return { meta: null };
    }
}

// ============ STREAM HANDLER ============
async function handleStream(args, proxyFetch) {
    try {
        const urlBase64 = args.id.replace('dizipal:', '');
        const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

        console.log(`Stream alınıyor: ${url}`);

        const response = await proxyFetch({
            url: url,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL
            },
            timeout: 45000,
            waitUntil: 'domcontentloaded'
        });

        const pageHtml = response.body;
        const $ = cheerio.load(pageHtml);

        console.log(`📄 Ana sayfa HTML uzunluğu: ${pageHtml.length}`);

        // Önce ana sayfada m3u8 linkini farklı pattern'lerle ara
        let m3uMatch = pageHtml.match(/file:"([^"]+\.m3u8[^"]*)"/);
        if (!m3uMatch) m3uMatch = pageHtml.match(/file:'([^']+\.m3u8[^']*)'/);
        if (!m3uMatch) m3uMatch = pageHtml.match(/"file":"([^"]+\.m3u8[^"]*)"/);
        if (!m3uMatch) m3uMatch = pageHtml.match(/sources:\s*\[\s*\{\s*file:\s*"([^"]+)"/);
        if (!m3uMatch) m3uMatch = pageHtml.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);

        let iframeContent = pageHtml;

        if (m3uMatch) {
            console.log('✅ Ana sayfada m3u8 bulundu!');
        } else {
            console.log('⚠️ Ana sayfada m3u8 bulunamadı, iframe deneniyor...');

            // Script tag'lerini kontrol et
            const scripts = $('script').toArray();
            console.log(`📜 Script tag sayısı: ${scripts.length}`);

            // Script içeriklerinde m3u8 ara
            for (let script of scripts) {
                const scriptContent = $(script).html() || '';
                if (scriptContent.includes('.m3u8') || scriptContent.includes('file:')) {
                    console.log(`🔍 m3u8 içeren script bulundu (${scriptContent.length} karakter)`);

                    // Script içeriğinden örnek göster
                    const scriptSample = scriptContent.substring(0, 1500);
                    console.log(`📜 Script örneği:\n${scriptSample}\n`);

                    // .m3u8 geçen yerleri bul
                    const m3u8Index = scriptContent.indexOf('.m3u8');
                    if (m3u8Index !== -1) {
                        const start = Math.max(0, m3u8Index - 200);
                        const end = Math.min(scriptContent.length, m3u8Index + 200);
                        console.log(`🎯 .m3u8 çevresindeki içerik:\n${scriptContent.substring(start, end)}\n`);
                    }

                    // Bu script'te m3u8 ara - farklı pattern'ler
                    m3uMatch = scriptContent.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/);
                    if (!m3uMatch) m3uMatch = scriptContent.match(/["']([^"']*\.m3u8[^"']*)["']/);
                    if (!m3uMatch) m3uMatch = scriptContent.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
                    if (!m3uMatch) {
                        // Basit substring search - .m3u8'den önce URL başlangıcını bul
                        const m3u8Pos = scriptContent.indexOf('.m3u8');
                        if (m3u8Pos !== -1) {
                            // Geriye doğru http:// veya https:// ara
                            let urlStart = scriptContent.lastIndexOf('http://', m3u8Pos);
                            if (urlStart === -1) urlStart = scriptContent.lastIndexOf('https://', m3u8Pos);

                            if (urlStart !== -1) {
                                // İleriye doğru URL bitişini bul (boşluk, tırnak, vb)
                                let urlEnd = m3u8Pos + 5; // .m3u8 sonrası
                                while (urlEnd < scriptContent.length &&
                                    !/[\s"'<>]/.test(scriptContent[urlEnd])) {
                                    urlEnd++;
                                }

                                const extractedUrl = scriptContent.substring(urlStart, urlEnd);
                                console.log(`🎯 Manuel extraction ile bulundu: ${extractedUrl}`);
                                m3uMatch = [extractedUrl, extractedUrl];
                            }
                        }
                    }

                    if (m3uMatch) {
                        console.log('✅ Script içinde m3u8 bulundu!');
                        iframeContent = scriptContent;
                        break;
                    }
                }
            }
        }

        // Hala bulunamadıysa iframe'e geç
        if (!m3uMatch) {
            // iframe URL'ini bul
            let iframeUrl = $('.series-player-container iframe').attr('src') ||
                $('div#vast_new iframe').attr('src');

            if (!iframeUrl) {
                console.log('❌ iframe bulunamadı ve ana sayfada da m3u8 yok');
                return { streams: [] };
            }

            // iframe URL'ini tam hale getir
            if (iframeUrl.startsWith('//')) {
                iframeUrl = 'https:' + iframeUrl;
            } else if (iframeUrl.startsWith('/')) {
                iframeUrl = BASE_URL + iframeUrl;
            }

            console.log(`🎯 iframe URL: ${iframeUrl}`);

            // iframe içeriğini al
            try {
                const iframeResponse = await proxyFetch({
                    url: iframeUrl,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': url
                    },
                    timeout: 45000,
                    waitUntil: 'domcontentloaded'
                });

                if (iframeResponse && iframeResponse.body) {
                    iframeContent = iframeResponse.body;
                    console.log(`📄 iframe içerik uzunluğu: ${iframeContent.length}`);

                    // iframe içinde m3u8 ara
                    m3uMatch = iframeContent.match(/file:\s*["']([^"']+)["']/);
                    if (!m3uMatch) m3uMatch = iframeContent.match(/["']([^"']*\.m3u8[^"']*)["']/);
                }
            } catch (iframeError) {
                console.log(`❌ iframe yüklenemedi: ${iframeError.message}`);
                // iframe yüklenemezse ana sayfadan devam et
            }
        }

        // M3U8 linkini bul
        if (!m3uMatch) {
            console.log('❌ M3U8 linki hiçbir yerde bulunamadı');

            // Debug için ana sayfadan bir örnek göster
            const sampleHtml = pageHtml.substring(0, 2000);
            console.log(`📋 Ana sayfa örneği:\n${sampleHtml.substring(0, 500)}`);

            return { streams: [] };
        }

        const m3uLink = m3uMatch[1];
        console.log(`✅ M3U8 bulundu: ${m3uLink}`);

        const streams = [];

        // Ana stream
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
        const subtitleMatch = iframeContent.match(/"subtitle":"([^"]+)"/);

        if (subtitleMatch) {
            const subtitleData = subtitleMatch[1];

            if (subtitleData.includes(',')) {
                // Birden fazla altyazı
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
                // Tek altyazı
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

        console.log(`✅ ${streams.length} stream bulundu`);
        return { streams };
    } catch (error) {
        console.error('❌ Stream hatası:', error.message);
        return { streams: [] };
    }
}

// Export functions
module.exports = {
    manifest,
    getManifest: () => manifest,
    handleCatalog,
    handleMeta,
    handleStream
};
