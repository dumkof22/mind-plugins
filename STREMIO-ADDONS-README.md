# Stremio Türkçe Eklentiler - JavaScript/Node.js (Instruction Mode)

Kotlin'den JavaScript'e dönüştürülmüş Türkçe içerik sağlayıcıları için Stremio eklentileri.

## 📦 Eklentiler

### 1. **AnimeciX** (`animecix-addon.js`)
- **Tür:** Anime
- **Özellikler:**
  - API tabanlı (özel header ile kimlik doğrulama)
  - Son eklenen bölümler
  - Seriler ve filmler kataloğu
  - Arama desteği
  - TauVideo extractor entegrasyonu
  - Sezon/bölüm bazlı video yönetimi

### 2. **BelgeselX** (`belgeselx-addon.js`)
- **Tür:** Belgesel
- **Özellikler:**
  - Google Custom Search Engine (CSE) ile arama
  - 18+ farklı belgesel kategorisi (Tarih, Bilim, Doğa, vb.)
  - Çoklu kalite seçenekleri
  - Türkçe başlık formatlaması
  - Seri belgesel desteği

### 3. **CanliTV** (`canlitv-addon.js`)
- **Tür:** Canlı TV
- **Özellikler:**
  - M3U8 playlist parser
  - GitHub'dan otomatik playlist çekme
  - Kategori bazlı kanal listeleme
  - IPTV metadata desteği (logo, grup, ülke)
  - Arama fonksiyonu
  - NSFW içerik uyarısı

### 4. **CizgiMax** (`cizgimax-addon.js`)
- **Tür:** Çizgi Film
- **Özellikler:**
  - Çoklu kategori desteği (Aile, Aksiyon, Komedi, vb.)
  - AJAX tabanlı arama
  - Video extractor entegrasyonları:
    - SibNet
    - Google Drive
    - CizgiDuo
    - CizgiPass
  - Sezon/bölüm yönetimi

### 5. **DiziBox** (`dizibox-addon.js`)
- **Tür:** Dizi
- **Özellikler:**
  - CloudFlare bypass (cookie-based)
  - CryptoJS AES decryption
  - Çoklu player desteği (King, Moly, Haydi)
  - Yerli ve yabancı dizi kategorileri
  - Sezon bazlı bölüm listeleme
  - IMDB entegrasyonu
  - Trailer desteği

### 6. **HDFilmCehennemi** (`hdfilmcehennemi-addon.js`)
- **Tür:** Film & Dizi
- **Özellikler:**
  - Packed JavaScript decoder
  - dcHello custom base64 decoder
  - Çoklu dil desteği (TR, EN, vb.)
  - Altyazı desteği
  - Çoklu kalite seçenekleri
  - IMDB puanları
  - Film önerileri
  - CloudFlare bypass

## 🔧 Video Extractors (`video-extractors.js`)

Tüm eklentiler tarafından kullanılan ortak video extractor'lar:

### Desteklenen Platformlar:
1. **TauVideo** - API tabanlı video çözücü
2. **Odnoklassniki (ok.ru)** - Rus video platformu
3. **SibNet** - Rus video hosting
4. **Google Drive** - Google Drive video linki çözücü
5. **CizgiDuo/CizgiPass** - AES şifreli video kaynakları

## 📁 Dosya Yapısı

```
.
├── animecix-addon.js           # AnimeciX eklentisi
├── belgeselx-addon.js          # BelgeselX eklentisi
├── canlitv-addon.js            # CanliTV eklentisi (M3U8 parser dahil)
├── cizgimax-addon.js           # CizgiMax eklentisi
├── dizibox-addon.js            # DiziBox eklentisi (CryptoJS dahil)
├── hdfilmcehennemi-addon.js    # HDFilmCehennemi eklentisi
├── video-extractors.js         # Ortak video extractor'lar
├── stremio-addons-index.js     # Ana index dosyası
└── STREMIO-ADDONS-README.md    # Bu dosya
```

## 🚀 Kullanım

### Tüm Eklentileri Yükle

```javascript
const stremioAddons = require('./stremio-addons-index');

// Tüm manifestleri al
const manifests = stremioAddons.getAllManifests();
console.log(manifests);

// Belirli bir eklenti al
const animecix = stremioAddons.getAddonById('community.animecix');
```

### Tek Bir Eklenti Kullan

```javascript
const animecix = require('./animecix-addon');

// Catalog handler
const catalogInstructions = await animecix.handleCatalog({
    id: 'animecix_series',
    extra: { skip: 0 }
});

// Process fetch result
const result = await animecix.processFetchResult({
    requestId: 'animecix-catalog-123',
    purpose: 'catalog_titles',
    body: '...',
    url: '...'
});
```

### Instruction Chain Örneği

```javascript
// 1. Catalog isteği
const catalogReq = await addon.handleCatalog({ id: 'hdfc_yeni_filmler' });
// Returns: { instructions: [{ requestId, purpose: 'catalog', url, ... }] }

// 2. Fetch sonucunu işle
const catalogRes = await addon.processFetchResult({
    requestId: catalogReq.instructions[0].requestId,
    purpose: 'catalog',
    body: fetchedHTML,
    url: fetchedURL
});
// Returns: { metas: [...] }

// 3. Meta isteği
const metaReq = await addon.handleMeta({ id: 'hdfc:base64url' });

// 4. Stream isteği
const streamReq = await addon.handleStream({ id: 'hdfc:base64url' });

// 5. Stream extraction
const streamRes = await addon.processFetchResult({
    purpose: 'stream_extract',
    body: iframeHTML,
    url: iframeURL
});
// Returns: { streams: [...] }
```

## 🔑 Önemli Özellikler

### 1. **Instruction-Based Sistem**
- Her handler `instructions` döndürür
- `processFetchResult` ile fetch sonuçları işlenir
- Chain of responsibility pattern
- Async/await yapısı

### 2. **Video Extraction Chain**
Çoğu eklenti çoklu adımlı extraction kullanır:
```
Stream Request → Iframe URL → Player Page → Decryption → M3U8 URL
```

### 3. **Metadata Yönetimi**
Her instruction metadata taşıyabilir:
```javascript
{
    requestId: 'unique-id',
    purpose: 'stream_extract',
    url: 'https://...',
    metadata: {
        streamName: 'TauVideo',
        sourceUrl: 'https://original-url'
    }
}
```

### 4. **Error Handling**
Tüm extractorlar try-catch blokları ile korunmuştur ve konsola detaylı log yazdırır.

## 🛠️ Gereksinimler

```json
{
    "dependencies": {
        "cheerio": "^1.0.0-rc.12",
        "crypto": "built-in"
    }
}
```

## 📝 Kotlin'den JavaScript'e Dönüşüm Notları

### Değişiklikler:
1. **CloudFlare Bypass** → Cookie-based authentication
2. **Jsoup** → Cheerio
3. **Kotlin Coroutines** → async/await
4. **Data Classes** → Plain JavaScript objects
5. **Regex** → JavaScript RegExp
6. **Base64** → Buffer.from()
7. **AES Encryption** → crypto module

### Korunan Özellikler:
- ✅ Tüm scraping logic
- ✅ Video extraction algoritmaları
- ✅ Decryption fonksiyonları
- ✅ Metadata parsing
- ✅ Multi-language support
- ✅ Subtitle extraction

## 🔒 Güvenlik Notları

1. **CloudFlare Bypass**: DiziBox ve HDFilmCehennemi için gerekli
2. **Custom Headers**: AnimeciX için özel API header gerekli
3. **Cookie Management**: Bazı siteler için persistent cookie gerekir
4. **Rate Limiting**: Eklentiler sequential request yapabilir

## 📊 Test Edilmesi Gerekenler

- [ ] Her eklentinin catalog fonksiyonu
- [ ] Arama fonksiyonları
- [ ] Meta data çekimi
- [ ] Video stream extraction
- [ ] Altyazı desteği
- [ ] Çoklu kalite seçenekleri
- [ ] Error handling

## 🐛 Bilinen Sınırlamalar

1. **CizgiDuo/CizgiPass**: AES decryption instruction mode'da sınırlı çalışabilir
2. **CloudFlare**: Bazı durumlarda manuel cookie update gerekebilir
3. **Rate Limiting**: Hızlı isteklerde bazı siteler bloke edebilir

## 📞 Destek

Her eklenti kendi loglarını `console.log` ile yazdırır:
- 🎯 Handler çağrıları
- ⚙️ Process fonksiyonları
- ✅ Başarılı sonuçlar
- ⚠️ Hatalar ve uyarılar

## 🎉 Özet

Tüm Kotlin eklentileri başarıyla JavaScript'e dönüştürülmüştür. Her eklenti:
- ✅ Instruction-based sistem kullanır
- ✅ Ortak video extractor'ları paylaşır
- ✅ Async/await pattern kullanır
- ✅ Detaylı logging yapar
- ✅ Error handling içerir
- ✅ Orijinal özellikleri korur

**Toplam Eklenti Sayısı:** 6
**Toplam Video Extractor:** 5
**Toplam Kod Satırı:** ~3500+

