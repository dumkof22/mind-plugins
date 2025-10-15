// CanliTV - M3U8 Parser ile Canlı TV Eklentisi

// M3U8 Parser
class IptvPlaylistParser {
    parseM3U(content) {
        const lines = content.split('\n');

        if (!lines[0] || !lines[0].trim().startsWith('#EXTM3U')) {
            throw new Error('Invalid M3U8 file - missing #EXTM3U header');
        }

        const items = [];
        let currentItem = null;
        let currentHeaders = {};

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!line) continue;

            if (line.startsWith('#EXTINF')) {
                // Parse attributes
                const attributes = this.parseExtinfAttributes(line);
                const title = this.getTitle(line);

                currentItem = {
                    title: title,
                    attributes: attributes,
                    headers: {},
                    url: null,
                    userAgent: null
                };
                items.push(currentItem);
            } else if (line.startsWith('#EXTVLCOPT')) {
                // Parse VLC options
                if (currentItem) {
                    const userAgent = this.getTagValue(line, 'http-user-agent');
                    const referrer = this.getTagValue(line, 'http-referrer');

                    if (userAgent) {
                        currentItem.userAgent = userAgent;
                        currentItem.headers['user-agent'] = userAgent;
                    }
                    if (referrer) {
                        currentItem.headers['referrer'] = referrer;
                    }
                }
            } else if (!line.startsWith('#')) {
                // URL line
                if (currentItem) {
                    const urlData = this.parseUrl(line);
                    currentItem.url = urlData.url;

                    if (urlData.userAgent) {
                        currentItem.userAgent = urlData.userAgent;
                        currentItem.headers['user-agent'] = urlData.userAgent;
                    }
                    if (urlData.referer) {
                        currentItem.headers['referrer'] = urlData.referer;
                    }

                    Object.assign(currentItem.headers, urlData.headers);
                }
            }
        }

        return { items };
    }

    parseExtinfAttributes(line) {
        const attributes = {};

        // EXTINF line'dan attributes kısmını al
        const attrPart = line.split(',')[0];

        // Regex ile attribute'ları parse et
        const attrRegex = /(\S+?)="([^"]*)"/g;
        let match;

        while ((match = attrRegex.exec(attrPart)) !== null) {
            attributes[match[1]] = match[2];
        }

        return attributes;
    }

    getTitle(line) {
        const parts = line.split(',');
        return parts.slice(1).join(',').trim();
    }

    getTagValue(line, key) {
        const regex = new RegExp(`${key}=(.*)`, 'i');
        const match = line.match(regex);
        return match ? match[1].replace(/"/g, '').trim() : null;
    }

    parseUrl(line) {
        const parts = line.split('|');
        const url = parts[0].trim();
        const headers = {};
        let userAgent = null;
        let referer = null;

        if (parts.length > 1) {
            const paramsPart = parts.slice(1).join('|');
            const paramRegex = /(\w+[-\w]*)=([^&]+)/gi;
            let match;

            while ((match = paramRegex.exec(paramsPart)) !== null) {
                const key = match[1].toLowerCase();
                const value = match[2].replace(/"/g, '').trim();

                if (key === 'user-agent') {
                    userAgent = value;
                } else if (key === 'referer') {
                    referer = value;
                }
            }
        }

        return { url, userAgent, referer, headers };
    }
}

// Manifest tanımı
const manifest = {
    id: 'community.canlitv',
    version: '1.0.0',
    name: 'CanliTV',
    description: 'Türkçe canlı TV kanalları - M3U8 playlist tabanlı Stremio eklentisi',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    catalogs: [
        {
            type: 'tv',
            id: 'canlitv_all',
            name: 'Tüm Kanallar',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'tv',
            id: 'canlitv_search',
            name: 'Arama',
            extra: [
                { name: 'search', isRequired: true }
            ]
        }
    ],
    idPrefixes: ['canlitv']
};

const PLAYLIST_URL = 'https://raw.githubusercontent.com/feroxx/test/refs/heads/main/Kanallar/canlitv.m3u';

// ============ INSTRUCTION HANDLERS ============

async function handleCatalog(args) {
    console.log('\n🎯 [CanliTV Catalog] Generating instructions...');
    console.log('📋 Args:', JSON.stringify(args, null, 2));

    const catalogId = args.id;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);

    const requestId = `canlitv-playlist-${Date.now()}-${randomId}`;
    return {
        instructions: [{
            requestId,
            purpose: searchQuery ? 'catalog_search' : 'catalog',
            url: PLAYLIST_URL,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            metadata: { searchQuery }
        }]
    };
}

async function handleMeta(args) {
    const dataJson = Buffer.from(args.id.replace('canlitv:', ''), 'base64').toString('utf-8');

    const randomId = Math.random().toString(36).substring(2, 10);
    const requestId = `canlitv-meta-${Date.now()}-${randomId}`;

    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: PLAYLIST_URL,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            metadata: { channelData: dataJson }
        }]
    };
}

async function handleStream(args) {
    const dataJson = Buffer.from(args.id.replace('canlitv:', ''), 'base64').toString('utf-8');
    const channelData = JSON.parse(dataJson);

    console.log('\n🎯 [CanliTV Stream] Direct stream data:', channelData);

    // Direkt stream bilgisi döndür
    const streams = [{
        name: 'CanliTV',
        title: channelData.title,
        url: channelData.url,
        type: 'm3u8',
        behaviorHints: {
            notWebReady: false
        }
    }];

    return { streams };
}

// ============ FETCH RESULT PROCESSOR ============

async function processFetchResult(fetchResult) {
    const { purpose, body, url } = fetchResult;

    console.log(`\n⚙️ [CanliTV Process] Purpose: ${purpose}`);

    try {
        const parser = new IptvPlaylistParser();
        const playlist = parser.parseM3U(body);

        // Catalog
        if (purpose === 'catalog') {
            // Group by category
            const grouped = {};

            playlist.items.forEach(channel => {
                const group = channel.attributes['group-title'] || 'Diğer';
                if (!grouped[group]) {
                    grouped[group] = [];
                }
                grouped[group].push(channel);
            });

            // Her grup için metas oluştur
            const allMetas = [];

            for (const [groupName, channels] of Object.entries(grouped)) {
                channels.forEach(channel => {
                    const channelData = {
                        url: channel.url,
                        title: channel.title,
                        poster: channel.attributes['tvg-logo'] || null,
                        group: groupName,
                        nation: channel.attributes['tvg-country'] || 'TR'
                    };

                    const id = 'canlitv:' + Buffer.from(JSON.stringify(channelData)).toString('base64').replace(/=/g, '');

                    allMetas.push({
                        id: id,
                        type: 'tv',
                        name: channel.title,
                        poster: channel.attributes['tvg-logo'] || null,
                        description: `${groupName} | ${channelData.nation}`,
                        genres: [groupName]
                    });
                });
            }

            console.log(`✅ Found ${allMetas.length} channels in ${Object.keys(grouped).length} groups`);
            return { metas: allMetas };
        }

        // Catalog Search
        if (purpose === 'catalog_search') {
            const searchQuery = (fetchResult.metadata.searchQuery || '').toLowerCase();
            const metas = [];

            playlist.items.forEach(channel => {
                if (channel.title && channel.title.toLowerCase().includes(searchQuery)) {
                    const channelData = {
                        url: channel.url,
                        title: channel.title,
                        poster: channel.attributes['tvg-logo'] || null,
                        group: channel.attributes['group-title'] || 'Diğer',
                        nation: channel.attributes['tvg-country'] || 'TR'
                    };

                    const id = 'canlitv:' + Buffer.from(JSON.stringify(channelData)).toString('base64').replace(/=/g, '');

                    metas.push({
                        id: id,
                        type: 'tv',
                        name: channel.title,
                        poster: channel.attributes['tvg-logo'] || null,
                        description: `${channelData.group} | ${channelData.nation}`,
                        genres: [channelData.group]
                    });
                }
            });

            console.log(`✅ Found ${metas.length} channels matching "${searchQuery}"`);
            return { metas };
        }

        // Meta
        if (purpose === 'meta') {
            const channelData = JSON.parse(fetchResult.metadata.channelData);

            // Aynı gruptaki kanalları recommendations olarak bul
            const recommendations = [];

            playlist.items.forEach(channel => {
                const chGroup = channel.attributes['group-title'] || 'Diğer';

                if (chGroup === channelData.group && channel.title !== channelData.title) {
                    const recData = {
                        url: channel.url,
                        title: channel.title,
                        poster: channel.attributes['tvg-logo'] || null,
                        group: chGroup,
                        nation: channel.attributes['tvg-country'] || 'TR'
                    };

                    const id = 'canlitv:' + Buffer.from(JSON.stringify(recData)).toString('base64').replace(/=/g, '');

                    recommendations.push({
                        id: id,
                        type: 'tv',
                        name: channel.title,
                        poster: channel.attributes['tvg-logo'] || null
                    });
                }
            });

            const nation = channelData.group === 'NSFW'
                ? `⚠️🔞🔞🔞 » ${channelData.group} | ${channelData.nation} « 🔞🔞🔞⚠️`
                : `» ${channelData.group} | ${channelData.nation} «`;

            const meta = {
                id: fetchResult.requestId.includes('canlitv:') ? fetchResult.requestId : 'canlitv:' + Buffer.from(fetchResult.metadata.channelData).toString('base64').replace(/=/g, ''),
                type: 'tv',
                name: channelData.title,
                poster: channelData.poster,
                background: channelData.poster,
                description: nation,
                genres: [channelData.group],
                recommendations: recommendations.slice(0, 20) // İlk 20 öneri
            };

            console.log(`✅ Meta retrieved: ${channelData.title} with ${recommendations.length} recommendations`);
            return { meta };
        }

    } catch (e) {
        console.log('⚠️  Playlist parse error:', e.message);
        return { metas: [] };
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

