const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const { getWithBypass } = require('./cloudflare-bypass');

// Manifest tanımı
const manifest = {
    id: 'community.canlitv',
    version: '1.0.0',
    name: 'CanliTV',
    description: 'Türkçe canlı TV kanalları izleme platformu - IPTV M3U desteği',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv', 'movie'],
    catalogs: [],
    idPrefixes: ['canli']
};

const builder = new addonBuilder(manifest);
const M3U_URL = 'https://raw.githubusercontent.com/feroxx/test/refs/heads/main/Kanallar/canlitv.m3u';

// M3U Parser
class IptvPlaylistParser {
    parseM3U(content) {
        const lines = content.split('\n');

        if (!lines[0] || !lines[0].startsWith('#EXTM3U')) {
            throw new Error('Invalid M3U file header');
        }

        const items = [];
        let currentItem = null;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!line) continue;

            if (line.startsWith('#EXTINF:')) {
                currentItem = this.parseExtInf(line);
            } else if (line.startsWith('#EXTVLCOPT:')) {
                if (currentItem) {
                    this.parseVlcOpt(line, currentItem);
                }
            } else if (!line.startsWith('#')) {
                if (currentItem) {
                    const urlData = this.parseUrl(line);
                    currentItem.url = urlData.url;
                    if (urlData.userAgent) {
                        currentItem.headers['user-agent'] = urlData.userAgent;
                    }
                    if (urlData.referer) {
                        currentItem.headers['referer'] = urlData.referer;
                    }
                    items.push(currentItem);
                    currentItem = null;
                }
            }
        }

        return { items };
    }

    parseExtInf(line) {
        const attributes = {};
        const title = line.split(',').slice(1).join(',').trim();

        // Parse attributes like tvg-id="..." group-title="..."
        const attrRegex = /(\S+?)="([^"]*)"/g;
        let match;
        while ((match = attrRegex.exec(line)) !== null) {
            attributes[match[1]] = match[2];
        }

        return {
            title: title || 'Unknown',
            attributes: attributes,
            headers: {},
            url: null
        };
    }

    parseVlcOpt(line, item) {
        const userAgentMatch = line.match(/http-user-agent=(.+)/i);
        if (userAgentMatch) {
            item.headers['user-agent'] = userAgentMatch[1].trim();
        }

        const refererMatch = line.match(/http-referrer=(.+)/i);
        if (refererMatch) {
            item.headers['referer'] = refererMatch[1].trim();
        }
    }

    parseUrl(line) {
        const parts = line.split('|');
        const url = parts[0].trim();
        const headers = {};

        if (parts.length > 1) {
            const params = parts[1];
            const userAgentMatch = params.match(/user-agent=([^&]+)/i);
            if (userAgentMatch) {
                headers.userAgent = userAgentMatch[1].trim();
            }
            const refererMatch = params.match(/referer=([^&]+)/i);
            if (refererMatch) {
                headers.referer = refererMatch[1].trim();
            }
        }

        return { url, ...headers };
    }
}

// Global playlist cache
let cachedPlaylist = null;
let cacheTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 dakika

async function getPlaylist() {
    const now = Date.now();

    if (cachedPlaylist && (now - cacheTime) < CACHE_DURATION) {
        console.log('📦 Using cached playlist');
        return cachedPlaylist;
    }

    console.log('🔄 Fetching fresh M3U playlist...');
    try {
        const data = await getWithBypass(M3U_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000,
            waitUntil: 'domcontentloaded'
        });

        const parser = new IptvPlaylistParser();
        cachedPlaylist = parser.parseM3U(data);
        cacheTime = now;

        console.log(`✅ Parsed ${cachedPlaylist.items.length} channels`);

        // Grupları dinamik olarak oluştur
        const groups = new Set();
        cachedPlaylist.items.forEach(item => {
            const group = item.attributes['group-title'] || 'Diğer';
            groups.add(group);
        });

        console.log(`📺 Found ${groups.size} channel groups: ${[...groups].join(', ')}`);

        // Manifest'e katalogları ekle
        manifest.catalogs = [...groups].map(group => ({
            type: 'tv',
            id: `canli_${Buffer.from(group).toString('base64').replace(/=/g, '')}`,
            name: group,
            extra: [{ name: 'search', isRequired: false }]
        }));

        // Arama katalogu ekle
        manifest.catalogs.unshift({
            type: 'tv',
            id: 'canli_search',
            name: 'Kanal Ara',
            extra: [{ name: 'search', isRequired: true }]
        });

        return cachedPlaylist;
    } catch (error) {
        console.error('❌ Playlist fetch error:', error.message);
        if (cachedPlaylist) {
            console.log('⚠️  Using stale cache');
            return cachedPlaylist;
        }
        throw error;
    }
}

// Catalog handler
builder.defineCatalogHandler(async (args) => {
    try {
        console.log(`📋 Catalog request: ${args.id}, search: ${args.extra?.search || 'none'}`);
        const playlist = await getPlaylist();
        const searchQuery = args.extra?.search?.toLowerCase();

        // Arama katalogu
        if (args.id === 'canli_search' && searchQuery) {
            const filtered = playlist.items.filter(item =>
                item.title.toLowerCase().includes(searchQuery)
            );

            const metas = filtered.map(item => {
                const id = 'canli:' + Buffer.from(item.url).toString('base64').replace(/=/g, '');
                return {
                    id: id,
                    type: 'tv',
                    name: item.title,
                    poster: item.attributes['tvg-logo'] || null,
                    posterShape: 'square',
                    description: `${item.attributes['group-title'] || 'TV'} | ${item.attributes['tvg-country'] || 'TR'}`
                };
            });

            console.log(`🔍 Search results: ${metas.length} channels for "${searchQuery}"`);
            return { metas };
        }

        // Grup katalogu
        const groupId = args.id.replace('canli_', '');
        const groupName = Buffer.from(groupId, 'base64').toString('utf-8');

        let filtered = playlist.items;
        if (groupName) {
            filtered = playlist.items.filter(item => {
                const itemGroup = item.attributes['group-title'] || 'Diğer';
                return itemGroup === groupName;
            });
        }

        // Arama filtresi varsa uygula
        if (searchQuery) {
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(searchQuery)
            );
        }

        const metas = filtered.map(item => {
            const id = 'canli:' + Buffer.from(item.url).toString('base64').replace(/=/g, '');
            return {
                id: id,
                type: 'tv',
                name: item.title,
                poster: item.attributes['tvg-logo'] || null,
                posterShape: 'square',
                description: `${item.attributes['group-title'] || 'TV'} | ${item.attributes['tvg-country'] || 'TR'}`
            };
        });

        console.log(`✅ Catalog: ${metas.length} channels in "${groupName}"`);
        return { metas };
    } catch (error) {
        console.error('❌ Catalog error:', error.message);
        return { metas: [] };
    }
});

// Meta handler
builder.defineMetaHandler(async (args) => {
    try {
        console.log(`📄 Meta request for: ${args.id}`);
        const urlBase64 = args.id.replace('canli:', '');
        const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

        const playlist = await getPlaylist();
        const channel = playlist.items.find(item => item.url === url);

        if (!channel) {
            console.log('⚠️  Channel not found');
            return { meta: null };
        }

        const group = channel.attributes['group-title'] || 'Diğer';
        const country = channel.attributes['tvg-country'] || 'TR';
        const logo = channel.attributes['tvg-logo'] || null;

        // Aynı gruptaki diğer kanalları öneriler olarak ekle
        const recommendations = playlist.items
            .filter(item =>
                item.attributes['group-title'] === group &&
                item.url !== url
            )
            .slice(0, 10)
            .map(item => {
                const id = 'canli:' + Buffer.from(item.url).toString('base64').replace(/=/g, '');
                return {
                    id: id,
                    type: 'tv',
                    name: item.title,
                    poster: item.attributes['tvg-logo'] || null,
                    posterShape: 'square'
                };
            });

        const isNSFW = group.toUpperCase() === 'NSFW';
        const description = isNSFW
            ? `⚠️🔞🔞🔞 » ${group} | ${country} « 🔞🔞🔞⚠️`
            : `» ${group} | ${country} «`;

        const meta = {
            id: args.id,
            type: 'tv',
            name: channel.title,
            poster: logo,
            posterShape: 'square',
            background: logo,
            logo: logo,
            description: description,
            genres: [group],
            country: country,
            recommendations: recommendations
        };

        console.log(`✅ Meta: ${channel.title} (${group})`);
        return { meta };
    } catch (error) {
        console.error('❌ Meta error:', error.message);
        return { meta: null };
    }
});

// Stream handler
builder.defineStreamHandler(async (args) => {
    try {
        console.log(`🎬 Stream request for: ${args.id}`);
        const urlBase64 = args.id.replace('canli:', '');
        const url = Buffer.from(urlBase64, 'base64').toString('utf-8');

        const playlist = await getPlaylist();
        const channel = playlist.items.find(item => item.url === url);

        if (!channel) {
            console.log('⚠️  Channel not found');
            return { streams: [] };
        }

        const streams = [{
            name: 'CanliTV',
            title: channel.title,
            url: channel.url,
            behaviorHints: {
                notWebReady: false,
                bingeGroup: 'canli-tv'
            }
        }];

        // Headers varsa ekle
        if (Object.keys(channel.headers).length > 0) {
            streams[0].behaviorHints.headers = channel.headers;
        }

        console.log(`✅ Stream: ${channel.title}`);
        console.log(`   URL: ${channel.url.substring(0, 60)}...`);
        if (channel.headers['referer']) {
            console.log(`   Referer: ${channel.headers['referer']}`);
        }
        if (channel.headers['user-agent']) {
            console.log(`   User-Agent: ${channel.headers['user-agent'].substring(0, 40)}...`);
        }

        return { streams };
    } catch (error) {
        console.error('❌ Stream error:', error.message);
        return { streams: [] };
    }
});

// İlk başlangıçta playlist'i yükle
(async () => {
    try {
        await getPlaylist();
        console.log('✅ Initial playlist loaded successfully');
    } catch (error) {
        console.error('⚠️  Failed to load initial playlist:', error.message);
    }
})();

// Export builder for multi-addon server
module.exports = builder;
