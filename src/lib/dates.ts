// Tüm vakit hesapları Türkiye saatine (Europe/Istanbul) sabitlenir;
// cihaz farklı bir saat diliminde olsa bile vakitler doğru yorumlanır.

const TZ = "Europe/Istanbul";

export const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export const TR_WEEKDAYS = [
  "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar",
];

export const TR_WEEKDAYS_SHORT = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

export interface IstanbulNow {
  dateKey: string; // YYYY-MM-DD
  minutes: number; // gün içindeki dakika (0-1439)
}

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function nowIstanbul(): IstanbulNow {
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date())) parts[p.type] = p.value;
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function todayKey(): string {
  return nowIstanbul().dateKey;
}

/** "04:04" → 244 */
export function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function keyToUTC(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDaysKey(key: string, n: number): string {
  const dt = keyToUTC(key);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** b - a, gün cinsinden */
export function diffDays(a: string, b: string): number {
  return Math.round((keyToUTC(b).getTime() - keyToUTC(a).getTime()) / 86400000);
}

/** Pazartesi=0 … Pazar=6 */
export function weekdayIndex(key: string): number {
  return (keyToUTC(key).getUTCDay() + 6) % 7;
}

/** "2026-07-29" → "29 Temmuz 2026" */
export function formatKeyTR(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${d} ${TR_MONTHS[m - 1]} ${y}`;
}

/** "2026-07-29" → "29 Temmuz 2026 Çarşamba" */
export function formatKeyLongTR(key: string): string {
  return `${formatKeyTR(key)} ${TR_WEEKDAYS[weekdayIndex(key)]}`;
}

/** 84 → "1 saat 24 dakika" */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 1) return "1 dakikadan az";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} dakika`;
  if (m === 0) return `${h} saat`;
  return `${h} saat ${m} dakika`;
}
