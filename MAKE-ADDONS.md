# How to Create Stremio Addons

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Addon Structure](#addon-structure)
- [Step-by-Step Tutorial](#step-by-step-tutorial)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Debugging](#debugging)

---

## Overview

This system uses an **instruction-based architecture** where addons don't fetch data directly. Instead, they generate instructions for the Flutter client to fetch data, and then process the results.

### Key Concepts:

1. **Manifest**: Describes your addon (name, description, catalogs, types)
2. **Instruction Handlers**: Generate fetch instructions for the client
3. **Result Processor**: Processes fetched data and returns final results
4. **No Direct HTTP**: Server never fetches content - Flutter does it

---

## Architecture

```
Flutter App ←→ Node.js Server ←→ Your Addon

1. Flutter requests catalog/meta/stream
2. Addon returns fetch INSTRUCTIONS
3. Flutter executes instructions (HTTP requests)
4. Flutter sends back fetched data
5. Addon processes data and returns results
6. Flutter displays content to user
```

### Why This Architecture?

- ✅ **No CORS issues** - Client makes all requests
- ✅ **Better performance** - Parallel fetching
- ✅ **Easier debugging** - Clear separation of concerns
- ✅ **Mobile-friendly** - Works on all platforms

---

## Getting Started

### Prerequisites

```bash
# Node.js 16+ required
node --version

# Install dependencies
npm install
```

### Required Dependencies

```json
{
  "cheerio": "^1.0.0-rc.12",  // HTML parsing
  "express": "^4.18.2",        // Web server
  "cors": "^2.8.5",            // CORS support
  "uuid": "^9.0.1"             // Unique IDs
}
```

---

## Addon Structure

Every addon must have:

```javascript
// 1. MANIFEST - Describes your addon
const manifest = {
    id: 'community.yourname',           // Unique ID
    version: '1.0.0',                   // Version
    name: 'Your Addon Name',            // Display name
    description: 'Description here',     // What it does
    resources: ['catalog', 'meta', 'stream'], // What it provides
    types: ['movie', 'series'],         // Content types
    catalogs: [...],                    // Your catalogs
    idPrefixes: ['yourprefix']          // ID prefix for filtering
};

// 2. INSTRUCTION HANDLERS - Generate fetch instructions
async function handleCatalog(args) { /* ... */ }
async function handleMeta(args) { /* ... */ }
async function handleStream(args) { /* ... */ }

// 3. RESULT PROCESSOR - Process fetched data
async function processFetchResult(fetchResult) { /* ... */ }

// 4. EXPORTS - Make available to server
module.exports = {
    manifest,
    getManifest: () => manifest,
    handleCatalog,
    handleMeta,
    handleStream,
    processFetchResult
};
```

---

## Step-by-Step Tutorial

### Step 1: Create Your Addon File

Create a new file: `my-addon.js`

```javascript
const cheerio = require('cheerio');

// Base URL of the website you're scraping
const BASE_URL = 'https://example.com';
```

### Step 2: Define the Manifest

```javascript
const manifest = {
    id: 'community.example',
    version: '1.0.0',
    name: 'Example Addon',
    description: 'Stream movies and series from Example.com',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    
    // Define catalogs
    catalogs: [
        {
            type: 'movie',
            id: 'example_search',
            name: 'Search',
            extra: [
                { name: 'search', isRequired: true }
            ]
        },
        {
            type: 'movie',
            id: 'example_popular',
            name: 'Popular Movies',
            extra: [
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'example_series',
            name: 'TV Series',
            extra: [
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    
    idPrefixes: ['example']
};
```

### Step 3: Implement Catalog Handler

```javascript
async function handleCatalog(args) {
    console.log('📋 Catalog request:', args);
    
    const catalogId = args.id;
    const searchQuery = args.extra?.search;
    const skip = parseInt(args.extra?.skip || 0);
    const page = Math.floor(skip / 20) + 1;
    
    // Generate unique request ID
    const requestId = `example-catalog-${catalogId}-${Date.now()}`;
    
    // SEARCH CATALOG
    if (catalogId === 'example_search') {
        if (!searchQuery) {
            return { instructions: [] };
        }
        
        return {
            instructions: [{
                requestId,
                purpose: 'catalog_search',
                url: `${BASE_URL}/search?q=${encodeURIComponent(searchQuery)}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }]
        };
    }
    
    // POPULAR CATALOG
    if (catalogId === 'example_popular') {
        return {
            instructions: [{
                requestId,
                purpose: 'catalog_popular',
                url: `${BASE_URL}/popular?page=${page}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }]
        };
    }
    
    // Unknown catalog
    return { instructions: [] };
}
```

### Step 4: Implement Meta Handler

```javascript
async function handleMeta(args) {
    console.log('📺 Meta request:', args);
    
    // Decode URL from ID
    // Format: example:base64url
    const url = Buffer.from(args.id.replace('example:', ''), 'base64').toString('utf-8');
    
    const requestId = `example-meta-${Date.now()}`;
    
    return {
        instructions: [{
            requestId,
            purpose: 'meta',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }]
    };
}
```

### Step 5: Implement Stream Handler

```javascript
async function handleStream(args) {
    console.log('🎬 Stream request:', args);
    
    // Decode URL from ID
    const url = Buffer.from(args.id.replace('example:', ''), 'base64').toString('utf-8');
    
    const requestId = `example-stream-${Date.now()}`;
    
    return {
        instructions: [{
            requestId,
            purpose: 'stream',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }]
    };
}
```

### Step 6: Implement Result Processor

This is where the magic happens - processing fetched HTML and extracting data.

```javascript
async function processFetchResult(fetchResult) {
    const { purpose, body, url } = fetchResult;
    
    console.log(`⚙️ Processing: ${purpose}`);
    
    // ========== CATALOG PROCESSING ==========
    if (purpose === 'catalog_search' || purpose === 'catalog_popular') {
        try {
            const $ = cheerio.load(body);
            const metas = [];
            
            // Parse HTML and extract items
            $('.movie-item').each((i, elem) => {
                const title = $(elem).find('.title').text().trim();
                const href = $(elem).find('a').attr('href');
                const poster = $(elem).find('img').attr('src');
                
                if (title && href) {
                    // Create base64 ID
                    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                    const id = 'example:' + Buffer.from(fullUrl).toString('base64');
                    
                    metas.push({
                        id: id,
                        type: 'movie',
                        name: title,
                        poster: poster || null
                    });
                }
            });
            
            console.log(`✅ Found ${metas.length} items`);
            return { metas };
            
        } catch (e) {
            console.log('⚠️ Catalog error:', e.message);
            return { metas: [] };
        }
    }
    
    // ========== META PROCESSING ==========
    if (purpose === 'meta') {
        try {
            const $ = cheerio.load(body);
            
            // Extract metadata
            const title = $('h1.title').text().trim();
            const poster = $('img.poster').attr('src');
            const description = $('p.description').text().trim();
            const year = $('span.year').text().trim();
            const rating = $('span.rating').text().trim();
            
            // Extract genres
            const genres = [];
            $('a.genre').each((i, elem) => {
                genres.push($(elem).text().trim());
            });
            
            // Extract cast
            const cast = [];
            $('a.actor').each((i, elem) => {
                cast.push($(elem).text().trim());
            });
            
            // Check if it's a series
            const isSeries = $('.episode-list').length > 0;
            
            if (isSeries) {
                // Extract episodes
                const videos = [];
                
                $('.episode-item').each((i, elem) => {
                    const epName = $(elem).find('.ep-title').text().trim();
                    const epHref = $(elem).find('a').attr('href');
                    const epNum = $(elem).find('.ep-number').text().trim();
                    
                    if (epName && epHref) {
                        const fullUrl = epHref.startsWith('http') ? epHref : `${BASE_URL}${epHref}`;
                        const episodeId = Buffer.from(fullUrl).toString('base64');
                        
                        videos.push({
                            id: `example:${episodeId}`,
                            title: epName,
                            season: 1,  // Parse from HTML if available
                            episode: parseInt(epNum) || i + 1
                        });
                    }
                });
                
                return {
                    meta: {
                        id: args.id,
                        type: 'series',
                        name: title,
                        poster: poster,
                        background: poster,
                        description: description,
                        releaseInfo: year,
                        imdbRating: rating,
                        genres: genres,
                        cast: cast,
                        videos: videos
                    }
                };
                
            } else {
                // Movie
                return {
                    meta: {
                        id: args.id,
                        type: 'movie',
                        name: title,
                        poster: poster,
                        background: poster,
                        description: description,
                        releaseInfo: year,
                        imdbRating: rating,
                        genres: genres,
                        cast: cast
                    }
                };
            }
            
        } catch (e) {
            console.log('⚠️ Meta error:', e.message);
            return { meta: null };
        }
    }
    
    // ========== STREAM PROCESSING ==========
    if (purpose === 'stream') {
        try {
            const $ = cheerio.load(body);
            const streams = [];
            
            // Extract video sources
            $('source.video-source').each((i, elem) => {
                const videoUrl = $(elem).attr('src');
                const quality = $(elem).attr('data-quality') || 'HD';
                
                if (videoUrl) {
                    streams.push({
                        name: `Example - ${quality}`,
                        title: `Example - ${quality}`,
                        url: videoUrl,
                        type: 'm3u8',  // or 'mp4'
                        behaviorHints: {
                            notWebReady: false
                        }
                    });
                }
            });
            
            console.log(`✅ Found ${streams.length} stream(s)`);
            return { streams };
            
        } catch (e) {
            console.log('⚠️ Stream error:', e.message);
            return { streams: [] };
        }
    }
    
    return { ok: true };
}
```

### Step 7: Export Your Addon

```javascript
module.exports = {
    manifest,
    getManifest: () => manifest,
    handleCatalog,
    handleMeta,
    handleStream,
    processFetchResult
};
```

### Step 8: Register in Server

Edit `server.js` and add your addon:

```javascript
const addonModules = {
    // ... existing addons
    'example': require('./my-addon.js')  // Add this line
};
```

### Step 9: Test Your Addon

```bash
# Start server
npm start

# Test endpoints
curl http://localhost:3000/api/addon/example/manifest.json
curl -X POST http://localhost:3000/api/addon/example/catalog \
  -H "Content-Type: application/json" \
  -d '{"id":"example_popular"}'
```

---

## API Reference

### Manifest Object

```javascript
{
    id: String,              // Unique identifier (e.g., 'community.example')
    version: String,         // Semantic version (e.g., '1.0.0')
    name: String,           // Display name
    description: String,     // Short description
    resources: Array,        // ['catalog', 'meta', 'stream']
    types: Array,           // ['movie', 'series', 'tv', 'channel']
    catalogs: Array,        // Catalog definitions
    idPrefixes: Array       // Prefixes for your IDs
}
```

### Catalog Definition

```javascript
{
    type: String,           // 'movie', 'series', 'tv', 'channel'
    id: String,            // Unique catalog ID
    name: String,          // Display name
    extra: [               // Additional parameters
        {
            name: 'search',      // Parameter name
            isRequired: Boolean  // Is it required?
        },
        {
            name: 'skip',        // For pagination
            isRequired: false
        }
    ]
}
```

### Instruction Object

```javascript
{
    requestId: String,      // Unique request ID
    purpose: String,        // What this fetch is for
    url: String,           // URL to fetch
    method: String,        // 'GET' or 'POST'
    headers: Object,       // HTTP headers
    body: String,          // Request body (for POST)
    metadata: Object       // Custom data to pass through
}
```

### Meta Object

```javascript
{
    id: String,            // Unique ID with prefix
    type: String,          // 'movie', 'series', 'tv', 'channel'
    name: String,          // Title
    poster: String,        // Poster URL
    background: String,    // Background URL
    description: String,   // Description
    releaseInfo: String,   // Year or date
    imdbRating: String,    // Rating (e.g., '8.5')
    genres: Array,         // ['Action', 'Drama']
    cast: Array,           // ['Actor 1', 'Actor 2']
    director: String,      // Director name
    trailer: String,       // Trailer URL
    runtime: String,       // Duration (e.g., '2h 30m')
    
    // For series only
    videos: [
        {
            id: String,        // Episode ID
            title: String,     // Episode title
            season: Number,    // Season number
            episode: Number    // Episode number
        }
    ],
    
    // Recommendations
    recommendations: Array  // Similar metas
}
```

### Stream Object

```javascript
{
    name: String,          // Display name
    title: String,         // Title
    url: String,          // Stream URL
    type: String,         // 'm3u8', 'mp4', 'mkv', etc.
    
    // Optional
    subtitles: [
        {
            lang: String,     // 'en', 'tr', etc.
            url: String      // Subtitle URL
        }
    ],
    
    behaviorHints: {
        notWebReady: Boolean,  // true if not playable in browser
        bingeGroup: String     // Group related streams
    }
}
```

---

## Examples

### Example 1: Simple Movie Catalog

```javascript
async function handleCatalog(args) {
    if (args.id === 'my_movies') {
        return {
            instructions: [{
                requestId: `req-${Date.now()}`,
                purpose: 'catalog',
                url: 'https://example.com/movies',
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            }]
        };
    }
}

async function processFetchResult({ purpose, body }) {
    if (purpose === 'catalog') {
        const $ = cheerio.load(body);
        const metas = [];
        
        $('.movie').each((i, elem) => {
            metas.push({
                id: 'my:' + Buffer.from($(elem).find('a').attr('href')).toString('base64'),
                type: 'movie',
                name: $(elem).find('.title').text(),
                poster: $(elem).find('img').attr('src')
            });
        });
        
        return { metas };
    }
}
```

### Example 2: Multi-Step Stream Extraction

Sometimes you need multiple steps to get the final stream URL.

```javascript
async function handleStream(args) {
    const url = Buffer.from(args.id.replace('my:', ''), 'base64').toString('utf-8');
    
    return {
        instructions: [{
            requestId: `stream-step1-${Date.now()}`,
            purpose: 'stream_step1',
            url: url,
            method: 'GET'
        }]
    };
}

async function processFetchResult({ purpose, body }) {
    // Step 1: Get video page
    if (purpose === 'stream_step1') {
        const $ = cheerio.load(body);
        const videoId = $('input[name="video_id"]').val();
        
        // Return instructions for step 2
        return {
            instructions: [{
                requestId: `stream-step2-${Date.now()}`,
                purpose: 'stream_step2',
                url: 'https://example.com/get-video',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `video_id=${videoId}`
            }]
        };
    }
    
    // Step 2: Get actual stream URL
    if (purpose === 'stream_step2') {
        const data = JSON.parse(body);
        
        return {
            streams: [{
                name: 'Example HD',
                url: data.stream_url,
                type: 'm3u8'
            }]
        };
    }
}
```

### Example 3: Passing Metadata Between Steps

```javascript
async function processFetchResult({ purpose, body, metadata }) {
    if (purpose === 'get_player_page') {
        const $ = cheerio.load(body);
        const iframeUrl = $('iframe').attr('src');
        
        return {
            instructions: [{
                requestId: `extract-${Date.now()}`,
                purpose: 'extract_stream',
                url: iframeUrl,
                method: 'GET',
                metadata: {
                    sourceName: metadata.originalSource,  // Pass through
                    quality: 'HD'                         // Add new data
                }
            }]
        };
    }
    
    if (purpose === 'extract_stream') {
        // Use the metadata
        const streamUrl = extractUrlFromBody(body);
        
        return {
            streams: [{
                name: metadata.sourceName,  // From previous step
                title: `${metadata.sourceName} - ${metadata.quality}`,
                url: streamUrl,
                type: 'm3u8'
            }]
        };
    }
}
```

---

## Best Practices

### 1. Error Handling

Always wrap in try-catch:

```javascript
async function processFetchResult({ purpose, body }) {
    try {
        const $ = cheerio.load(body);
        // ... your logic
        return { metas };
    } catch (e) {
        console.log('⚠️ Error:', e.message);
        return { metas: [] };  // Return empty instead of crashing
    }
}
```

### 2. Logging

Use descriptive logs:

```javascript
console.log(`\n🎯 [MyAddon] Catalog request`);
console.log(`   Catalog ID: ${catalogId}`);
console.log(`   Page: ${page}`);
console.log(`✅ Found ${metas.length} items`);
```

### 3. ID Encoding

Always use base64 for URLs:

```javascript
// Encode
const id = 'prefix:' + Buffer.from(url).toString('base64').replace(/=/g, '');

// Decode
const url = Buffer.from(id.replace('prefix:', ''), 'base64').toString('utf-8');
```

### 4. User Agents

Use realistic user agents:

```javascript
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0';
```

### 5. Pagination

Handle pagination properly:

```javascript
const skip = parseInt(args.extra?.skip || 0);
const itemsPerPage = 20;
const page = Math.floor(skip / itemsPerPage) + 1;
```

### 6. Request IDs

Make them unique and traceable:

```javascript
const randomId = Math.random().toString(36).substring(2, 10);
const requestId = `${addonId}-${purpose}-${Date.now()}-${randomId}`;
```

### 7. Fallbacks

Provide fallbacks for missing data:

```javascript
const poster = $('img.poster').attr('src') || 
              $('img.thumbnail').attr('src') || 
              null;

const description = $('p.desc').text().trim() || 
                   'No description available';
```

---

## Debugging

### Enable Verbose Logging

```javascript
const DEBUG = true;

function log(...args) {
    if (DEBUG) console.log(...args);
}
```

### Test Individual Functions

```javascript
// Test catalog
handleCatalog({ id: 'my_catalog', extra: {} })
    .then(result => console.log('Instructions:', result));

// Test with mock data
const mockFetchResult = {
    purpose: 'catalog',
    body: '<html>...</html>',
    url: 'https://example.com'
};

processFetchResult(mockFetchResult)
    .then(result => console.log('Result:', result));
```

### Common Issues

#### 1. Empty Results

```javascript
// Check if selector is correct
const $ = cheerio.load(body);
console.log('HTML length:', body.length);
console.log('Found items:', $('.movie-item').length);
```

#### 2. Encoding Issues

```javascript
// Log encoded/decoded IDs
const id = 'prefix:' + Buffer.from(url).toString('base64');
console.log('Original URL:', url);
console.log('Encoded ID:', id);
const decoded = Buffer.from(id.replace('prefix:', ''), 'base64').toString('utf-8');
console.log('Decoded URL:', decoded);
console.log('Match:', url === decoded);
```

#### 3. Missing Data

```javascript
// Log HTML structure
console.log('Body preview:', body.substring(0, 500));
console.log('Title:', $('h1.title').text());
console.log('Title length:', $('h1.title').length);
```

---

## Advanced Topics

### Handling Dynamic Content

Some sites use JavaScript to load content. In such cases:

```javascript
// Return instructions for the client to handle
return {
    instructions: [{
        requestId,
        purpose: 'dynamic_page',
        url: pageUrl,
        method: 'GET',
        metadata: {
            requiresJS: true  // Hint for client
        }
    }]
};
```

### Custom Extractors

For common video hosts, use the video-extractors module:

```javascript
// In processFetchResult
if (iframeUrl.includes('rapidvideo')) {
    return {
        instructions: [{
            requestId,
            purpose: 'extract_rapidvideo',  // Will be handled by video-extractors.js
            url: iframeUrl,
            method: 'GET'
        }]
    };
}
```

### Caching Strategy

The server doesn't implement caching, but you can hint the client:

```javascript
return {
    streams: [/*...*/],
    cacheMaxAge: 3600,  // Cache for 1 hour
    staleRevalidate: 600,  // Revalidate after 10 minutes
    staleError: 86400  // Serve stale on error for 24 hours
};
```

---

## Complete Example

Here's a complete, production-ready addon:

```javascript
const cheerio = require('cheerio');

const BASE_URL = 'https://example.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const manifest = {
    id: 'community.example',
    version: '1.0.0',
    name: 'Example Addon',
    description: 'Stream content from Example.com',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'example_popular',
            name: 'Popular Movies',
            extra: [{ name: 'skip', isRequired: false }]
        }
    ],
    idPrefixes: ['example']
};

async function handleCatalog(args) {
    const page = Math.floor(parseInt(args.extra?.skip || 0) / 20) + 1;
    
    return {
        instructions: [{
            requestId: `example-catalog-${Date.now()}`,
            purpose: 'catalog',
            url: `${BASE_URL}/movies?page=${page}`,
            method: 'GET',
            headers: { 'User-Agent': USER_AGENT }
        }]
    };
}

async function handleMeta(args) {
    const url = Buffer.from(args.id.replace('example:', ''), 'base64').toString('utf-8');
    
    return {
        instructions: [{
            requestId: `example-meta-${Date.now()}`,
            purpose: 'meta',
            url: url,
            method: 'GET',
            headers: { 'User-Agent': USER_AGENT }
        }]
    };
}

async function handleStream(args) {
    const url = Buffer.from(args.id.replace('example:', ''), 'base64').toString('utf-8');
    
    return {
        instructions: [{
            requestId: `example-stream-${Date.now()}`,
            purpose: 'stream',
            url: url,
            method: 'GET',
            headers: { 'User-Agent': USER_AGENT }
        }]
    };
}

async function processFetchResult({ purpose, body, url }) {
    try {
        const $ = cheerio.load(body);
        
        if (purpose === 'catalog') {
            const metas = [];
            
            $('.movie-card').each((i, elem) => {
                const title = $(elem).find('.title').text().trim();
                const href = $(elem).find('a').attr('href');
                const poster = $(elem).find('img').attr('src');
                
                if (title && href) {
                    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                    metas.push({
                        id: 'example:' + Buffer.from(fullUrl).toString('base64'),
                        type: 'movie',
                        name: title,
                        poster: poster
                    });
                }
            });
            
            console.log(`✅ Found ${metas.length} movies`);
            return { metas };
        }
        
        if (purpose === 'meta') {
            const meta = {
                id: 'example:' + Buffer.from(url).toString('base64'),
                type: 'movie',
                name: $('h1.title').text().trim(),
                poster: $('img.poster').attr('src'),
                description: $('p.description').text().trim(),
                releaseInfo: $('span.year').text().trim(),
                imdbRating: $('span.rating').text().trim(),
                genres: []
            };
            
            $('a.genre').each((i, elem) => {
                meta.genres.push($(elem).text().trim());
            });
            
            console.log(`✅ Meta: ${meta.name}`);
            return { meta };
        }
        
        if (purpose === 'stream') {
            const streams = [];
            const videoUrl = $('video source').attr('src');
            
            if (videoUrl) {
                streams.push({
                    name: 'Example HD',
                    url: videoUrl,
                    type: 'm3u8',
                    behaviorHints: { notWebReady: false }
                });
            }
            
            console.log(`✅ Found ${streams.length} stream(s)`);
            return { streams };
        }
        
    } catch (e) {
        console.log(`⚠️ Error in ${purpose}:`, e.message);
        return purpose === 'catalog' ? { metas: [] } :
               purpose === 'meta' ? { meta: null } :
               { streams: [] };
    }
    
    return { ok: true };
}

module.exports = {
    manifest,
    getManifest: () => manifest,
    handleCatalog,
    handleMeta,
    handleStream,
    processFetchResult
};
```

---

## Need Help?

1. Check existing addons in the project for reference
2. Test your HTML selectors with Cheerio playground
3. Use browser DevTools to inspect target website
4. Enable verbose logging during development
5. Test each function independently before integration

Happy coding! 🚀

