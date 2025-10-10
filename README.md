# 🎬 Stremio Turkish Addons - Multi-Addon Server

Tüm Türkçe Stremio eklentilerini tek bir sunucuda toplayan birleştirilmiş addon servisi.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D14-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## 🔒 Cloudflare Bypass

**⚡ Tüm eklentiler artık Cloudflare korumasını bypass edebiliyor!**

Bu proje **puppeteer-real-browser** kullanarak Cloudflare korumalı sitelere erişim sağlar:
- ✅ Headless modda çalışır (GUI gerektirmez)
- ✅ Otomatik Cloudflare Turnstile çözümü
- ✅ Cookie persistence ve session yönetimi
- ✅ Linux/Windows uyumlu
- ✅ Page pool ile performans optimizasyonu

**📖 Detaylı kurulum ve kullanım:** [CLOUDFLARE_BYPASS_SETUP.md](CLOUDFLARE_BYPASS_SETUP.md)

## 📦 İçerik

Bu proje 5 farklı Türkçe Stremio addon'unu tek bir portta barındırır:

| Addon | Path | Açıklama |
|-------|------|----------|
| 🎥 **FullHDFilmizlesene** | `/fullhd` | Türkçe ve yabancı filmler, HD/FHD kalite |
| 📺 **DiziPal** | `/dizipal` | Diziler ve filmler (Netflix, Exxen, BluTV vb.) |
| ⚽ **SelcukSports** | `/selcuk` | Canlı spor yayınları ve maçlar |
| 📡 **CanliTV** | `/canlitv` | 100+ canlı TV kanalı |
| 🎬 **InatBox** | `/inat` | Premium platform içerikleri |

## ✨ Özellikler

- ✅ **Tek Port** - Tüm addon'lar 7000 portunda çalışır
- ✅ **Modern Web Arayüzü** - Güzel bir UI ile addon linkleri
- ✅ **Dinamik URL** - Localhost veya production, otomatik algılar
- ✅ **Kolay Deploy** - Render.com için hazır konfigürasyon
- ✅ **Health Check** - Monitoring için endpoint'ler
- ✅ **REST API** - Programatik erişim için API
- ✅ **Bağımsız Addon'lar** - Birbirlerini etkilemezler

## 🚀 Hızlı Başlangıç

### Yerel Kurulum

```bash
# Projeyi klonlayın
git clone <repo-url>
cd inatstremioplugin

# Bağımlılıkları yükleyin
npm install

# Sunucuyu başlatın
npm start
```

Sunucu başladıktan sonra tarayıcınızda açın:
```
http://localhost:7000
```

### Web Arayüzü

Ana sayfada güzel bir arayüz ile tüm addon linklerini görebilirsiniz:
- ✅ Her addon için manifest URL'si
- ✅ Tek tıkla kopyalama
- ✅ Direkt Stremio'da açma
- ✅ Dinamik sunucu bilgileri

## 🌐 Render.com'a Deploy

### Tek Tıkla Deploy

Bu proje Render.com'a kolayca deploy edilebilir:

1. GitHub'a push edin
2. [Render.com](https://render.com) hesabınıza giriş yapın
3. "New +" > "Web Service" seçin
4. Reponuzu seçin
5. Render otomatik olarak `render.yaml` dosyasını algılayacak
6. "Create Web Service" butonuna tıklayın

**Detaylı talimatlar:** [RENDER_DEPLOY.md](./RENDER_DEPLOY.md)

### Deploy Sonrası

Render size bir URL verecek (örn: `https://your-app.onrender.com`):
- Ana sayfa web arayüzünü gösterir
- Tüm addon manifest URL'leri otomatik oluşturulur
- Dinamik IP/domain algılama

## 📱 Stremio'ya Ekleme

### Yöntem 1: Web Arayüzünden (Önerilen)

1. Ana sayfayı açın: `http://localhost:7000`
2. İstediğiniz addon'un **"Stremio'da Aç"** butonuna tıklayın
3. Stremio otomatik açılacak ve addon yüklenecek

### Yöntem 2: Manuel

1. Stremio'yu açın
2. **Addons** sekmesine gidin
3. Sağ üstteki arama çubuğuna manifest URL'sini yapıştırın:
   ```
   http://localhost:7000/fullhd/manifest.json
   http://localhost:7000/dizipal/manifest.json
   http://localhost:7000/selcuk/manifest.json
   http://localhost:7000/canlitv/manifest.json
   http://localhost:7000/inat/manifest.json
   ```
4. **Install** butonuna tıklayın

## 🛠️ Konfigürasyon

### Environment Variables

```bash
# Port değiştirme
PORT=8080 npm start

# DiziPal ayarları
DIZIPAL_START_NUMBER=1206
DIZIPAL_MAX_RETRIES=50

# SelcukSports ayarları
SELCUK_MAX_RETRIES=10
```

### Legacy Mod (Eski Kullanım)

Her addon'u ayrı portlarda çalıştırmak için:

```bash
npm run legacy:all
```

Bu durumda:
- FullHDFilmizlesene: Port 7000
- DiziPal: Port 7001
- SelcukSports: Port 7002
- CanliTV: Port 7003
- InatBox: Port 3000

## 📂 Proje Yapısı

```
inatstremioplugin/
├── server.js              # Ana sunucu (multi-addon)
├── addon.js               # FullHDFilmizlesene
├── dizipal.js            # DiziPal
├── selcuk.js             # SelcukSports
├── canlitv.js            # CanliTV
├── inat.js               # InatBox
├── cloudflare-bypass.js  # Cloudflare helper
├── public/
│   └── index.html        # Web arayüzü
├── render.yaml           # Render.com config
├── package.json          # Dependencies
└── README.md
```

## 🔌 API Endpoints

### `GET /`
Ana sayfa - Modern web arayüzü

### `GET /api/addons`
Tüm addon bilgilerini JSON olarak döner:
```json
{
  "serverUrl": "http://localhost:7000",
  "addons": [
    {
      "name": "FullHDFilmizlesene",
      "path": "/fullhd",
      "manifest": "http://localhost:7000/fullhd/manifest.json",
      "description": "Türkçe ve yabancı filmler"
    }
  ],
  "status": "running",
  "version": "1.0.0"
}
```

### `GET /health`
Health check endpoint:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## 🎯 Addon Özellikleri

### 🎥 FullHDFilmizlesene
- HD/FHD kalite filmler
- Çoklu server seçenekleri
- RapidVid, VidMoxy, TRsTX extractors
- Türkçe altyazı desteği
- IMDB bilgileri

### 📺 DiziPal
- Türkçe ve yabancı diziler
- Netflix, Exxen, BluTV, Disney+ koleksiyonları
- Sezon/bölüm desteği
- Altyazı desteği
- Dinamik URL yönetimi

### ⚽ SelcukSports
- Canlı spor maçları
- beIN Sports, S Sport, TRT Spor
- 7/24 spor kanalları
- M3U8 stream + header desteği

### 📡 CanliTV
- 100+ canlı TV kanalı
- Kategorize içerik
- IPTV M3U desteği
- Otomatik playlist güncelleme

### 🎬 InatBox
- Premium platform içerikleri
- Netflix, Disney+, Amazon Prime
- Dzen.ru, VK, Yandex extractors
- Cloudflare bypass

## 🔧 Sorun Giderme

### Port Zaten Kullanımda
```bash
PORT=8080 npm start
```

### Addon Çalışmıyor
- Logları kontrol edin
- Health check: `http://localhost:7000/health`
- Her addon bağımsız, biri hata verse diğerleri etkilenmez

### Render.com Uyku Modu
Free plan'da 15 dakika aktivite yoksa uyur. [UptimeRobot](https://uptimerobot.com) kullanarak önleyebilirsiniz.

### DiziPal URL Değişti
Otomatik bulur ve cache'ler. Manuel temizlemek için:
```bash
# Windows
Remove-Item .dizipal_url_cache.json

# Linux/Mac
rm .dizipal_url_cache.json
```

## 📊 Performans

| İşlem | Süre |
|-------|------|
| Sunucu Başlatma | ~5 saniye |
| Katalog Yükleme | 1-3 saniye |
| Arama | 1-2 saniye |
| Stream Bulma | 2-5 saniye |

## 🆚 Tek Sunucu vs Çoklu Sunucu

| Özellik | Multi-Addon (Yeni) | Legacy (Eski) |
|---------|-------------------|---------------|
| Port Sayısı | 1 | 5 |
| Kaynak Kullanımı | Düşük | Yüksek |
| Deploy Kolaylığı | ✅ Kolay | ⚠️ Karmaşık |
| Web Arayüzü | ✅ Var | ❌ Yok |
| Yönetim | ✅ Merkezi | ⚠️ Dağıtık |

## 🚢 Production Deployment

### Render.com (Önerilen)
- ✅ Ücretsiz SSL
- ✅ Otomatik deploy
- ✅ Free tier mevcut
- ⚠️ Cold start (ilk yükleme yavaş)

### Alternatif Platformlar
- **Railway:** Benzer Render.com
- **Fly.io:** Edge locations
- **Heroku:** Eski ama güvenilir
- **DigitalOcean:** VPS kontrolü

## 📝 Lisans

MIT License - Özgürce kullanabilirsiniz!

## 🤝 Katkıda Bulunma

Pull request'ler memnuniyetle karşılanır:
1. Fork yapın
2. Feature branch oluşturun
3. Commit'leyin
4. Push edin
5. Pull Request açın

## ⭐ Credits

- **@keyiflerolsun** - Orijinal addon'lar
- **Stremio Addon SDK** - Framework
- **Cloudflare Bypass** - Koruma aşma
- **Node.js Community** - Ecosystem

## 📞 Destek

- 🐛 **Bug Report:** GitHub Issues
- 💡 **Feature Request:** GitHub Discussions
- 📖 **Dokumentasyon:** Wiki sayfaları
- 💬 **Soru:** Issues > Q&A label

## ⚠️ Yasal Uyarı

Bu addon'lar **eğitim amaçlıdır**. İçerik kaynaklarının kullanım şartlarına uymak kullanıcının sorumluluğundadır. Telif hakkı ihlali yapmayın.

---

<div align="center">

**Made with ❤️ for Turkish Stremio Users**

[Web Arayüzü](http://localhost:7000) • [Render Deploy](./RENDER_DEPLOY.md) • [Multi-Addon Docs](./MULTI_ADDON_SERVER.md)

</div>
