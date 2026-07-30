// Uygulama ayarları — hem localStorage'da hem (girişliyse) Firestore
// profilindeki `settings` alanında saklanır.

export interface NotifPrefs {
  enabled: boolean;
  /** Vakitten kaç dakika önce hatırlatılsın */
  offsetMinutes: 10 | 15 | 30;
  /** Vakit girdiğinde de bildirim gösterilsin mi */
  atTime: boolean;
}

export interface AppSettings {
  /** Namaz takibi: kapalıyken işaretleme, takvim ve istatistik gizlenir */
  tracking: boolean;
  notif: NotifPrefs;
}

export const DEFAULT_SETTINGS: AppSettings = {
  tracking: true,
  notif: { enabled: false, offsetMinutes: 15, atTime: false },
};

/** Eksik/eski kayıtları varsayılanlarla tamamlar. */
export function normalizeSettings(raw: unknown): AppSettings {
  const r = (raw ?? {}) as Partial<AppSettings>;
  return {
    tracking: r.tracking ?? DEFAULT_SETTINGS.tracking,
    notif: { ...DEFAULT_SETTINGS.notif, ...(r.notif ?? {}) },
  };
}
