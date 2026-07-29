// Namaz ve vakit tanımları — takipte 5 vakit esas alınır (sabah için imsak),
// güneş yalnızca bilgi amaçlı gösterilir.

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export type TimeKey = "imsak" | "gunes" | "ogle" | "ikindi" | "aksam" | "yatsi";

export interface PrayerDef {
  key: PrayerKey;
  name: string;
  /** API'deki vakit alanı (sabah namazı için imsak) */
  timeKey: TimeKey;
  /** Vaktin çıkış zamanı — sonrasında "kaçırıldı" sayılır (yatsı için gün sonu) */
  endKey: TimeKey | null;
}

export const PRAYERS: PrayerDef[] = [
  { key: "fajr", name: "Sabah", timeKey: "imsak", endKey: "gunes" },
  { key: "dhuhr", name: "Öğle", timeKey: "ogle", endKey: "ikindi" },
  { key: "asr", name: "İkindi", timeKey: "ikindi", endKey: "aksam" },
  { key: "maghrib", name: "Akşam", timeKey: "aksam", endKey: "yatsi" },
  { key: "isha", name: "Yatsı", timeKey: "yatsi", endKey: null },
];

export const PRAYER_BY_KEY = new Map(PRAYERS.map((p) => [p.key, p]));

export const TIME_LABELS: { key: TimeKey; label: string }[] = [
  { key: "imsak", label: "İmsak" },
  { key: "gunes", label: "Güneş" },
  { key: "ogle", label: "Öğle" },
  { key: "ikindi", label: "İkindi" },
  { key: "aksam", label: "Akşam" },
  { key: "yatsi", label: "Yatsı" },
];

export type EntryStatus = "completed" | "qada";

export interface LogEntry {
  status: EntryStatus;
  completedAt: number; // epoch ms
}

/** Bir günün işaretlemeleri — yalnızca kullanıcının yaptığı kayıtlar tutulur. */
export type DayLog = Partial<Record<PrayerKey, LogEntry>>;

/** Tarih anahtarı (YYYY-MM-DD) → günün kayıtları */
export type LogsMap = Record<string, DayLog>;

export interface DayTimes {
  date: string; // YYYY-MM-DD
  weekday: string;
  miladi: string; // "29 Temmuz 2026 Çarşamba"
  hicri: string; // "15 Safer 1448"
  times: Record<TimeKey, string>; // "04:04" biçiminde
}

export type DerivedStatus = "notYet" | "current" | "completed" | "missed" | "qada";

export const STATUS_LABELS: Record<DerivedStatus, string> = {
  notYet: "Henüz vakti gelmedi",
  current: "Vakti girdi",
  completed: "Kılındı",
  missed: "Kaçırıldı",
  qada: "Kaza edildi",
};
