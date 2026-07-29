import type { DayLog, DayTimes, DerivedStatus, PrayerDef } from "./prayers";
import { PRAYERS } from "./prayers";
import { addDaysKey, toMin } from "./dates";

// "Kaçırıldı" ve "vakti gelmedi" veritabanına yazılmaz; saat ve kayıtlardan türetilir.

export function deriveStatus(
  def: PrayerDef,
  day: DayTimes,
  log: DayLog | undefined,
  nowMinutes: number,
): DerivedStatus {
  const entry = log?.[def.key];
  if (entry) return entry.status === "completed" ? "completed" : "qada";
  const start = toMin(day.times[def.timeKey]);
  const end = def.endKey ? toMin(day.times[def.endKey]) : 24 * 60;
  if (nowMinutes < start) return "notYet";
  if (nowMinutes < end) return "current";
  return "missed";
}

/** Geçmiş bir gün için durum (saat penceresi yok; kayıt yoksa kaçırılmış sayılır). */
export function derivePastStatus(log: DayLog | undefined, key: PrayerDef["key"]): DerivedStatus {
  const entry = log?.[key];
  if (!entry) return "missed";
  return entry.status === "completed" ? "completed" : "qada";
}

export interface NextPrayer {
  def: PrayerDef;
  dateKey: string;
  time: string;
  minutesLeft: number;
  isToday: boolean;
}

/** Sıradaki namazı bulur; yatsıdan sonra ertesi günün sabah (imsak) vaktine geçer. */
export function findNextPrayer(
  days: DayTimes[],
  todayKey: string,
  nowMinutes: number,
): NextPrayer | null {
  const today = days.find((d) => d.date === todayKey);
  if (today) {
    for (const def of PRAYERS) {
      const m = toMin(today.times[def.timeKey]);
      if (m > nowMinutes) {
        return { def, dateKey: todayKey, time: today.times[def.timeKey], minutesLeft: m - nowMinutes, isToday: true };
      }
    }
  }
  const tomorrowKey = addDaysKey(todayKey, 1);
  const tomorrow = days.find((d) => d.date === tomorrowKey);
  if (tomorrow) {
    const m = toMin(tomorrow.times.imsak);
    return {
      def: PRAYERS[0],
      dateKey: tomorrowKey,
      time: tomorrow.times.imsak,
      minutesLeft: 24 * 60 - nowMinutes + m,
      isToday: false,
    };
  }
  return null;
}
