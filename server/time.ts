// Sunucu tarafı saat yardımcıları — tüm hesaplar Türkiye saatine göredir
// (kalıcı UTC+3, yaz saati uygulaması yok).

export function todayIstanbul(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** "2026-07-30" + "13:16" → epoch ms (Türkiye saati) */
export function istanbulEpoch(dateKey: string, time: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh - 3, mm);
}
