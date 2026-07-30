# Namaz 365

Mobil öncelikli namaz vakitleri ve günlük namaz takip uygulaması — [namaz365.com](https://namaz365.com).
React + Vite + TypeScript + Firebase (Auth/Firestore) + Vercel serverless API + PWA.

## Özellikler

- Sıradaki namaz kartı (gerçek zamanlı sayaç, yatsıdan sonra ertesi günün sabahına geçer)
- Günlük vakit listesi ve tek dokunuşla "Kılındı" işaretleme / geri alma
- Kaçırılan namazları "Kaza edildi" olarak işaretleme (bugün ve takvimden)
- Takvim üzerinde geçmiş takibi (gün durum göstergeleri)
- Yargılamayan, teşvik eden istatistikler
- Misafir kullanım (cihazda saklama) + Google girişi ile Firestore senkronizasyonu
  ve veri kaybetmeyen birleştirme
- Açık/koyu tema, merkezi design token sistemi, uygulamaya özel SVG ikon seti
- PWA: ana ekrana ekleme (Android butonu / iOS yönergesi), offline destek

## Kurulum

```bash
npm install
npm run dev
```

`DIYANET_API_KEY` tanımlı değilse geliştirme sunucusu örnek verilerle çalışır
(arayüzde "Örnek veriler" uyarısı görünür). Gerçek veriler için proje kökünde
`.env` dosyası oluşturup anahtarı ekleyin (bkz. `.env.example`) — Vite dev
sunucusu API route'unu yerelde taklit eder.

## Firebase yapılandırması (tek seferlik)

Firebase Console → `cash-flow-tracker-8e627` projesinde:

1. **Authentication → Sign-in method → Google** sağlayıcısını etkinleştirin.
2. **Authentication → Settings → Authorized domains** listesine Vercel alan
   adınızı ekleyin (örn. `namaz.vercel.app`). `localhost` varsayılan olarak eklidir.
3. **Firestore Database** oluşturun (production mode) ve **Rules** sekmesine
   [firestore.rules](firestore.rules) içeriğini yapıştırıp yayınlayın.

## Vercel dağıtımı

```bash
vercel deploy
```

Environment Variables (Project Settings → Environment Variables):

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `DIYANET_API_KEY` | Evet | Diyanet vakitler API anahtarı. **Paylaşılmış eski anahtarı kullanmayın; yeni anahtar alın.** Yalnızca sunucuda kullanılır, tarayıcıya asla inmez. |
| `FIREBASE_SERVICE_ACCOUNT` | Hayır (önerilir) | Service account JSON'u (tek satır). Verilirse 30 günlük vakit cache'i Firestore `prayerTimesCache` koleksiyonunda kalıcı saklanır; verilmezse bellek içi cache kullanılır. Firebase Console → Project Settings → Service accounts → Generate new private key. |
| `VITE_FCM_VAPID_KEY` | Push için | Web Push public key (Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair). Uygulama kapalıyken bildirim (FCM) bunu gerektirir; herkese açık bir anahtardır. |
| `CRON_SECRET` | Push için | `/api/send-reminders` ucunu koruyan rastgele bir parola. Harici bir zamanlayıcı (cron-job.org) bu uca 5 dakikada bir `Authorization: Bearer <CRON_SECRET>` başlığıyla POST atar. |

### Uygulama kapalıyken bildirim (FCM) akışı

1. Kullanıcı profilden hatırlatmayı açar → tarayıcı FCM token'ı alınır ve
   `users/{uid}.fcmTokens` alanına yazılır (yalnızca Google ile girişli
   kullanıcılarda; misafirlerde hatırlatma uygulama açıkken çalışır).
2. cron-job.org 5 dakikada bir `/api/send-reminders` ucunu çağırır.
3. Uç, bildirim açık kullanıcıların şehir vakitlerini sunucu cache'inden okur,
   pencereye düşen "X dk önce" / "vakit girince" bildirimlerini FCM ile
   gönderir; geçersiz token'ları temizler.

## Mimari notları

- **API proxy:** İstemci Diyanet API'sine doğrudan istek atmaz;
  [api/prayer-times.ts](api/prayer-times.ts) → [server/prayerTimes.ts](server/prayerTimes.ts)
  anahtar ile sunucuda sorgular. Şehir parametresi 81 il listesine karşı doğrulanır.
- **Cache katmanları:** şehir başına 30 günlük veri tek istekte çekilir →
  bellek içi + (opsiyonel) Firestore cache → CDN `s-maxage` → istemci
  `localStorage` + service worker. API düşerse son geçerli veri gösterilir.
- **Veri modeli:** `users/{uid}/days/{YYYY-MM-DD}` — gün başına tek doküman,
  aynı gün+vakit için birden fazla kayıt yapısal olarak imkânsız.
  "Kaçırıldı"/"vakti gelmedi" durumları yazılmaz, saatten türetilir.
- **Saat dilimi:** tüm hesaplar `Europe/Istanbul`'a sabitlidir.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu (API route taklidi dahil) |
| `npm run build` | Tip kontrolü + üretim derlemesi |
| `npm run preview` | Üretim derlemesini yerelde sunar |
| `npm run icons` | `public/icons/icon.svg` kaynağından PNG ikonları üretir |
