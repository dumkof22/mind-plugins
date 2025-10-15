# 🎬 Stremio Turkish Addons - Multi-Addon Server

Tüm Türkçe Stremio eklentileri tek sunucuda! Bu proje, birden fazla Stremio addon'unu tek bir Node.js sunucusunda barındıran gelişmiş bir proxy sistemidir.

## 📦 Eklentiler

1. **🎥 FullHDFilmizlesene** - Türkçe ve yabancı filmler
2. **🎬 InatBox** - Premium platform içerikleri (Netflix, Disney+, HBO, vb.) ve canlı TV
3. **📺 DiziPal** - Türkçe diziler ve filmler
4. **⚽ SelcukSports HD** - Canlı spor kanalları

## 🚀 Render.com'da Deploy Etme

### Otomatik Deploy (Önerilen)

1. GitHub'a repo'yu push edin
2. [Render.com](https://render.com) hesabınıza giriş yapın
3. **New +** → **Web Service** seçin
4. GitHub repo'nuzu bağlayın
5. Ayarlar otomatik olarak `render.yaml` dosyasından okunacaktır
6. **Create Web Service** butonuna tıklayın

### Manuel Deploy

Eğer `render.yaml` kullanmak istemiyorsanız:

1. **New +** → **Web Service**
2. Ayarları yapın:
   - **Name:** `stremio-turkish-addons` (veya istediğiniz isim)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free` (veya istediğiniz plan)

3. Environment Variables ekleyin:
   ```
   NODE_ENV=production
   PORT=7000
   ```

4. **Create Web Service** butonuna tıklayın

### Deploy Sonrası

Deploy tamamlandıktan sonra:

1. Render size bir URL verecek (örn: `https://your-app.onrender.com`)
2. Bu URL'e giderek web arayüzünü görüntüleyin
3. Her addon için manifest URL'lerini kopyalayın
4. Stremio'ya ekleyin

## 🔧 Yerel Kurulum

```bash
# Projeyi klonlayın
git clone https://github.com/yourusername/inatstremioplugin.git
cd inatstremioplugin

# Bağımlılıkları yükleyin
npm install

# Sunucuyu başlatın
npm start
```

Sunucu `http://localhost:3000` adresinde çalışacaktır.

## 📱 Stremio'ya Ekleme

### Yöntem 1: Web Arayüzünden

1. Sunucu URL'nizi açın (örn: `https://your-app.onrender.com`)
2. İstediğiniz addon için **Manifest URL'yi Kopyala** butonuna tıklayın
3. Stremio → Addons → Arama çubuğuna yapıştırın
4. Install butonuna tıklayın

### Yöntem 2: Direkt Link

Manifest URL formatı:
```
https://your-app.onrender.com/api/addon/{addonId}/manifest.json
```

Addon ID'leri:
- `fullhdfilmizlesene`
- `inatbox`
- `dizipal`
- `selcuksports`

## 🔍 API Endpoints

### Genel Endpoints

- `GET /` - Web arayüzü
- `GET /health` - Sunucu durumu
- `GET /api/addons` - Tüm addon listesi

### Addon-Specific Endpoints

- `GET /api/addon/:addonId/manifest.json` - Addon manifest'i
- `POST /api/addon/:addonId/catalog` - Katalog verisi
- `POST /api/addon/:addonId/meta` - Meta verisi
- `POST /api/addon/:addonId/stream` - Stream verileri
- `POST /api/addon/:addonId/parse` - Flutter'dan fetch sonuçları

## 🛠️ Teknik Detaylar

### Özellikler

- ✅ Multi-addon desteği (4 addon tek sunucuda)
- ✅ Web arayüzü ile kolay erişim
- ✅ Request queue sistemi (eşzamanlı istek yönetimi)
- ✅ Session management
- ✅ CloudFlare bypass desteği (axios + waitUntil)
- ✅ Health check endpoint
- ✅ NDJSON streaming response
- ✅ Otomatik timeout cleanup

### Mimari

```
Flutter App (WebView) ←→ Node.js Server ←→ Addon Modules
                             ↓
                      CloudFlare Bypass
                      (Axios + Headers)
```

### Request Flow

1. Flutter uygulaması catalog/meta/stream isteği gönderir
2. Server isteği ilgili addon modülüne yönlendirir
3. Addon, server'a fetch istekleri gönderir:
   - `waitUntil` varsa → Axios (backend'de CloudFlare bypass)
   - `waitUntil` yoksa → Flutter'a fetch isteği gönderilir
4. Sonuçlar NDJSON formatında stream edilir
5. Flutter parse endpoint'ine sonuçları gönderir

## 📋 Environment Variables

| Variable | Default | Açıklama |
|----------|---------|----------|
| `NODE_ENV` | `development` | Çalışma ortamı |
| `PORT` | `3000` | Sunucu portu |
| `DIZIPAL_START_NUMBER` | - | DiziPal başlangıç numarası |
| `DIZIPAL_MAX_RETRIES` | `50` | DiziPal maksimum deneme sayısı |
| `SELCUK_MAX_RETRIES` | `10` | SelcukSports maksimum deneme sayısı |
| `SELCUK_URL` | - | SelcukSports URL override |

## 🐛 Troubleshooting

### Render.com'da "Service Unavailable"

- Health check endpoint'ini kontrol edin: `https://your-app.onrender.com/health`
- Logs'lara bakın: Render Dashboard → Logs sekmesi
- PORT environment variable'ın doğru olduğundan emin olun

### Addon Stremio'da görünmüyor

- Manifest URL'yi kontrol edin (tarayıcıda açın)
- CORS hatası varsa server loglarına bakın
- Network tab'inde manifest isteğinin başarılı olduğundan emin olun

### Stream oynatılmıyor

- Flutter uygulamasının WebView kullandığından emin olun
- Parse endpoint'inin çalıştığını kontrol edin
- Server loglarında fetch timeout olup olmadığına bakın

## 📂 Proje Yapısı

```
inatstremioplugin/
├── server.js                # Ana sunucu
├── addon-new.js             # FullHDFilmizlesene addon
├── inat-new.js              # InatBox addon
├── dizipal.js               # DiziPal addon
├── selcuk.js                # SelcukSports addon
├── public/
│   └── index.html           # Web arayüzü
├── render.yaml              # Render.com config
├── package.json             # Dependencies
└── README.md                # Bu dosya
```

## 🛠️ Kendi Addon'ınızı Yazma

Bu proje **Instruction Mode** kullanmaktadır. Bu modda, addon'unuz direkt HTTP istekleri yapmak yerine, Flutter uygulamasına "instruction" (talimat) gönderir ve Flutter bu talimatlara göre fetch işlemlerini gerçekleştirir.

### 📖 Temel Yapı

Her addon dosyası aşağıdaki bileşenlere sahip olmalıdır:

```javascript
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
```

### 🔧 Önemli Kavramlar

#### 1. **Manifest Tanımı**

Manifest, addon'unuzun kimliğini ve yeteneklerini tanımlar:

- **id**: Benzersiz addon ID (örn: `community.youraddon`)
- **version**: Addon versiyonu (semver formatında)
- **name**: Kullanıcının göreceği isim
- **resources**: Desteklenen kaynaklar (`catalog`, `meta`, `stream`)
- **types**: Desteklenen içerik tipleri (`movie`, `series`, `tv`)
- **catalogs**: Katalog tanımları
- **idPrefixes**: ID prefix'leri (addon ID'lerinde kullanılır)

#### 2. **Instruction Handlers**

Bu fonksiyonlar, Flutter'a fetch instruction'ları döndürür:

**handleCatalog(args)**
- Film/dizi listelerini getirmek için kullanılır
- `args.id`: Katalog ID'si
- `args.extra.search`: Arama sorgusu (varsa)
- `args.extra.skip`: Sayfalama için skip değeri

**handleMeta(args)**
- Film/dizi detaylarını getirmek için kullanılır
- `args.id`: Item ID'si (genellikle base64 encode edilmiş URL)
- Series için `videos` array'i döndürmelisiniz (bölümler için)

**handleStream(args)**
- Video stream linklerini getirmek için kullanılır
- `args.id`: Item veya episode ID'si
- Stream URL'lerini döndürür

#### 3. **Instruction Formatı**

Her instruction şu alanlara sahip olmalıdır:

```javascript
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
```

#### 4. **Instruction Chaining**

Birden fazla fetch gerekiyorsa, instruction chain kullanabilirsiniz:

```javascript
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
```

#### 5. **ID Encoding**

Addon ID'leri genellikle URL'leri base64 encode ederek oluşturulur:

```javascript
// Encoding
const id = 'youraddon:' + Buffer.from(url).toString('base64').replace(/=/g, '');

// Decoding
const url = Buffer.from(args.id.replace('youraddon:', ''), 'base64').toString('utf-8');
```

### 📚 Gelişmiş Özellikler

#### Video Extractors

Popüler video hostlar için extractor'lar yazabilirsiniz:

```javascript
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
```

#### Altyazı Desteği

```javascript
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
```

#### POST İstekleri

```javascript
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
```

#### AES Decryption

Encrypted API'lar için:

```javascript
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
```

### 🎯 Best Practices

1. **Unique Request ID'ler kullanın**: Her instruction için benzersiz bir `requestId` oluşturun
2. **Purpose değerlerini açıklayıcı yapın**: `catalog`, `meta`, `stream`, `extract_vidmoxy` gibi
3. **Metadata kullanın**: Instruction chain'de data taşımak için `metadata` alanını kullanın
4. **Error handling**: `try-catch` blokları kullanın ve hataları loglayın
5. **Console logging**: Debug için detaylı console.log kullanın
6. **User-Agent**: Her request'te gerçekçi User-Agent header'ı gönderin
7. **Referer**: Gerektiğinde Referer header'ı ekleyin (anti-bot bypass için)

### 📝 Test Etme

Addon'unuzu test etmek için:

1. Dosyanızı proje klasörüne ekleyin (örn: `my-addon.js`)
2. `server.js` dosyasını güncelleyin:

```javascript
// server.js içinde
const myAddon = require('./my-addon.js');

const ADDONS = {
    'myaddon': myAddon,
    'fullhdfilmizlesene': addonNew,
    // ... diğer addon'lar
};
```

3. Sunucuyu yeniden başlatın: `npm start`
4. Manifest URL'yi test edin: `http://localhost:3000/api/addon/myaddon/manifest.json`
5. Stremio'ya ekleyin ve test edin

### 🔍 Debug İpuçları

Addon'unuz çalışmıyorsa:

1. **Server loglarını kontrol edin**: Console.log'larınızı takip edin
2. **Manifest'i kontrol edin**: Tarayıcıda manifest URL'yi açın
3. **Network tab kullanın**: Chrome DevTools'da request/response'ları inceleyin
4. **HTML yapısını kontrol edin**: Cheerio selector'larınızın doğru olduğundan emin olun
5. **Instruction chain'i takip edin**: Purpose değerlerini logla ve chain'i kontrol edin

### 📖 Örnek Addon'lar

Referans için mevcut addon'lara bakın:

- **addon-new.js**: Film sitesi, çoklu video extractor'lar
- **dizipal.js**: Dizi sitesi, iframe extraction, m3u8 detection
- **animecix-addon.js**: API tabanlı, TauVideo extraction
- **inat-new.js**: Encrypted API, AES decryption, live TV
- **hdfilmcehennemi-addon.js**: Packed JS unpacking, dcHello decoder

### 🚀 Addon'unuzu Paylaşma

Addon'unuzu tamamladıktan sonra:

1. GitHub'a push edin
2. Pull Request açın
3. README'ye addon'unuzu ekleyin
4. Toplulukla paylaşın!

---

**İyi geliştirmeler! 🎉**

## 📝 License

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add some amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📧 İletişim

Sorularınız için issue açabilirsiniz.

---

Made with ❤️ for Turkish Stremio Users
