import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useSettings } from "../features/settings/SettingsContext";
import { useTimes } from "../features/prayer-times/TimesContext";
import { useLogs } from "../features/tracking/LogsContext";
import { addDaysKey, weekdayIndex } from "../lib/dates";
import { PRAYERS, type PrayerKey } from "../lib/prayers";

interface Stats {
  today: number;
  weekCount: number;
  weekPossible: number;
  monthCount: number;
  last7Rate: number; // 0-100
  streak: number;
  total: number;
  best: string | null;
  weakest: string | null;
}

function countDay(day: Record<string, unknown> | undefined): number {
  if (!day) return 0;
  return PRAYERS.filter((p) => day[p.key]).length;
}

export function StatsPage() {
  const { now } = useTimes();
  const { logs } = useLogs();
  const { settings } = useSettings();

  const stats = useMemo<Stats>(() => {
    const today = now.dateKey;
    const weekStart = addDaysKey(today, -weekdayIndex(today)); // Pazartesi
    const monthPrefix = today.slice(0, 7);
    const last7Start = addDaysKey(today, -6);

    let weekCount = 0;
    let monthCount = 0;
    let last7 = 0;
    let total = 0;
    const perPrayer: Record<PrayerKey, number> = {
      fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0,
    };

    for (const [date, day] of Object.entries(logs)) {
      if (date > today) continue;
      for (const p of PRAYERS) {
        if (day[p.key]) {
          total++;
          perPrayer[p.key]++;
          if (date >= weekStart) weekCount++;
          if (date.startsWith(monthPrefix)) monthCount++;
          if (date >= last7Start) last7++;
        }
      }
    }

    // Art arda beş vakti tam tamamlanan gün sayısı (bugün tam değilse dünden başlar)
    let streak = 0;
    let cursor = countDay(logs[today]) === 5 ? today : addDaysKey(today, -1);
    while (countDay(logs[cursor]) === 5) {
      streak++;
      cursor = addDaysKey(cursor, -1);
    }

    const entries = Object.entries(perPrayer) as [PrayerKey, number][];
    const anyRecord = entries.some(([, n]) => n > 0);
    let best: string | null = null;
    let weakest: string | null = null;
    if (anyRecord) {
      const sorted = [...entries].sort((a, b) => b[1] - a[1]);
      best = PRAYERS.find((p) => p.key === sorted[0][0])?.name ?? null;
      weakest = PRAYERS.find((p) => p.key === sorted[sorted.length - 1][0])?.name ?? null;
    }

    const daysThisWeek = Math.min(7, weekdayIndex(today) + 1);
    return {
      today: countDay(logs[today]),
      weekCount,
      weekPossible: daysThisWeek * 5,
      monthCount,
      last7Rate: Math.round((last7 / 35) * 100),
      streak,
      total,
      best,
      weakest,
    };
  }, [logs, now.dateKey]);

  // Takip modu kapalıyken istatistik gösterilmez
  if (!settings.tracking) return <Navigate to="/" replace />;

  return (
    <div className="page">
      <div className="page-title">İstatistik</div>

      <div className="card">
        <div style={{ fontWeight: "var(--fw-semibold)", marginBottom: 4 }}>Bu hafta</div>
        <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
          Bu hafta {stats.weekPossible} vakitten {stats.weekCount} tanesini tamamladın.
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(100, Math.round((stats.weekCount / stats.weekPossible) * 100))}%`,
            }}
          />
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.today}/5</div>
          <div className="stat-label">Bugün tamamlanan</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.monthCount}</div>
          <div className="stat-label">Bu ay tamamlanan</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">%{stats.last7Rate}</div>
          <div className="stat-label">Son 7 gün devamlılık</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">Art arda tam gün</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.best ?? "—"}</div>
          <div className="stat-label">En düzenli olduğun vakit</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.weakest ?? "—"}</div>
          <div className="stat-label">En çok eksik kalan vakit</div>
        </div>
      </div>

      <div className="card" style={{ textAlign: "center" }}>
        <div className="stat-value" style={{ fontSize: "var(--fs-xxl)" }}>
          {stats.total}
        </div>
        <div className="stat-label">Toplam tamamlanan namaz</div>
      </div>

      {stats.total === 0 && (
        <div className="caption">
          Henüz kayıt yok. Bugün ekranından namazlarını işaretlemeye başlayabilirsin.
        </div>
      )}
    </div>
  );
}
