const cheerio = require('cheerio');

// ============ CONFIG ============
const CONFIG = {
    baseUrl: 'https://turkcealtyazi.org',
    searchUrl: 'https://turkcealtyazi.org/ara',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    timeout: 15000 // 15 saniye timeout
};

// ============ MANIFEST ============
const manifest = {
    id: 'community.turkcealtyazi',
    version: '1.0.0',
    name: 'Türkçe Altyazı',
    description: 'Türkçe film ve dizi altyazıları - TurkceAltyazi.org üzerinden ücretsiz altyazı bulur ve indirme linki sunar',
    logo: 'https://turkcealtyazi.org/img/logo.png',
    resources: ['subtitles'],
    types: ['movie', 'series'],
    catalogs: [],
    idPrefixes: ['tt'], // IMDB ID format
    behaviorHints: {
        adult: false,
        configurable: false,
        configurationRequired: false
    }
};

// ============ HELPERS ============
function safeLog(...args) {
    try {
        console.log('[TurkceAltyazi]', ...args);
    } catch (e) { }
}

/**
 * IMDB ID'den sadece sayısal kısmı al
 */
function cleanImdbId(imdbId) {
    if (!imdbId) return null;
    return imdbId.replace(/^tt/i, '');
}

/**
 * Türkçe karakterleri temizle (URL için)
 */
function turkishToEnglish(text) {
    const chars = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ı': 'i', 'İ': 'I',
        'ö': 'o', 'Ö': 'O',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U'
    };
    return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, char => chars[char] || char);
}

/**
 * Film/dizi adını normalize et
 */
function normalizeTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Sezon/bölüm formatını parse et
 */
function parseSeasonEpisode(text) {
    // S01E01, 1x01, Season 1 Episode 1 formatları
    let match = text.match(/S(\d+)E(\d+)/i);
    if (match) return { season: parseInt(match[1]), episode: parseInt(match[2]) };

    match = text.match(/(\d+)x(\d+)/i);
    if (match) return { season: parseInt(match[1]), episode: parseInt(match[2]) };

    match = text.match(/Season\s*(\d+).*Episode\s*(\d+)/i);
    if (match) return { season: parseInt(match[1]), episode: parseInt(match[2]) };

    match = text.match(/Sezon\s*(\d+).*Bölüm\s*(\d+)/i);
    if (match) return { season: parseInt(match[1]), episode: parseInt(match[2]) };

    return null;
}

/**
 * Kalite bilgisini parse et
 */
function parseQuality(text) {
    const qualities = ['4K', '2160p', '1080p', '720p', '480p', '360p', 'BluRay', 'WEB-DL', 'WEBRip', 'HDRip', 'DVDRip'];
    const found = qualities.filter(q => text.toUpperCase().includes(q.toUpperCase()));
    return found.length > 0 ? found.join(' ') : 'Unknown';
}

/**
 * Enhanced browser-like headers
 */
function getBrowserHeaders(referer = CONFIG.baseUrl) {
    return {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': CONFIG.userAgent,
        'Referer': referer,
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    };
}

// ============ HANDLERS ============

async function handleSubtitles(args) {
    safeLog('\n🎬 Subtitle request:', JSON.stringify(args, null, 2));

    const { type, id } = args;

    // IMDB ID kontrolü
    if (!id || !id.match(/^tt\d+/i)) {
        safeLog('❌ Invalid IMDB ID:', id);
        return { subtitles: [] };
    }

    const imdbId = cleanImdbId(id);

    // Video ID parse et
    const videoId = args.videoId || {};
    const season = videoId.season || null;
    const episode = videoId.episode || null;

    safeLog(`📺 Searching subtitles for: ${type} | IMDB: tt${imdbId}${season ? ` S${season}E${episode}` : ''}`);

    // Meta bilgilerini al (varsa)
    const name = args.name || '';

    // Arama instruction'ı oluştur
    return await createSearchInstruction(imdbId, type, season, episode, name);
}

async function createSearchInstruction(imdbId, type, season, episode, name) {
    const requestId = `turkcealtyazi-search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Arama URL'i oluştur
    // TurkceAltyazi.org arama formatı: /ara?q=QUERY
    const searchQuery = `tt${imdbId}`;
    const searchUrl = `${CONFIG.searchUrl}?q=${encodeURIComponent(searchQuery)}`;

    safeLog(`🔍 Search URL: ${searchUrl}`);

    return {
        instructions: [{
            requestId,
            purpose: 'subtitle-search',
            url: searchUrl,
            method: 'GET',
            headers: getBrowserHeaders(CONFIG.baseUrl),
            metadata: {
                imdbId: `tt${imdbId}`,
                type,
                season,
                episode,
                name,
                searchQuery
            }
        }]
    };
}

// ============ PROCESS FETCH RESULT ============

async function processFetchResult(fetchResult) {
    const { purpose, body, metadata, url } = fetchResult;

    safeLog(`\n⚙️ Processing: ${purpose}`);

    if (purpose === 'subtitle-search') {
        return await processSearchResults(body, metadata);
    }

    if (purpose === 'subtitle-detail') {
        return await processDetailPage(body, metadata);
    }

    return { subtitles: [] };
}

/**
 * Arama sonuçlarını parse et
 */
async function processSearchResults(html, metadata) {
    if (!html || typeof html !== 'string') {
        safeLog('❌ Invalid HTML response');
        return { subtitles: [] };
    }

    // CloudFlare veya bot detection kontrolü
    if (html.includes('Just a moment') ||
        html.includes('cf-browser-verification') ||
        html.includes('DDoS protection') ||
        html.length < 500) {
        safeLog('⚠️ Bot detection or CloudFlare challenge detected!');
        safeLog('   Site tarafından engellenmiş olabilir.');
        return { subtitles: [] };
    }

    const $ = cheerio.load(html);
    const { imdbId, type, season, episode, name } = metadata;

    safeLog(`📄 Parsing search results for: ${imdbId}`);

    // Arama sonuçlarını bul
    // TurkceAltyazi.org yapısı: .movie-list veya .subtitle-list
    const results = [];

    // Method 1: Film/dizi listesi
    $('div.movie, div.subtitle-item, article.subtitle, div.result-item').each((i, elem) => {
        try {
            const $elem = $(elem);

            // Başlık
            const title = $elem.find('h2, h3, .title, .subtitle-title, a.subtitle-link').first().text().trim();
            if (!title) return;

            // Link
            let link = $elem.find('a').first().attr('href');
            if (!link) return;

            // Tam URL'e çevir
            if (!link.startsWith('http')) {
                link = `${CONFIG.baseUrl}${link}`;
            }

            // Açıklama/detay
            const description = $elem.find('.description, .subtitle-info, p').first().text().trim();

            // Release info
            const release = $elem.find('.release, .subtitle-release, .version').text().trim();

            // İndirme sayısı
            const downloads = $elem.find('.download-count, .downloads, .stats').text().trim();

            results.push({
                title,
                link,
                description,
                release,
                downloads
            });

        } catch (e) {
            safeLog('⚠️ Error parsing result item:', e.message);
        }
    });

    // Method 2: Tablo formatı
    if (results.length === 0) {
        $('table tr, tbody tr').each((i, row) => {
            if (i === 0) return; // Header row skip

            try {
                const $row = $(row);
                const title = $row.find('td').eq(0).text().trim();
                let link = $row.find('a').first().attr('href');

                if (!title || !link) return;

                if (!link.startsWith('http')) {
                    link = `${CONFIG.baseUrl}${link}`;
                }

                const description = $row.find('td').eq(1).text().trim();
                const downloads = $row.find('td').eq(2).text().trim();

                results.push({
                    title,
                    link,
                    description,
                    release: '',
                    downloads
                });

            } catch (e) {
                safeLog('⚠️ Error parsing table row:', e.message);
            }
        });
    }

    // Method 3: Liste formatı (ul li)
    if (results.length === 0) {
        $('ul.subtitle-list li, ul.results li, div.list-group a').each((i, elem) => {
            try {
                const $elem = $(elem);
                const title = $elem.text().trim();
                let link = $elem.attr('href') || $elem.find('a').first().attr('href');

                if (!title || !link) return;

                if (!link.startsWith('http')) {
                    link = `${CONFIG.baseUrl}${link}`;
                }

                results.push({
                    title,
                    link,
                    description: '',
                    release: '',
                    downloads: ''
                });

            } catch (e) {
                safeLog('⚠️ Error parsing list item:', e.message);
            }
        });
    }

    safeLog(`✅ Found ${results.length} search results`);

    if (results.length === 0) {
        safeLog('⚠️ No results found. HTML preview:');
        safeLog(html.substring(0, 500));
        return { subtitles: [] };
    }

    // Sonuçları filtrele (season/episode match için)
    let filteredResults = results;

    if (type === 'series' && season && episode) {
        filteredResults = results.filter(r => {
            const parsed = parseSeasonEpisode(r.title + ' ' + r.description + ' ' + r.release);
            return parsed && parsed.season === season && parsed.episode === episode;
        });

        safeLog(`📺 Filtered to ${filteredResults.length} results matching S${season}E${episode}`);

        // Eğer tam eşleşme yoksa tüm sonuçları kullan
        if (filteredResults.length === 0) {
            filteredResults = results;
        }
    }

    // Her sonuç için detay sayfası instruction'ı oluştur
    const instructions = [];

    for (let i = 0; i < Math.min(filteredResults.length, 10); i++) { // Max 10 sonuç
        const result = filteredResults[i];
        const randomId = Math.random().toString(36).slice(2, 8);
        const requestId = `turkcealtyazi-detail-${Date.now()}-${randomId}`;

        instructions.push({
            requestId,
            purpose: 'subtitle-detail',
            url: result.link,
            method: 'GET',
            headers: getBrowserHeaders(url),
            metadata: {
                ...metadata,
                resultTitle: result.title,
                resultRelease: result.release,
                resultDownloads: result.downloads
            }
        });
    }

    safeLog(`📋 Created ${instructions.length} detail page instructions`);

    return { instructions };
}

/**
 * Detay sayfasından indirme linkini parse et
 */
async function processDetailPage(html, metadata) {
    if (!html || typeof html !== 'string') {
        safeLog('❌ Invalid HTML response');
        return { subtitles: [] };
    }

    const $ = cheerio.load(html);
    const { resultTitle, resultRelease, resultDownloads, season, episode } = metadata;

    safeLog(`📄 Parsing detail page for: ${resultTitle}`);

    // İndirme linkini bul
    // Olası selectors:
    // - .download-button, .btn-download, a[href*="indir"]
    // - button içeren download text

    let downloadLink = null;

    // Method 1: Download button/link
    const downloadSelectors = [
        'a.download-button',
        'a.btn-download',
        'a[href*="/indir"]',
        'a[href*="/download"]',
        'button[onclick*="download"]',
        '.download a',
        '#download-link'
    ];

    for (const selector of downloadSelectors) {
        const link = $(selector).attr('href') || $(selector).attr('onclick');
        if (link) {
            if (link.includes('http')) {
                downloadLink = link.match(/https?:\/\/[^\s"']+/)?.[0];
            } else {
                downloadLink = `${CONFIG.baseUrl}${link}`;
            }
            if (downloadLink) break;
        }
    }

    // Method 2: JavaScript içinden link çıkar
    if (!downloadLink) {
        $('script').each((i, script) => {
            const scriptContent = $(script).html() || '';
            const match = scriptContent.match(/downloadUrl\s*=\s*["']([^"']+)["']/);
            if (match) {
                downloadLink = match[1];
                if (!downloadLink.startsWith('http')) {
                    downloadLink = `${CONFIG.baseUrl}${downloadLink}`;
                }
                return false; // break
            }
        });
    }

    if (!downloadLink) {
        safeLog('⚠️ Download link not found on detail page');
        return { subtitles: [] };
    }

    safeLog(`✅ Found download link: ${downloadLink.substring(0, 80)}...`);

    // Kalite bilgisini parse et
    const quality = parseQuality(resultTitle + ' ' + resultRelease);

    // Altyazı adını oluştur
    let name = '🇹🇷 Türkçe';
    if (quality !== 'Unknown') {
        name += ` [${quality}]`;
    }
    if (resultRelease) {
        name += ` - ${resultRelease}`;
    }

    // Açıklama
    let description = '📥 TurkceAltyazi.org';
    if (resultDownloads) {
        description += ` | ⬇️ ${resultDownloads}`;
    }

    const subtitle = {
        id: `turkcealtyazi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: downloadLink,
        lang: 'Türkçe',
        name: name,
        description: description
    };

    return {
        subtitles: [subtitle]
    };
}

// ============ EXPORT ============
module.exports = {
    manifest,
    getManifest: () => manifest,
    handleSubtitles,
    processFetchResult
};