export const APP_VERSION = "1.1";

export interface ReleaseNote {
  version: string;
  date: string;
  items: string[];
}

// Sürüm notları: gün içi küçük adımlar tek sürümde derlenir; yalnızca
// kullanıcının fark edeceği değişiklikler, sade bir dille yazılır.
export const CHANGELOG: ReleaseNote[] = [
  {
    version: "1.1",
    date: "30 Temmuz 2026",
    items: [
      "Arkadaşlar: davet koduyla arkadaş ekleyin, günlük takibi birlikte görün",
      "Arkadaşına tek dokunuşla nazik bir namaz hatırlatması gönder",
      "Cuma günleri öğle vakti \"Cuma\" olarak gösterilir",
    ],
  },
  {
    version: "1.0",
    date: "30 Temmuz 2026",
    items: [
      "Şehre göre namaz vakitleri (81 il) ve çevrimdışı 30 günlük vakit listesi",
      "Sıradaki namaz kartı: saniyeli sayaç, vakit yaklaştıkça dolan gösterge, son 15 dakikada koyulaşma",
      "Günlük takip: kılındı / kaza işaretleme, takvim ve istatistikler",
      "Google ile giriş ve kayıtların cihazlar arası eşitlenmesi",
      "Hatırlatmalar: vakitten 10-30 dk önce ve vakit girince — uygulama kapalıyken de bildirim",
      "Kıble pusulası kartı",
      "Dört tema rengi (Zümrüt, Firuze, Lacivert, Kehribar) ve açık/koyu tema",
      "İslami motifli uygulama ikonu, konumdan şehir bulma, tanıtım rehberi",
      "PWA: ana ekrana ekleme ve çevrimdışı çalışma",
    ],
  },
];
