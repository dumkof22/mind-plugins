// Video Extractors - Tüm video extractor'lar için yardımcı fonksiyonlar
const cheerio = require('cheerio');
const crypto = require('crypto');

// ============ EXTRACTOR: TauVideo ============
async function extractTauVideo(fetchResult) {
    const { body, url } = fetchResult;
    const streams = [];
    const streamName = fetchResult.metadata?.streamName || 'TauVideo';

    try {
        const data = JSON.parse(body);

        if (data.urls && Array.isArray(data.urls)) {
            data.urls.forEach(video => {
                const quality = video.label || 'Unknown';

                streams.push({
                    name: streamName,
                    title: `${streamName} - ${quality}`,
                    url: video.url,
                    behaviorHints: {
                        notWebReady: false
                    }
                });
            });

            console.log(`✅ TauVideo: Extracted ${streams.length} stream(s)`);
        }
    } catch (e) {
        console.log('⚠️  TauVideo extraction error:', e.message);
    }

    return { streams };
}

function getTauVideoInstructions(url, referer, streamName = 'TauVideo') {
    const videoKey = url.split('/').pop();
    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `tauvideo-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'extract_tauvideo',
            url: `https://tau-video.xyz/api/video/${videoKey}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': referer || url
            },
            metadata: { streamName }
        }]
    };
}

// ============ EXTRACTOR: Odnoklassniki (ok.ru) ============
async function extractOdnoklassniki(fetchResult) {
    const { body, url } = fetchResult;
    const streams = [];
    const streamName = fetchResult.metadata?.streamName || 'Odnoklassniki';

    try {
        // Unicode escape sequences'leri decode et
        const decoded = body
            .replace(/\\&quot;/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\u([0-9A-Fa-f]{4})/g, (match, grp) => {
                return String.fromCharCode(parseInt(grp, 16));
            });

        const videosStr = decoded.match(/"videos":(\[[^\]]*\])/)?.[1];

        if (videosStr) {
            const videos = JSON.parse(videosStr);

            videos.forEach(video => {
                let videoUrl = video.url;
                if (videoUrl.startsWith('//')) {
                    videoUrl = 'https:' + videoUrl;
                }

                const qualityMap = {
                    'mobile': '144p',
                    'lowest': '240p',
                    'low': '360p',
                    'sd': '480p',
                    'hd': '720p',
                    'full': '1080p',
                    'quad': '1440p',
                    'ultra': '4k'
                };

                const quality = qualityMap[video.name.toLowerCase()] || video.name;

                streams.push({
                    name: streamName,
                    title: `${streamName} - ${quality}`,
                    url: videoUrl,
                    behaviorHints: {
                        notWebReady: false
                    }
                });
            });

            console.log(`✅ Odnoklassniki: Extracted ${streams.length} stream(s)`);
        }
    } catch (e) {
        console.log('⚠️  Odnoklassniki extraction error:', e.message);
    }

    return { streams };
}

function getOdnoklassnikiInstructions(url, referer, streamName = 'Odnoklassniki') {
    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `odnoklassniki-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'extract_odnoklassniki',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
                'Referer': referer || url
            },
            metadata: { streamName }
        }]
    };
}

// ============ EXTRACTOR: SibNet ============
async function extractSibNet(fetchResult) {
    const { body, url } = fetchResult;
    const streams = [];
    const streamName = fetchResult.metadata?.streamName || 'SibNet';

    try {
        const m3uMatch = body.match(/player\.src\(\[\{src:\s*"([^"]+)"/);

        if (m3uMatch) {
            const m3uPath = m3uMatch[1];
            const m3uUrl = `https://video.sibnet.ru${m3uPath}`;

            streams.push({
                name: streamName,
                title: streamName,
                url: m3uUrl,
                behaviorHints: {
                    notWebReady: false
                }
            });

            console.log(`✅ SibNet: URL extracted - ${m3uUrl.substring(0, 60)}...`);
        } else {
            console.log('⚠️  SibNet: No m3u link found');
        }
    } catch (e) {
        console.log('⚠️  SibNet extraction error:', e.message);
    }

    return { streams };
}

function getSibNetInstructions(url, referer, streamName = 'SibNet') {
    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `sibnet-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'extract_sibnet',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': referer || url
            },
            metadata: { streamName }
        }]
    };
}

// ============ EXTRACTOR: Google Drive ============
async function extractDrive(fetchResult) {
    const { body, url } = fetchResult;
    const streams = [];
    const streamName = fetchResult.metadata?.streamName || 'Google Drive';

    try {
        const fmtMatch = body.match(/&fmt_stream_map=(.*)&url_encoded_fmt_stream_map/);

        if (fmtMatch) {
            const decoded = decodeURIComponent(fmtMatch[1]);
            const m3uLink = decoded.split('|').pop();

            streams.push({
                name: streamName,
                title: streamName,
                url: m3uLink,
                behaviorHints: {
                    notWebReady: false
                }
            });

            console.log(`✅ Drive: URL extracted - ${m3uLink.substring(0, 60)}...`);
        } else {
            console.log('⚠️  Drive: No fmt_stream_map found');
        }
    } catch (e) {
        console.log('⚠️  Drive extraction error:', e.message);
    }

    return { streams };
}

function getDriveInstructions(url, referer, streamName = 'Google Drive') {
    const docId = url.match(/file\/d\/([^/]+)\/preview/)?.[1];

    if (!docId) {
        console.log('⚠️  Drive: No docId found');
        return { streams: [] };
    }

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `drive-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'extract_drive',
            url: `https://drive.google.com/get_video_info?docid=${docId}&drive_originator_app=303`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': referer || url
            },
            metadata: { streamName, docId }
        }]
    };
}

// ============ EXTRACTOR: CizgiDuo/CizgiPass (AES Encrypted) ============
// NOT: AES decryption için crypto-js veya özel implementation gerekiyor
// Bu extractor'lar instruction mode'da tam desteklenemeyebilir

class AESHelper {
    static cryptoAESHandler(data, passBytes, decrypt = true) {
        try {
            const key = passBytes.slice(0, 32); // 256 bit
            const iv = passBytes.slice(0, 16);  // 128 bit

            if (decrypt) {
                const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
                decipher.setAutoPadding(true);

                let decrypted = decipher.update(data, 'base64', 'utf8');
                decrypted += decipher.final('utf8');

                return decrypted;
            }
        } catch (e) {
            console.log('⚠️  AES Handler error:', e.message);
            return null;
        }
    }
}

async function extractCizgiDuo(fetchResult) {
    const { body, url } = fetchResult;
    const streams = [];
    const streamName = fetchResult.metadata?.streamName || 'CizgiDuo';

    try {
        const bePlayerMatch = body.match(/bePlayer\('([^']+)',\s*'(\{[^}]+\})'\);/);

        if (bePlayerMatch) {
            const bePlayerPass = bePlayerMatch[1];
            const bePlayerData = bePlayerMatch[2];

            const encrypted = AESHelper.cryptoAESHandler(
                bePlayerData,
                Buffer.from(bePlayerPass, 'utf-8'),
                false
            );

            if (encrypted) {
                const cleaned = encrypted.replace(/\\/g, '');
                const m3uLink = cleaned.match(/video_location":"([^"]+)/)?.[1];

                if (m3uLink) {
                    streams.push({
                        name: streamName,
                        title: streamName,
                        url: m3uLink,
                        type: 'm3u8',
                        behaviorHints: {
                            notWebReady: false
                        }
                    });

                    console.log(`✅ ${streamName}: URL extracted - ${m3uLink.substring(0, 60)}...`);
                }
            }
        }
    } catch (e) {
        console.log(`⚠️  ${streamName} extraction error:`, e.message);
    }

    return { streams };
}

function getCizgiDuoInstructions(url, referer, streamName = 'CizgiDuo') {
    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `cizgiduo-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'extract_cizgiduo',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': referer || url
            },
            metadata: { streamName }
        }]
    };
}

function getCizgiPassInstructions(url, referer) {
    return getCizgiDuoInstructions(url, referer, 'CizgiPass');
}

// ============ MAIN PROCESSOR ============

async function processVideoExtractor(fetchResult) {
    const { purpose } = fetchResult;

    switch (purpose) {
        case 'extract_tauvideo':
            return await extractTauVideo(fetchResult);

        case 'extract_odnoklassniki':
            return await extractOdnoklassniki(fetchResult);

        case 'extract_sibnet':
            return await extractSibNet(fetchResult);

        case 'extract_drive':
            return await extractDrive(fetchResult);

        case 'extract_cizgiduo':
        case 'extract_cizgipass':
            return await extractCizgiDuo(fetchResult);

        default:
            console.log(`⚠️  Unknown extractor purpose: ${purpose}`);
            return { streams: [] };
    }
}

// ============ EXPORTS ============

module.exports = {
    // Extractors
    extractTauVideo,
    extractOdnoklassniki,
    extractSibNet,
    extractDrive,
    extractCizgiDuo,

    // Instruction helpers
    getTauVideoInstructions,
    getOdnoklassnikiInstructions,
    getSibNetInstructions,
    getDriveInstructions,
    getCizgiDuoInstructions,
    getCizgiPassInstructions,

    // Main processor
    processVideoExtractor
};

