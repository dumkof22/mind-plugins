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
