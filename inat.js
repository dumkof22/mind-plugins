const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const { getWithBypass, postWithBypass } = require('./cloudflare-bypass');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration
const CONFIG = {
    contentUrl: 'https://dizibox.cfd',
    aesKey: 'ywevqtjrurkwtqgz',
    userAgent: 'speedrestapi'
};


// Manifest
const manifest = {
    id: 'com.keyiflerolsun.inatbox',
    version: '1.0.0',
    name: 'InatBox',
    description: 'Turkish TV channels, movies and series streaming',
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
        console.error('Decryption error:', error.message);
        return null;
    }
}

// Make InatBox API request
async function makeInatRequest(url) {
    try {
        console.log('🌐 Making InatBox request to:', url.substring(0, 80) + '...');
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

        // POST request with bypass
        const responseData = await postWithBypass(url, requestBody, {
            headers: headers,
            timeout: 30000,
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8'
        });

        console.log('🌐 Response alındı, decrypt ediliyor...');
        console.log('🌐 Response type:', typeof responseData);
        console.log('🌐 Response preview:', responseData ? responseData.substring(0, 100) + '...' : 'null');

        if (responseData) {
            // Check if response is an HTML error page (404, 500, etc.)
            if (responseData.trim().startsWith('<!DOCTYPE') || responseData.trim().startsWith('<html')) {
                console.error('❌ Server returned HTML page (likely 404 or error)');
                console.error('❌ URL may be invalid or server is down:', url);
                return null;
            }

            // Check if response is already JSON (not encrypted)
            try {
                const parsed = JSON.parse(responseData);
                console.log('✅ Response is plain JSON (not encrypted), data type:', Array.isArray(parsed) ? `Array[${parsed.length}]` : 'Object');
                return parsed;
            } catch (jsonError) {
                // Not plain JSON, try to decrypt
                console.log('🔐 Response is encrypted, attempting decrypt...');
                const decrypted = decryptAES(responseData, CONFIG.aesKey);
                if (decrypted) {
                    const parsed = JSON.parse(decrypted);
                    console.log('✅ Decryption successful, data type:', Array.isArray(parsed) ? `Array[${parsed.length}]` : 'Object');
                    return parsed;
                } else {
                    console.error('❌ Decryption failed');
                    return null;
                }
            }
        }

        console.error('❌ Request failed');
        return null;
    } catch (error) {
        console.error('❌ Request error:', error.message);
        if (error.response) {
            console.error('❌ Response status:', error.response.status);
            console.error('❌ Response data:', error.response.data);
        }
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
    if (url.startsWith('act')) {
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

// Extract streams from various sources
async function extractStreams(chContent) {
    const streams = [];

    if (!chContent.chUrl) {
        console.error('❌ No URL provided to extractStreams');
        return streams;
    }

    const url = vkSourceFix(chContent.chUrl);
    console.log('🔍 Extracting streams from:', url.substring(0, 80) + '...');
    console.log('🔍 Channel:', chContent.chName);
    console.log('🔍 Type:', chContent.chType);

    // Parse headers if available
    const customHeaders = {};
    try {
        console.log('📋 Checking headers...');
        console.log('   chHeaders type:', typeof chContent.chHeaders);
        console.log('   chHeaders value:', chContent.chHeaders === 'null' ? 'null string' : (chContent.chHeaders ? 'present' : 'missing'));
        console.log('   chReg type:', typeof chContent.chReg);
        console.log('   chReg value:', chContent.chReg === 'null' ? 'null string' : (chContent.chReg ? 'present' : 'missing'));

        if (chContent.chHeaders && chContent.chHeaders !== 'null') {
            console.log('   Parsing chHeaders...');
            // chHeaders might already be an object/array (from JSON decode) or a JSON string
            let headersArray = chContent.chHeaders;
            if (typeof chContent.chHeaders === 'string') {
                headersArray = JSON.parse(chContent.chHeaders);
            }
            console.log('   Headers array length:', Array.isArray(headersArray) ? headersArray.length : 'not an array');
            if (Array.isArray(headersArray) && headersArray.length > 0) {
                Object.assign(customHeaders, headersArray[0]);
                console.log('   ✅ Extracted headers:', Object.keys(headersArray[0]));
            }
        }
        if (chContent.chReg && chContent.chReg !== 'null') {
            console.log('   Parsing chReg...');
            // chReg might already be an object/array (from JSON decode) or a JSON string
            let regArray = chContent.chReg;
            if (typeof chContent.chReg === 'string') {
                regArray = JSON.parse(chContent.chReg);
            }
            console.log('   Reg array length:', Array.isArray(regArray) ? regArray.length : 'not an array');
            if (Array.isArray(regArray) && regArray.length > 0 && regArray[0].playSH2) {
                customHeaders['Cookie'] = regArray[0].playSH2;
                console.log('   ✅ Extracted Cookie from playSH2');
            }
        }

        console.log('📋 Final custom headers:', Object.keys(customHeaders).length > 0 ? Object.keys(customHeaders).join(', ') : 'None');
    } catch (e) {
        console.error('❌ Header parsing error:', e.message);
        console.error('   Stack:', e.stack);
    }

    // Helper function to add headers to stream
    const addHeadersToStream = (stream) => {
        if (Object.keys(customHeaders).length > 0) {
            stream.behaviorHints = stream.behaviorHints || {};
            stream.behaviorHints.proxyHeaders = {
                request: customHeaders
            };
            console.log('✅ Added', Object.keys(customHeaders).length, 'header(s) to stream:', stream.name);
            console.log('   Headers:', JSON.stringify(customHeaders, null, 2));
        } else {
            console.log('⚠️ No custom headers to add to stream:', stream.name);
        }
        return stream;
    };

    try {
        // Handle different stream types
        if (url.includes('dzen.ru')) {
            console.log('Processing Dzen stream...');
            const htmlContent = await getWithBypass(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.38 Mobile Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'https://dzen.ru/'
                },
                timeout: 30000,
                waitUntil: 'domcontentloaded'
            });
            const streamsStartIndex = htmlContent.indexOf('"streams":');
            if (streamsStartIndex !== -1) {
                const afterStreams = htmlContent.substring(streamsStartIndex + 10); // Skip "streams":
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
                                let linkType = 'VIDEO';
                                let name = `DzenRu - ${quality}`;

                                if (streamType === 'hls') {
                                    linkType = 'HLS';
                                    name = 'DzenRu - HLS';
                                } else if (streamType === 'dash') {
                                    linkType = 'DASH';
                                    name = 'DzenRu - DASH';
                                }

                                // Add Referer header for Dzen streams (like Kotlin extractor)
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
                } else {
                    console.warn('Could not find Dzen streams array in HTML');
                }
            } else {
                console.warn('Could not find "streams" key in Dzen HTML');
            }
        } else if (url.includes('vk.com')) {
            console.log('Processing VK stream...');
            const vkData = await getWithBypass(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'https://vk.com/'
                },
                timeout: 30000,
                waitUntil: 'domcontentloaded'
            });

            const m3u8Match = vkData.match(/"([^"]*m3u8[^"]*)"/);
            if (m3u8Match) {
                const streamUrl = m3u8Match[1].replace(/\\\//g, '/');

                // Add Referer header for VK streams (like Kotlin extractor)
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
                console.log('✅ VK stream extracted with Referer header');
            } else {
                console.warn('No m3u8 found in VK response');
            }
        } else if (url.includes('disk.yandex.com.tr')) {
            console.log('Processing Yandex Disk stream...');
            const yandexData = await getWithBypass(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'https://disk.yandex.com.tr/'
                },
                timeout: 30000,
                waitUntil: 'domcontentloaded'
            });

            const m3u8Match = yandexData.match(/https?:\/\/[^\s"]*?master-playlist\.m3u8/);
            if (m3u8Match) {
                // Add Referer header for Yandex streams (like Kotlin extractor)
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
                console.log('✅ Yandex Disk stream extracted with Referer header');
            } else {
                console.warn('No m3u8 found in Yandex response');
            }
        } else if (url.includes('cdn.jwplayer.com')) {
            // Direct CDN JWPlayer link
            streams.push(addHeadersToStream({
                name: 'CDN JWPlayer',
                title: 'HLS',
                url: url
            }));
            console.log('Added CDN JWPlayer stream');
        } else if (url.includes('.m3u8')) {
            streams.push(addHeadersToStream({
                name: chContent.chName,
                title: 'HLS',
                url: url
            }));
            console.log('Added HLS stream:', url.substring(0, 50) + '...');
        } else if (url.includes('.mpd')) {
            streams.push(addHeadersToStream({
                name: chContent.chName,
                title: 'DASH',
                url: url
            }));
            console.log('Added DASH stream:', url.substring(0, 50) + '...');
        } else {
            // Direct stream - add it anyway
            streams.push(addHeadersToStream({
                name: chContent.chName,
                title: 'Direct',
                url: url
            }));
            console.log('Added direct stream:', url.substring(0, 50) + '...');
        }
    } catch (error) {
        console.error('Stream extraction error:', error.message);
        console.error('Error stack:', error.stack);
        // Fallback to direct URL - always provide something
        streams.push(addHeadersToStream({
            name: chContent.chName || 'Unknown',
            title: 'Direct',
            url: url
        }));
    }

    return streams;
}

// Routes

// Manifest
app.get('/manifest.json', (req, res) => {
    res.json(manifest);
});

// Catalog - use wildcard to catch everything after /catalog/:type/
app.get('/catalog/:type/*', async (req, res) => {
    const { type } = req.params;
    // Get everything after /catalog/:type/ as id
    let id = req.params[0]; // This captures the wildcard

    // Remove .json extension if present
    id = id.replace(/\.json$/, '');

    console.log('📋 Catalog request - Type:', type, 'ID:', id);

    const url = catalogUrls[id];
    if (!url) {
        console.warn('⚠️ No URL found for catalog:', id);
        return res.json({ metas: [] });
    }

    try {
        const data = await makeInatRequest(url);
        if (!data || !Array.isArray(data)) {
            return res.json({ metas: [] });
        }

        const metas = data
            .filter(isContentAllowed)
            .map(item => {
                if (item.diziType) {
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
                    return {
                        id: `inatbox:${Buffer.from(JSON.stringify(item)).toString('base64')}`,
                        type: isLive ? 'tv' : 'movie',
                        name: item.chName,
                        poster: item.chImg,
                        posterShape: isLive ? 'square' : 'poster'
                    };
                }
                return null;
            })
            .filter(Boolean);

        res.json({ metas });
    } catch (error) {
        console.error('Catalog error:', error.message);
        res.json({ metas: [] });
    }
});

// Meta - use wildcard to catch everything after /meta/:type/
app.get('/meta/:type/*', async (req, res) => {
    const { type } = req.params;
    // Get everything after /meta/:type/ as id
    let id = req.params[0]; // This captures the wildcard

    // Remove .json extension if present
    id = id.replace(/\.json$/, '');

    console.log('📺 Meta request received!');
    console.log('📺 Type:', type);
    console.log('📺 Raw ID:', id.substring(0, 50) + '...');

    try {
        const itemData = Buffer.from(id.replace('inatbox:', ''), 'base64').toString('utf8');
        const item = JSON.parse(itemData);

        console.log('📺 Decoded item:', {
            diziType: item.diziType,
            chType: item.chType,
            name: item.diziName || item.chName,
            type: type
        });

        if (item.diziType) {
            const data = await makeInatRequest(item.diziUrl);

            if (item.diziType === 'dizi' && Array.isArray(data)) {
                // Series with seasons
                const videos = [];

                for (let i = 0; i < data.length; i++) {
                    const season = data[i];
                    const episodeData = await makeInatRequest(season.diziUrl);

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

                console.log('✅ Returning series meta with', videos.length, 'episodes');
                return res.json({
                    meta: {
                        id: id,
                        type: 'series',
                        name: item.diziName,
                        poster: data[0]?.diziImg || item.diziImg,
                        description: item.diziDetay,
                        videos: videos
                    }
                });
            } else {
                // Movie
                console.log('✅ Returning movie meta');
                return res.json({
                    meta: {
                        id: id,
                        type: 'movie',
                        name: item.diziName,
                        poster: item.diziImg,
                        description: item.diziDetay
                    }
                });
            }
        } else {
            // Live TV or single content
            console.log('✅ Returning TV/channel meta:', item.chName);
            const metaResponse = {
                meta: {
                    id: id,
                    type: type,
                    name: item.chName,
                    poster: item.chImg,
                    posterShape: type === 'tv' ? 'square' : 'poster'
                }
            };
            console.log('📺 Meta response:', JSON.stringify(metaResponse));
            return res.json(metaResponse);
        }
    } catch (error) {
        console.error('❌ Meta error:', error.message);
        console.error('Stack:', error.stack);
        res.status(404).json({ error: 'Not found' });
    }
});

// Stream - use wildcard to catch everything after /stream/:type/
app.get('/stream/:type/*', async (req, res) => {
    const { type } = req.params;
    // Get everything after /stream/:type/ as id
    let id = req.params[0]; // This captures the wildcard

    // Remove .json extension if present
    id = id.replace(/\.json$/, '');

    console.log('🎬 Stream request received!');
    console.log('🎬 Type:', type);
    console.log('🎬 Raw ID:', id.substring(0, 50) + '...');

    try {
        const itemData = Buffer.from(id.replace('inatbox:', ''), 'base64').toString('utf8');
        const item = JSON.parse(itemData);

        console.log('🎬 Decoded item:', {
            name: item.chName || item.diziName,
            type: item.chType || item.diziType,
            url: item.chUrl ? item.chUrl.substring(0, 50) + '...' : 'N/A'
        });

        let chContent;

        if (item.diziType === 'film') {
            const data = await makeInatRequest(item.diziUrl);
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
        } else if (item.chType === 'tekli_regex_lb_sh_3') {
            console.log('🏃 Processing tekli_regex_lb_sh_3 type - making nested request to:', item.chUrl);
            console.log('🏃 Parent item headers:', item.chHeaders !== 'null' ? 'Present' : 'None');
            console.log('🏃 Parent item reg:', item.chReg !== 'null' ? 'Present' : 'None');

            const data = await makeInatRequest(item.chUrl);
            console.log('🏃 Nested request response:', data ? 'Success' : 'Failed');

            if (data) {
                // Parse the response - it should be a single object
                const nestedItem = Array.isArray(data) ? data[0] : data;
                // Preserve headers from parent item (like Kotlin does)
                chContent = {
                    chName: item.chName,
                    chUrl: vkSourceFix(nestedItem.chUrl || item.chUrl),
                    chImg: item.chImg,
                    chHeaders: item.chHeaders || nestedItem.chHeaders || 'null',
                    chReg: item.chReg || nestedItem.chReg || 'null',
                    chType: nestedItem.chType || item.chType
                };
                console.log('🏃 Processed chContent:', {
                    chName: chContent.chName,
                    chUrl: chContent.chUrl.substring(0, 50) + '...',
                    chType: chContent.chType,
                    hasHeaders: chContent.chHeaders !== 'null',
                    hasReg: chContent.chReg !== 'null'
                });
            }
        } else {
            chContent = {
                chName: item.chName,
                chUrl: vkSourceFix(item.chUrl),
                chImg: item.chImg,
                chHeaders: item.chHeaders || 'null',
                chReg: item.chReg || 'null',
                chType: item.chType
            };
        }

        if (!chContent) {
            console.error('No content extracted for:', item.chName || item.diziName);
            return res.json({ streams: [] });
        }

        if (!chContent.chUrl) {
            console.error('❌ No URL found for:', chContent.chName);
            return res.json({ streams: [] });
        }

        console.log('🎬 Stream URL:', chContent.chUrl.substring(0, 80) + '...');
        console.log('🎬 Stream Type:', chContent.chType);

        const streams = await extractStreams(chContent);

        if (streams.length === 0) {
            console.error('❌ No streams extracted for:', chContent.chName);
        } else {
            console.log(`✅ Found ${streams.length} stream(s) for:`, chContent.chName);
            streams.forEach((s, i) => console.log(`   ${i + 1}. ${s.name} - ${s.url.substring(0, 60)}...`));
        }

        res.json({ streams });
    } catch (error) {
        console.error('❌ Stream error:', error.message);
        console.error('Stack:', error.stack);
        res.json({ streams: [] });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Export app for multi-addon server
module.exports = app;