const crypto = require('crypto');

// Configuration
const CONFIG = {
    contentUrl: 'https://dizibox.cfd',
    aesKey: 'ywevqtjrurkwtqgz',
    userAgent: 'speedrestapi'
};

// Manifest
const manifest = {
    id: 'com.keyiflerolsun.inatbox',
    version: '2.0.0',
    name: 'InatBox',
    description: 'Turkish TV channels, movies and series streaming (Proxy Mode)',
    logo: 'https://via.placeholder.com/150',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series', 'tv'],
    catalogs: [
        { type: 'tv', id: 'spor', name: 'Spor Kanalları' },
        { type: 'tv', id: 'cable', name: 'Kanallar Liste 1' },
        { type: 'tv', id: 'list2', name: 'Kanallar Liste 2' },
        { type: 'tv', id: 'sinema', name: 'Sinema Kanalları' },
        { type: 'tv', id: 'belgesel', name: 'Belgesel Kanalları' },
        { type: 'tv', id: 'ulusal', name: 'Ulusal Kanallar' },
        { type: 'tv', id: 'haber', name: 'Haber Kanalları' },
        { type: 'tv', id: 'cocuk', name: 'Çocuk Kanalları' },
        { type: 'tv', id: 'dini', name: 'Dini Kanallar' },
        { type: 'movie', id: 'exxen', name: 'EXXEN' },
        { type: 'movie', id: 'gain', name: 'Gain' },
        { type: 'movie', id: 'max', name: 'Max-BluTV' },
        { type: 'movie', id: 'netflix', name: 'Netflix' },
        { type: 'movie', id: 'disney', name: 'Disney+' },
        { type: 'movie', id: 'amazon', name: 'Amazon Prime' },
        { type: 'movie', id: 'hbo', name: 'HBO Max' },
        { type: 'movie', id: 'tabii', name: 'Tabii' },
        { type: 'movie', id: 'mubi', name: 'Mubi' },
        { type: 'movie', id: 'tod', name: 'TOD' },
        { type: 'series', id: 'yabanci-dizi', name: 'Yabancı Diziler' },
        { type: 'series', id: 'yerli-dizi', name: 'Yerli Diziler' },
        { type: 'movie', id: 'yerli-film', name: 'Yerli Filmler' },
        { type: 'movie', id: '4k-film', name: '4K Film İzle' }
    ],
    idPrefixes: ['inatbox']
};

// Catalog URL mapping
const catalogUrls = {
    spor: 'https://boxyz.cfd/CDN/001_STR/boxyz.cfd/spor_v2.php',
    cable: `${CONFIG.contentUrl}/tv/cable.php`,
    list2: `${CONFIG.contentUrl}/tv/list2.php`,
    sinema: `${CONFIG.contentUrl}/tv/sinema.php`,
    belgesel: `${CONFIG.contentUrl}/tv/belgesel.php`,
    ulusal: `${CONFIG.contentUrl}/tv/ulusal.php`,
    haber: `${CONFIG.contentUrl}/tv/haber.php`,
    cocuk: `${CONFIG.contentUrl}/tv/cocuk.php`,
    dini: `${CONFIG.contentUrl}/tv/dini.php`,
    exxen: `${CONFIG.contentUrl}/ex/index.php`,
    gain: `${CONFIG.contentUrl}/ga/index.php`,
    max: `${CONFIG.contentUrl}/max/index.php`,
    netflix: `${CONFIG.contentUrl}/nf/index.php`,
    disney: `${CONFIG.contentUrl}/dsny/index.php`,
    amazon: `${CONFIG.contentUrl}/amz/index.php`,
    hbo: `${CONFIG.contentUrl}/hb/index.php`,
    tabii: `${CONFIG.contentUrl}/tbi/index.php`,
    mubi: `${CONFIG.contentUrl}/film/mubi.php`,
    tod: `${CONFIG.contentUrl}/ccc/index.php`,
    'yabanci-dizi': `${CONFIG.contentUrl}/yabanci-dizi/index.php`,
    'yerli-dizi': `${CONFIG.contentUrl}/yerli-dizi/index.php`,
    'yerli-film': `${CONFIG.contentUrl}/film/yerli-filmler.php`,
    '4k-film': `${CONFIG.contentUrl}/film/4k-film-exo.php`
};

// AES Decryption
function decryptAES(encryptedData, key) {
    try {
        const algorithm = 'aes-128-cbc';
        const keyBuffer = Buffer.from(key, 'utf8');
        const ivBuffer = Buffer.from(key, 'utf8');

        // First decryption
        const decipher1 = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
        let decrypted1 = decipher1.update(encryptedData.split(':')[0], 'base64', 'utf8');
        decrypted1 += decipher1.final('utf8');

        // Second decryption
        const decipher2 = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
        let decrypted2 = decipher2.update(decrypted1.split(':')[0], 'base64', 'utf8');
        decrypted2 += decipher2.final('utf8');

        return decrypted2;
    } catch (error) {
        console.error('❌ Decryption error:', error.message);
        return null;
    }
}

// Make InatBox API request via proxy
async function makeInatRequest(url, proxyFetch) {
    try {
        console.log('\n🌐 ======================================');
        console.log('🌐 Making InatBox API Request');
        console.log('🌐 URL:', url);
        console.log('🌐 ======================================');

        const urlObj = new URL(url);
        const hostName = urlObj.host;

        const headers = {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Host': hostName,
            'Referer': 'https://speedrestapi.com/',
            'X-Requested-With': 'com.bp.box',
            'User-Agent': CONFIG.userAgent
        };

        const requestBody = `1=${CONFIG.aesKey}&0=${CONFIG.aesKey}`;

        console.log('📤 Sending POST request...');
        const response = await proxyFetch({
            url: url,
            method: 'POST',
            headers: headers,
            body: requestBody,
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
            timeout: 30000
        });

        console.log('📥 Response received');
        console.log('📊 Status:', response.statusCode || 'unknown');
        console.log('📊 Body length:', response.body ? response.body.length : 0);
        console.log('📊 Body preview:', response.body ? response.body.substring(0, 100) : 'empty');

        const responseData = response.body;

        // Check if response is HTML error page
        if (responseData.trim().startsWith('<!DOCTYPE') || responseData.trim().startsWith('<html')) {
            console.error('❌ Server returned HTML page (likely 404 or error)');
            console.error('❌ Response preview:', responseData.substring(0, 200));
            return null;
        }

        // Try parsing as plain JSON first
        try {
            const parsed = JSON.parse(responseData);
            console.log('✅ Response is plain JSON');
            console.log('✅ Type:', Array.isArray(parsed) ? `Array (${parsed.length} items)` : typeof parsed);
            return parsed;
        } catch (jsonError) {
            // Not plain JSON, try to decrypt
            console.log('🔐 Response is encrypted, attempting decrypt...');
            try {
                const decrypted = decryptAES(responseData, CONFIG.aesKey);
                if (decrypted) {
                    const parsed = JSON.parse(decrypted);
                    console.log('✅ Decryption successful');
                    console.log('✅ Type:', Array.isArray(parsed) ? `Array (${parsed.length} items)` : typeof parsed);
                    return parsed;
                } else {
                    console.error('❌ Decryption returned null');
                    return null;
                }
            } catch (decryptError) {
                console.error('❌ Decryption failed:', decryptError.message);
                console.error('❌ Encrypted data preview:', responseData.substring(0, 100));
                return null;
            }
        }
    } catch (error) {
        console.error('❌ Request error:', error.message);
        console.error('❌ Stack:', error.stack);
        return null;
    }
}

// Content validation
function isContentAllowed(item) {
    const type = item.diziType || item.chType;
    return type !== 'link' && type !== 'web';
}

// VK URL fix
function vkSourceFix(url) {
    if (url && url.startsWith('act')) {
        return `https://vk.com/al_video.php?${url}`;
    }
    return url;
}

// Map quality from Dzen stream type
function mapDzenQuality(type) {
    if (!type) return 'Unknown';
    const typeLower = type.toLowerCase();
    if (typeLower.includes('fullhd')) return '1080p';
    if (typeLower.includes('high')) return '720p';
    if (typeLower.includes('medium')) return '480p';
    if (typeLower.includes('low')) return '360p';
    if (typeLower.includes('lowest')) return '240p';
    if (typeLower.includes('tiny')) return '144p';
    return 'Unknown';
}

// ============ CATALOG HANDLER ============
async function handleCatalog(args, proxyFetch) {
    try {
        const catalogId = args.id;
        const url = catalogUrls[catalogId];

        console.log(`\n📋 ======================================`);
        console.log(`📋 Catalog Request: ${catalogId}`);
        console.log(`📋 URL: ${url || 'NOT FOUND'}`);
        console.log(`📋 ======================================`);

        if (!url) {
            console.warn('⚠️ No URL found for catalog:', catalogId);
            return { metas: [] };
        }

        const data = await makeInatRequest(url, proxyFetch);

        if (!data) {
            console.warn('⚠️ No data received from API');
            return { metas: [] };
        }

        if (!Array.isArray(data)) {
            console.warn('⚠️ Data is not an array:', typeof data);
            return { metas: [] };
        }

        console.log(`📊 Received ${data.length} items from API`);

        const metas = data
            .filter(item => {
                const allowed = isContentAllowed(item);
                if (!allowed) {
                    console.log(`⚠️ Filtered out: ${item.chName || item.diziName} (type: ${item.chType || item.diziType})`);
                }
                return allowed;
            })
            .map(item => {
                if (item.diziType) {
                    console.log(`📺 Adding content: ${item.diziName} (type: ${item.diziType})`);
                    return {
                        id: `inatbox:${Buffer.from(JSON.stringify(item)).toString('base64')}`,
                        type: item.diziType === 'dizi' ? 'series' : 'movie',
                        name: item.diziName,
                        poster: item.diziImg,
                        description: item.diziDetay,
                        releaseInfo: item.diziYear || ''
                    };
                } else if (item.chName) {
                    const isLive = item.chType === 'live_url' || item.chType === 'cable_sh' || item.chType === 'tekli_regex_lb_sh_3';
                    console.log(`📺 Adding channel: ${item.chName} (type: ${item.chType}, isLive: ${isLive})`);
                    return {
                        id: `inatbox:${Buffer.from(JSON.stringify(item)).toString('base64')}`,
                        type: isLive ? 'tv' : 'movie',
                        name: item.chName,
                        poster: item.chImg,
                        posterShape: isLive ? 'square' : 'poster'
                    };
                }
                console.warn(`⚠️ Unknown item format:`, item);
                return null;
            })
            .filter(Boolean);

        console.log(`\n✅ ======================================`);
        console.log(`✅ Catalog ${catalogId}: ${metas.length} items processed`);
        console.log(`✅ ======================================\n`);
        return { metas };
    } catch (error) {
        console.error('❌ Catalog error:', error.message);
        console.error('❌ Stack:', error.stack);
        return { metas: [] };
    }
}

// ============ META HANDLER ============
async function handleMeta(args, proxyFetch) {
    try {
        const itemData = Buffer.from(args.id.replace('inatbox:', ''), 'base64').toString('utf8');
        const item = JSON.parse(itemData);

        console.log('📺 Meta request for:', item.diziName || item.chName);

        if (item.diziType) {
            const data = await makeInatRequest(item.diziUrl, proxyFetch);

            if (item.diziType === 'dizi' && Array.isArray(data)) {
                // Series with seasons
                const videos = [];

                for (let i = 0; i < data.length; i++) {
                    const season = data[i];
                    const episodeData = await makeInatRequest(season.diziUrl, proxyFetch);

                    if (Array.isArray(episodeData)) {
                        episodeData.forEach((ep, j) => {
                            videos.push({
                                id: `inatbox:${Buffer.from(JSON.stringify(ep)).toString('base64')}`,
                                title: ep.chName,
                                season: i + 1,
                                episode: j + 1,
                                thumbnail: ep.chImg,
                                released: new Date().toISOString()
                            });
                        });
                    }
                }

                console.log(`✅ Returning series meta with ${videos.length} episodes`);
                return {
                    meta: {
                        id: args.id,
                        type: 'series',
                        name: item.diziName,
                        poster: data[0]?.diziImg || item.diziImg,
                        description: item.diziDetay,
                        videos: videos
                    }
                };
            } else {
                // Movie
                console.log('✅ Returning movie meta');
                return {
                    meta: {
                        id: args.id,
                        type: 'movie',
                        name: item.diziName,
                        poster: item.diziImg,
                        description: item.diziDetay
                    }
                };
            }
        } else {
            // Live TV or single content
            console.log('✅ Returning TV/channel meta:', item.chName);
            return {
                meta: {
                    id: args.id,
                    type: args.type,
                    name: item.chName,
                    poster: item.chImg,
                    posterShape: args.type === 'tv' ? 'square' : 'poster'
                }
            };
        }
    } catch (error) {
        console.error('❌ Meta error:', error.message);
        return { meta: null };
    }
}

// ============ STREAM HANDLER ============
async function handleStream(args, proxyFetch) {
    try {
        const itemData = Buffer.from(args.id.replace('inatbox:', ''), 'base64').toString('utf8');
        const item = JSON.parse(itemData);

        console.log('🎬 Stream request for:', item.chName || item.diziName);
        console.log('🎬 Item type:', item.chType || item.diziType);

        let chContent;

        if (item.diziType === 'film') {
            console.log('🎬 Processing film type');
            const data = await makeInatRequest(item.diziUrl, proxyFetch);
            if (Array.isArray(data) && data.length > 0) {
                chContent = {
                    chName: item.diziName,
                    chUrl: vkSourceFix(data[0].chUrl),
                    chImg: item.diziImg,
                    chHeaders: data[0].chHeaders || 'null',
                    chReg: data[0].chReg || 'null',
                    chType: data[0].chType
                };
            }
        } else if (item.chType === 'tekli_regex_lb_sh_3' || item.chType === 'cable_sh') {
            console.log(`🏃 Processing ${item.chType} type`);
            const data = await makeInatRequest(item.chUrl, proxyFetch);

            if (data) {
                const nestedItem = Array.isArray(data) ? data[0] : data;
                console.log('🏃 Nested item type:', nestedItem.chType);
                console.log('🏃 Nested item URL:', nestedItem.chUrl ? nestedItem.chUrl.substring(0, 80) + '...' : 'null');

                chContent = {
                    chName: item.chName,
                    chUrl: vkSourceFix(nestedItem.chUrl || item.chUrl),
                    chImg: item.chImg,
                    chHeaders: nestedItem.chHeaders || item.chHeaders || 'null',
                    chReg: nestedItem.chReg || item.chReg || 'null',
                    chType: nestedItem.chType || item.chType
                };
            }
        } else {
            console.log('🎬 Processing direct channel type');
            chContent = {
                chName: item.chName || item.diziName,
                chUrl: vkSourceFix(item.chUrl),
                chImg: item.chImg || item.diziImg,
                chHeaders: item.chHeaders || 'null',
                chReg: item.chReg || 'null',
                chType: item.chType || 'live_url'
            };
        }

        if (!chContent || !chContent.chUrl) {
            console.error('❌ No URL found for:', item.chName || item.diziName);
            return { streams: [] };
        }

        console.log('🎬 Stream URL:', chContent.chUrl.substring(0, 80) + '...');
        console.log('🎬 Stream Type:', chContent.chType);
        console.log('🎬 Headers:', chContent.chHeaders !== 'null' ? 'Present' : 'None');
        console.log('🎬 Reg:', chContent.chReg !== 'null' ? 'Present' : 'None');

        const streams = await extractStreams(chContent, proxyFetch);

        console.log(`✅ Found ${streams.length} stream(s)`);
        return { streams };
    } catch (error) {
        console.error('❌ Stream error:', error.message);
        console.error('❌ Stack:', error.stack);
        return { streams: [] };
    }
}

// ============ STREAM EXTRACTION ============
async function extractStreams(chContent, proxyFetch) {
    const streams = [];

    if (!chContent.chUrl) {
        console.error('❌ No URL provided to extractStreams');
        return streams;
    }

    const url = chContent.chUrl;
    console.log('🔍 Extracting streams from:', url.substring(0, 80) + '...');

    // Parse custom headers
    const customHeaders = {};
    try {
        if (chContent.chHeaders && chContent.chHeaders !== 'null') {
            let headersArray = chContent.chHeaders;
            if (typeof chContent.chHeaders === 'string') {
                headersArray = JSON.parse(chContent.chHeaders);
            }
            if (Array.isArray(headersArray) && headersArray.length > 0) {
                Object.assign(customHeaders, headersArray[0]);
            }
        }
        if (chContent.chReg && chContent.chReg !== 'null') {
            let regArray = chContent.chReg;
            if (typeof chContent.chReg === 'string') {
                regArray = JSON.parse(chContent.chReg);
            }
            if (Array.isArray(regArray) && regArray.length > 0 && regArray[0].playSH2) {
                customHeaders['Cookie'] = regArray[0].playSH2;
            }
        }
    } catch (e) {
        console.error('❌ Header parsing error:', e.message);
    }

    // Helper to add headers to stream
    const addHeadersToStream = (stream) => {
        if (Object.keys(customHeaders).length > 0) {
            stream.behaviorHints = stream.behaviorHints || {};
            stream.behaviorHints.proxyHeaders = {
                request: customHeaders
            };
            console.log('✅ Added custom headers to stream:', Object.keys(customHeaders).join(', '));
        }
        return stream;
    };

    try {
        // Handle different stream types
        if (url.includes('dzen.ru')) {
            console.log('🔍 Processing Dzen stream...');
            const response = await proxyFetch({
                url: url,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'https://dzen.ru/'
                },
                timeout: 30000
            });

            const htmlContent = response.body;
            const streamsStartIndex = htmlContent.indexOf('"streams":');

            if (streamsStartIndex !== -1) {
                const afterStreams = htmlContent.substring(streamsStartIndex + 10);
                const arrayStart = afterStreams.indexOf('[');
                const arrayEnd = afterStreams.indexOf('],') + 1;

                if (arrayStart !== -1 && arrayEnd !== -1) {
                    const streamsJsonStr = afterStreams.substring(arrayStart, arrayEnd);
                    try {
                        const streamList = JSON.parse(streamsJsonStr);
                        console.log(`Found ${streamList.length} Dzen streams`);

                        streamList.forEach(stream => {
                            if (stream.url) {
                                const quality = mapDzenQuality(stream.type);
                                const streamType = stream.type || 'video';
                                let name = `DzenRu - ${quality}`;

                                if (streamType === 'hls') {
                                    name = 'DzenRu - HLS';
                                } else if (streamType === 'dash') {
                                    name = 'DzenRu - DASH';
                                }

                                const dzenHeaders = { ...customHeaders, 'Referer': 'https://dzen.ru/' };
                                const dzenStream = {
                                    name: name,
                                    title: quality,
                                    url: stream.url,
                                    behaviorHints: {
                                        bingeGroup: `dzen-${quality}`
                                    }
                                };

                                if (Object.keys(dzenHeaders).length > 0) {
                                    dzenStream.behaviorHints.proxyHeaders = {
                                        request: dzenHeaders
                                    };
                                }

                                streams.push(dzenStream);
                            }
                        });
                    } catch (parseError) {
                        console.error('Failed to parse Dzen streams JSON:', parseError.message);
                    }
                }
            }
        } else if (url.includes('vk.com')) {
            console.log('Processing VK stream...');
            const response = await proxyFetch({
                url: url,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'https://vk.com/'
                },
                timeout: 30000
            });

            const m3u8Match = response.body.match(/"([^"]*m3u8[^"]*)"/);
            if (m3u8Match) {
                const streamUrl = m3u8Match[1].replace(/\\\//g, '/');
                const vkHeaders = { ...customHeaders, 'Referer': 'https://vk.com/' };
                const vkStream = {
                    name: 'VK',
                    title: 'VK Stream',
                    url: streamUrl
                };

                if (Object.keys(vkHeaders).length > 0) {
                    vkStream.behaviorHints = {
                        proxyHeaders: { request: vkHeaders }
                    };
                }

                streams.push(vkStream);
                console.log('✅ VK stream extracted');
            }
        } else if (url.includes('disk.yandex.com.tr')) {
            console.log('Processing Yandex Disk stream...');
            const response = await proxyFetch({
                url: url,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'https://disk.yandex.com.tr/'
                },
                timeout: 30000
            });

            const m3u8Match = response.body.match(/https?:\/\/[^\s"]*?master-playlist\.m3u8/);
            if (m3u8Match) {
                const yandexHeaders = { ...customHeaders, 'Referer': 'https://disk.yandex.com.tr/' };
                const yandexStream = {
                    name: 'Yandex Disk',
                    title: 'Yandex',
                    url: m3u8Match[0]
                };

                if (Object.keys(yandexHeaders).length > 0) {
                    yandexStream.behaviorHints = {
                        proxyHeaders: { request: yandexHeaders }
                    };
                }

                streams.push(yandexStream);
                console.log('✅ Yandex Disk stream extracted');
            }
        } else if (url.includes('.m3u8') || url.includes('master') || url.includes('playlist')) {
            console.log('✅ Adding HLS stream');
            streams.push(addHeadersToStream({
                name: chContent.chName,
                title: 'HLS',
                url: url
            }));
        } else if (url.includes('.mpd')) {
            console.log('✅ Adding DASH stream');
            streams.push(addHeadersToStream({
                name: chContent.chName,
                title: 'DASH',
                url: url
            }));
        } else if (url.includes('.ts') || url.includes('.mp4')) {
            console.log('✅ Adding direct video stream');
            streams.push(addHeadersToStream({
                name: chContent.chName,
                title: 'Direct',
                url: url
            }));
        } else {
            // Generic stream - might be a direct URL
            console.log('✅ Adding generic stream (URL pattern not recognized)');
            streams.push(addHeadersToStream({
                name: chContent.chName,
                title: 'Stream',
                url: url
            }));
        }
    } catch (error) {
        console.error('❌ Stream extraction error:', error.message);
        console.error('❌ Error stack:', error.stack);
        // Fallback - try to add stream anyway
        try {
            console.log('⚠️ Fallback: Adding stream as-is');
            streams.push(addHeadersToStream({
                name: chContent.chName || 'Unknown',
                title: 'Fallback Stream',
                url: url
            }));
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError.message);
        }
    }

    if (streams.length === 0) {
        console.warn('⚠️ No streams extracted, returning empty array');
    }

    return streams;
}

// Export functions
module.exports = {
    manifest,
    getManifest: () => manifest,
    handleCatalog,
    handleMeta,
    handleStream
};

