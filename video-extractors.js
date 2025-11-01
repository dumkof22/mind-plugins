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
            // Extract subtitles if available (SelcukFlix standardı ile)
            const subtitles = [];
            const subUrls = new Set();

            if (data.tracks && Array.isArray(data.tracks)) {
                data.tracks.filter(t => t.kind === 'captions' || t.kind === 'subtitles').forEach(track => {
                    if (track.file) {
                        // Unicode escape temizleme (Türkçe karakterler)
                        const trackLabel = (track.label || track.language || 'Türkçe')
                            .replace(/\\u0131/g, 'ı')
                            .replace(/\\u0130/g, 'İ')
                            .replace(/\\u00fc/g, 'ü')
                            .replace(/\\u00e7/g, 'ç')
                            .replace(/\\u011f/g, 'ğ')
                            .replace(/\\u015f/g, 'ş');

                        // Türkçe keyword kontrolü
                        const keywords = ['tur', 'tr', 'türkçe', 'turkce'];
                        const language = keywords.some(k => trackLabel.toLowerCase().includes(k)) ? 'Turkish' : trackLabel;

                        const subUrl = track.file.startsWith('http') ? track.file : `https:${track.file}`;

                        // Duplicate kontrolü
                        if (!subUrls.has(subUrl)) {
                            subUrls.add(subUrl);
                            subtitles.push({
                                id: language.toLowerCase().replace(/\s+/g, '_'),
                                url: subUrl,
                                lang: language
                            });
                            console.log(`   📝 TauVideo altyazı bulundu: ${language}`);
                        }
                    }
                });
            }

            // Extract audio tracks if available (SelcukFlix standardı ile)
            const audioTracks = [];
            const audioUrls = new Set();

            if (data.tracks && Array.isArray(data.tracks)) {
                data.tracks.filter(t => t.kind === 'audio' || t.kind === 'audiotrack').forEach(track => {
                    if (track.file) {
                        // Unicode escape temizleme
                        const trackLabel = (track.label || track.language || 'Orijinal')
                            .replace(/\\u0131/g, 'ı')
                            .replace(/\\u0130/g, 'İ')
                            .replace(/\\u00fc/g, 'ü')
                            .replace(/\\u00e7/g, 'ç')
                            .replace(/\\u011f/g, 'ğ')
                            .replace(/\\u015f/g, 'ş');

                        const audioUrl = track.file.startsWith('http') ? track.file : `https:${track.file}`;

                        // Duplicate kontrolü
                        if (!audioUrls.has(audioUrl)) {
                            audioUrls.add(audioUrl);
                            audioTracks.push({
                                id: trackLabel.toLowerCase().replace(/\s+/g, '_'),
                                url: audioUrl,
                                lang: trackLabel
                            });
                            console.log(`   🎵 TauVideo ses track bulundu: ${trackLabel}`);
                        }
                    }
                });
            }

            data.urls.forEach(video => {
                const quality = video.label || 'Unknown';

                const streamData = {
                    name: streamName,
                    title: `${streamName} - ${quality}`,
                    url: video.url,
                    behaviorHints: {
                        notWebReady: false
                    }
                };

                if (subtitles.length > 0) streamData.subtitles = subtitles;
                if (audioTracks.length > 0) streamData.audioTracks = audioTracks;

                streams.push(streamData);
            });

            console.log(`✅ TauVideo: Extracted ${streams.length} stream(s), ${subtitles.length} subtitle(s), ${audioTracks.length} audio track(s)`);
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

            const streamData = {
                name: streamName,
                title: streamName,
                url: m3uUrl,
                behaviorHints: {
                    notWebReady: false
                }
            };

            // Extract subtitles and audio tracks if available (SelcukFlix standardı ile)
            const subtitles = [];
            const subUrls = new Set();
            const audioTracks = [];
            const audioUrls = new Set();

            const tracksMatch = body.match(/tracks\s*:\s*(\[[\s\S]*?\])/);
            if (tracksMatch) {
                try {
                    const tracksData = JSON.parse(tracksMatch[1]);

                    // Subtitle processing
                    tracksData.filter(t => t.kind === 'captions' || t.kind === 'subtitles').forEach(track => {
                        if (track.file) {
                            // Unicode escape temizleme
                            const trackLabel = (track.label || track.language || 'Türkçe')
                                .replace(/\\u0131/g, 'ı')
                                .replace(/\\u0130/g, 'İ')
                                .replace(/\\u00fc/g, 'ü')
                                .replace(/\\u00e7/g, 'ç')
                                .replace(/\\u011f/g, 'ğ')
                                .replace(/\\u015f/g, 'ş');

                            // Türkçe keyword kontrolü
                            const keywords = ['tur', 'tr', 'türkçe', 'turkce'];
                            const language = keywords.some(k => trackLabel.toLowerCase().includes(k)) ? 'Turkish' : trackLabel;

                            const subUrl = track.file.startsWith('http') ? track.file : `https://video.sibnet.ru${track.file}`;

                            // Duplicate kontrolü
                            if (!subUrls.has(subUrl)) {
                                subUrls.add(subUrl);
                                subtitles.push({
                                    id: language.toLowerCase().replace(/\s+/g, '_'),
                                    url: subUrl,
                                    lang: language
                                });
                                console.log(`   📝 SibNet altyazı bulundu: ${language}`);
                            }
                        }
                    });

                    // Audio track processing
                    tracksData.filter(t => t.kind === 'audio' || t.kind === 'audiotrack').forEach(track => {
                        if (track.file) {
                            // Unicode escape temizleme
                            const trackLabel = (track.label || track.language || 'Orijinal')
                                .replace(/\\u0131/g, 'ı')
                                .replace(/\\u0130/g, 'İ')
                                .replace(/\\u00fc/g, 'ü')
                                .replace(/\\u00e7/g, 'ç')
                                .replace(/\\u011f/g, 'ğ')
                                .replace(/\\u015f/g, 'ş');

                            const audioUrl = track.file.startsWith('http') ? track.file : `https://video.sibnet.ru${track.file}`;

                            // Duplicate kontrolü
                            if (!audioUrls.has(audioUrl)) {
                                audioUrls.add(audioUrl);
                                audioTracks.push({
                                    id: trackLabel.toLowerCase().replace(/\s+/g, '_'),
                                    url: audioUrl,
                                    lang: trackLabel
                                });
                                console.log(`   🎵 SibNet ses track bulundu: ${trackLabel}`);
                            }
                        }
                    });
                } catch (e) {
                    console.log('⚠️  SibNet tracks parse error:', e.message);
                }
            }

            if (subtitles.length > 0) streamData.subtitles = subtitles;
            if (audioTracks.length > 0) streamData.audioTracks = audioTracks;

            streams.push(streamData);

            console.log(`✅ SibNet: URL extracted - ${m3uUrl.substring(0, 60)}...`);
            if (subtitles.length > 0) console.log(`   ${subtitles.length} subtitle(s) found`);
            if (audioTracks.length > 0) console.log(`   ${audioTracks.length} audio track(s) found`);
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
                    const streamData = {
                        name: streamName,
                        title: streamName,
                        url: m3uLink,
                        type: 'm3u8',
                        behaviorHints: {
                            notWebReady: false
                        }
                    };

                    // Extract subtitles and audio tracks if available (SelcukFlix standardı ile)
                    const subtitles = [];
                    const subUrls = new Set();
                    const audioTracks = [];
                    const audioUrls = new Set();

                    const tracksMatch = body.match(/tracks\s*:\s*(\[[\s\S]*?\])/);
                    if (tracksMatch) {
                        try {
                            const tracksData = JSON.parse(tracksMatch[1]);

                            // Subtitle processing
                            tracksData.filter(t => t.kind === 'captions' || t.kind === 'subtitles').forEach(track => {
                                if (track.file) {
                                    // Unicode escape temizleme
                                    const trackLabel = (track.label || track.language || 'Türkçe')
                                        .replace(/\\u0131/g, 'ı')
                                        .replace(/\\u0130/g, 'İ')
                                        .replace(/\\u00fc/g, 'ü')
                                        .replace(/\\u00e7/g, 'ç')
                                        .replace(/\\u011f/g, 'ğ')
                                        .replace(/\\u015f/g, 'ş');

                                    // Türkçe keyword kontrolü
                                    const keywords = ['tur', 'tr', 'türkçe', 'turkce'];
                                    const language = keywords.some(k => trackLabel.toLowerCase().includes(k)) ? 'Turkish' : trackLabel;

                                    const subUrl = track.file.startsWith('http') ? track.file : `https:${track.file}`;

                                    // Duplicate kontrolü
                                    if (!subUrls.has(subUrl)) {
                                        subUrls.add(subUrl);
                                        subtitles.push({
                                            id: language.toLowerCase().replace(/\s+/g, '_'),
                                            url: subUrl,
                                            lang: language
                                        });
                                        console.log(`   📝 ${streamName} altyazı bulundu: ${language}`);
                                    }
                                }
                            });

                            // Audio track processing
                            tracksData.filter(t => t.kind === 'audio' || t.kind === 'audiotrack').forEach(track => {
                                if (track.file) {
                                    // Unicode escape temizleme
                                    const trackLabel = (track.label || track.language || 'Orijinal')
                                        .replace(/\\u0131/g, 'ı')
                                        .replace(/\\u0130/g, 'İ')
                                        .replace(/\\u00fc/g, 'ü')
                                        .replace(/\\u00e7/g, 'ç')
                                        .replace(/\\u011f/g, 'ğ')
                                        .replace(/\\u015f/g, 'ş');

                                    const audioUrl = track.file.startsWith('http') ? track.file : `https:${track.file}`;

                                    // Duplicate kontrolü
                                    if (!audioUrls.has(audioUrl)) {
                                        audioUrls.add(audioUrl);
                                        audioTracks.push({
                                            id: trackLabel.toLowerCase().replace(/\s+/g, '_'),
                                            url: audioUrl,
                                            lang: trackLabel
                                        });
                                        console.log(`   🎵 ${streamName} ses track bulundu: ${trackLabel}`);
                                    }
                                }
                            });
                        } catch (e) {
                            console.log(`⚠️  ${streamName} tracks parse error:`, e.message);
                        }
                    }

                    if (subtitles.length > 0) streamData.subtitles = subtitles;
                    if (audioTracks.length > 0) streamData.audioTracks = audioTracks;

                    streams.push(streamData);

                    console.log(`✅ ${streamName}: URL extracted - ${m3uLink.substring(0, 60)}...`);
                    if (subtitles.length > 0) console.log(`   ${subtitles.length} subtitle(s) found`);
                    if (audioTracks.length > 0) console.log(`   ${audioTracks.length} audio track(s) found`);
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

// ============ EXTRACTOR: DzenRu ============
async function extractDzenRu(fetchResult) {
    const { body, url } = fetchResult;
    const streams = [];
    const streamName = fetchResult.metadata?.streamName || 'DzenRu';

    try {
        // vd*.okcdn.ru pattern'ini ara
        const regex = /https:\/\/vd\d+\.okcdn\.ru\/\?[^"'\\\s]+/g;
        const matches = body.match(regex);

        if (!matches || matches.length === 0) {
            console.log('⚠️  DzenRu: No video links found');
            return { streams };
        }

        // Unique link'leri al
        const uniqueLinks = [...new Set(matches)];

        uniqueLinks.forEach((link, index) => {
            streams.push({
                name: streamName,
                title: `${streamName} ${index > 0 ? index + 1 : ''}`,
                url: link,
                type: 'dash',
                behaviorHints: {
                    notWebReady: false
                }
            });
        });

        console.log(`✅ DzenRu: Extracted ${streams.length} stream(s)`);
    } catch (e) {
        console.log('⚠️  DzenRu extraction error:', e.message);
    }

    return { streams };
}

function getDzenRuInstructions(url, referer, streamName = 'DzenRu') {
    const videoKey = url.split('/').pop();
    const embedUrl = `https://dzen.ru/embed/${videoKey}`;
    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `dzenru-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'extract_dzenru',
            url: embedUrl,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': referer || url
            },
            metadata: { streamName }
        }]
    };
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

        case 'extract_dzenru':
            return await extractDzenRu(fetchResult);

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
    extractDzenRu,

    // Instruction helpers
    getTauVideoInstructions,
    getOdnoklassnikiInstructions,
    getSibNetInstructions,
    getDriveInstructions,
    getCizgiDuoInstructions,
    getCizgiPassInstructions,
    getDzenRuInstructions,

    // Main processor
    processVideoExtractor
};

