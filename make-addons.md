🛠️ Kendi Addon'ınızı Yazma
Bu proje Instruction Mode kullanmaktadır. Bu modda, addon'unuz direkt HTTP istekleri yapmak yerine, Flutter uygulamasına "instruction" (talimat) gönderir ve Flutter bu talimatlara göre fetch işlemlerini gerçekleştirir.

📖 Temel Yapı
Her addon dosyası aşağıdaki bileşenlere sahip olmalıdır:

const cheerio = require('cheerio');

// 1. MANIFEST TANIMI
const manifest = {
    id: 'community.youraddon',
    version: '1.0.0',
    name: 'Your Addon Name',
    description: 'Addon açıklaması',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series', 'tv'],
    catalogs: [
        {
            type: 'movie',
            id: 'youraddon_movies',
            name: 'Filmler',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'youraddon_search',
            name: 'Arama',
            extra: [
                { name: 'search', isRequired: true },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['youraddon']
};

const BASE_URL = 'https://example.com';

// 2. INSTRUCTION HANDLERS
async function handleCatalog(args) {
    const catalogId = args.id;
    const searchQuery = args.extra?.search;
    const randomId = Math.random().toString(36).substring(2, 10);
    
    // Search için
    if (catalogId === 'youraddon_search' && searchQuery) {
        return {
            instructions: [{
                requestId: `youraddon-search-${Date.now()}-${randomId}`,
                purpose: 'catalog',
                url: `${BASE_URL}/search?q=${encodeURIComponent(searchQuery)}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }]
        };
    }
    
    // Normal katalog için
    return {
        instructions: [{
            requestId: `youraddon-catalog-${Date.now()}-${randomId}`,
            purpose: 'catalog',
            url: `${BASE_URL}/movies`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }]
    };
}

async function handleMeta(args) {
    const url = Buffer.from(args.id.replace('youraddon:', ''), 'base64').toString('utf-8');
    const randomId = Math.random().toString(36).substring(2, 10);
    
    return {
        instructions: [{
            requestId: `youraddon-meta-${Date.now()}-${randomId}`,
            purpose: 'meta',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }]
    };
}

async function handleStream(args) {
    const url = Buffer.from(args.id.replace('youraddon:', ''), 'base64').toString('utf-8');
    const randomId = Math.random().toString(36).substring(2, 10);
    
    return {
        instructions: [{
            requestId: `youraddon-stream-${Date.now()}-${randomId}`,
            purpose: 'stream',
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }]
    };
}

// 3. FETCH RESULT PROCESSOR
async function processFetchResult(fetchResult) {
    const { purpose, body, url } = fetchResult;
    
    if (purpose === 'catalog') {
        const $ = cheerio.load(body);
        const metas = [];
        
        $('.movie-item').each((i, elem) => {
            const title = $(elem).find('.title').text().trim();
            const href = $(elem).find('a').attr('href');
            const poster = $(elem).find('img').attr('src');
            
            if (title && href) {
                const id = 'youraddon:' + Buffer.from(href).toString('base64').replace(/=/g, '');
                metas.push({
                    id: id,
                    type: 'movie',
                    name: title,
                    poster: poster || null
                });
            }
        });
        
        return { metas };
    }
    
    if (purpose === 'meta') {
        const $ = cheerio.load(body);
        
        const meta = {
            id: 'youraddon:' + Buffer.from(url).toString('base64').replace(/=/g, ''),
            type: 'movie',
            name: $('.movie-title').text().trim(),
            poster: $('.movie-poster img').attr('src'),
            description: $('.description').text().trim(),
            releaseInfo: $('.year').text().trim(),
            imdbRating: $('.rating').text().trim(),
            genres: [],
            cast: []
        };
        
        return { meta };
    }
    
    if (purpose === 'stream') {
        const $ = cheerio.load(body);
        const streams = [];
        
        // M3U8 link bul
        const m3u8Match = body.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
        
        if (m3u8Match) {
            streams.push({
                name: 'Your Addon',
                title: 'HD Server',
                url: m3u8Match[0],
                type: 'm3u8',
                behaviorHints: {
                    notWebReady: false
                }
            });
        }
        
        return { streams };
    }
    
    return { ok: true };
}

// 4. EXPORT
module.exports = {
    manifest,
    getManifest: () => manifest,
    handleCatalog,
    handleMeta,
    handleStream,
    processFetchResult
};
🔧 Önemli Kavramlar
1. Manifest Tanımı
Manifest, addon'unuzun kimliğini ve yeteneklerini tanımlar:

id: Benzersiz addon ID (örn: community.youraddon)
version: Addon versiyonu (semver formatında)
name: Kullanıcının göreceği isim
resources: Desteklenen kaynaklar (catalog, meta, stream)
types: Desteklenen içerik tipleri (movie, series, tv)
catalogs: Katalog tanımları
idPrefixes: ID prefix'leri (addon ID'lerinde kullanılır)
2. Instruction Handlers
Bu fonksiyonlar, Flutter'a fetch instruction'ları döndürür:

handleCatalog(args)

Film/dizi listelerini getirmek için kullanılır
args.id: Katalog ID'si
args.extra.search: Arama sorgusu (varsa)
args.extra.skip: Sayfalama için skip değeri
handleMeta(args)

Film/dizi detaylarını getirmek için kullanılır
args.id: Item ID'si (genellikle base64 encode edilmiş URL)
Series için videos array'i döndürmelisiniz (bölümler için)
handleStream(args)

Video stream linklerini getirmek için kullanılır
args.id: Item veya episode ID'si
Stream URL'lerini döndürür
3. Instruction Formatı
Her instruction şu alanlara sahip olmalıdır:

{
    requestId: 'unique-request-id',  // Benzersiz ID
    purpose: 'catalog|meta|stream',  // Amaç
    url: 'https://...',              // Fetch edilecek URL
    method: 'GET|POST',              // HTTP metodu
    headers: {                       // HTTP headers
        'User-Agent': '...',
        'Referer': '...'
    },
    body: 'request body',            // POST için (opsiyonel)
    metadata: {                      // Ek metadata (opsiyonel)
        // Instruction chain için gerekli data
    }
}
4. Instruction Chaining
Birden fazla fetch gerekiyorsa, instruction chain kullanabilirsiniz:

// İlk fetch
async function processFetchResult(fetchResult) {
    if (fetchResult.purpose === 'stream') {
        // Önce iframe sayfasını al
        return {
            instructions: [{
                requestId: 'extract-iframe-' + Date.now(),
                purpose: 'extract_iframe',
                url: iframeUrl,
                method: 'GET',
                headers: { 'User-Agent': '...' }
            }]
        };
    }
    
    // İkinci fetch - iframe içindeki m3u8'i al
    if (fetchResult.purpose === 'extract_iframe') {
        const $ = cheerio.load(fetchResult.body);
        const m3u8Url = $('video').attr('src');
        
        return {
            streams: [{
                name: 'Server',
                url: m3u8Url,
                type: 'm3u8'
            }]
        };
    }
}
5. ID Encoding
Addon ID'leri genellikle URL'leri base64 encode ederek oluşturulur:

// Encoding
const id = 'youraddon:' + Buffer.from(url).toString('base64').replace(/=/g, '');

// Decoding
const url = Buffer.from(args.id.replace('youraddon:', ''), 'base64').toString('utf-8');
📚 Gelişmiş Özellikler
Video Extractors
Popüler video hostlar için extractor'lar yazabilirsiniz:

async function processFetchResult(fetchResult) {
    // RapidVid extraction
    if (fetchResult.purpose === 'extract_rapidvid') {
        const encodedMatch = fetchResult.body.match(/av\('([^']+)'\)/);
        if (encodedMatch) {
            const m3u8Url = decodeRapidVid(encodedMatch[1]);
            return {
                streams: [{
                    name: 'RapidVid',
                    url: m3u8Url,
                    type: 'm3u8'
                }]
            };
        }
    }
}
Altyazı Desteği
streams.push({
    name: 'Server',
    url: m3u8Url,
    type: 'm3u8',
    subtitles: [
        {
            id: 'tr',
            url: 'https://example.com/subtitle.vtt',
            lang: 'Türkçe'
        },
        {
            id: 'en',
            url: 'https://example.com/subtitle-en.vtt',
            lang: 'English'
        }
    ]
});
POST İstekleri
async function handleCatalog(args) {
    return {
        instructions: [{
            requestId: 'post-request-' + Date.now(),
            purpose: 'catalog',
            url: 'https://api.example.com/search',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
                query: args.extra?.search,
                page: 1
            })
        }]
    };
}
AES Decryption
Encrypted API'lar için:

const crypto = require('crypto');

function decryptAES(encryptedData, key) {
    const algorithm = 'aes-128-cbc';
    const keyBuffer = Buffer.from(key, 'utf8');
    const ivBuffer = Buffer.from(key, 'utf8');
    
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}
🎯 Best Practices
Unique Request ID'ler kullanın: Her instruction için benzersiz bir requestId oluşturun
Purpose değerlerini açıklayıcı yapın: catalog, meta, stream, extract_vidmoxy gibi
Metadata kullanın: Instruction chain'de data taşımak için metadata alanını kullanın
Error handling: try-catch blokları kullanın ve hataları loglayın
Console logging: Debug için detaylı console.log kullanın
User-Agent: Her request'te gerçekçi User-Agent header'ı gönderin
Referer: Gerektiğinde Referer header'ı ekleyin (anti-bot bypass için)
📝 Test Etme
Addon'unuzu test etmek için:

Dosyanızı proje klasörüne ekleyin (örn: my-addon.js)
server.js dosyasını güncelleyin:
// server.js içinde
const myAddon = require('./my-addon.js');

const ADDONS = {
    'myaddon': myAddon,
    'fullhdfilmizlesene': addonNew,
    // ... diğer addon'lar
};
Sunucuyu yeniden başlatın: npm start
Manifest URL'yi test edin: http://localhost:3000/api/addon/myaddon/manifest.json
Stremio'ya ekleyin ve test edin
🔍 Debug İpuçları
Addon'unuz çalışmıyorsa:

Server loglarını kontrol edin: Console.log'larınızı takip edin
Manifest'i kontrol edin: Tarayıcıda manifest URL'yi açın
Network tab kullanın: Chrome DevTools'da request/response'ları inceleyin
HTML yapısını kontrol edin: Cheerio selector'larınızın doğru olduğundan emin olun
Instruction chain'i takip edin: Purpose değerlerini logla ve chain'i kontrol edin
📖 Örnek Addon'lar
Referans için mevcut addon'lara bakın:

addon-new.js: Film sitesi, çoklu video extractor'lar
dizipal.js: Dizi sitesi, iframe extraction, m3u8 detection
animecix-addon.js: API tabanlı, TauVideo extraction
inat-new.js: Encrypted API, AES decryption, live TV
hdfilmcehennemi-addon.js: Packed JS unpacking, dcHello decoder
🚀 Addon'unuzu Paylaşma
Addon'unuzu tamamladıktan sonra:

GitHub'a push edin
Pull Request açın
README'ye addon'unuzu ekleyin
Toplulukla paylaşın!
İyi geliştirmeler! 🎉

📝 License
MIT License - Detaylar için LICENSE dosyasına bakın.

🤝 Katkıda Bulunma
Fork edin
Feature branch oluşturun (git checkout -b feature/amazing-feature)
Commit edin (git commit -m 'Add some amazing feature')
Push edin (git push origin feature/amazing-feature)
Pull Request açın
📧 İletişim
Sorularınız için issue açabilirsiniz.

Made with ❤️ for Turkish Stremio Users
