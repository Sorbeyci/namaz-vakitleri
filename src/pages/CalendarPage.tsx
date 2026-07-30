import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconPending,
  IconQada,
  TimeIcon,
} from "../components/icons";
import { Sheet, useToast } from "../components/ui";
import { useSettings } from "../features/settings/SettingsContext";
import { useTimes } from "../features/prayer-times/TimesContext";
import { useLogs } from "../features/tracking/LogsContext";
import {
  TR_MONTHS,
  TR_WEEKDAYS_SHORT,
  formatKeyLongTR,
  weekdayIndex,
} from "../lib/dates";
import { PRAYERS, STATUS_LABELS } from "../lib/prayers";
import { derivePastStatus, deriveStatus, prayerDisplayName } from "../lib/status";

type DayIndicator = "full" | "partial" | "none" | "empty";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function CalendarPage() {
  const { now, today } = useTimes();
  const { logs, markPrayer } = useLogs();
  const { settings } = useSettings();
  const toast = useToast();
  const [year, setYear] = useState(() => Number(now.dateKey.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(now.dateKey.slice(5, 7))); // 1-12
  const [selected, setSelected] = useState<string | null>(null);

  const cells = useMemo(() => {
    const first = `${year}-${pad(month)}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const lead = weekdayIndex(first);
    const list: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(`${year}-${pad(month)}-${pad(d)}`);
    return list;
  }, [year, month]);

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y--;
    } else if (m > 12) {
      m = 1;
      y++;
    }
    setYear(y);
    setMonth(m);
  };

  function indicator(key: string): DayIndicator {
    const day = logs[key];
    const count = day ? PRAYERS.filter((p) => day[p.key]).length : 0;
    if (count === 5) return "full";
    if (count > 0) return "partial";
    if (!day || count === 0) return key < now.dateKey ? "empty" : "none";
    return "none";
  }

  const selectedLog = selected ? logs[selected] : undefined;

  // Takip modu kapalıyken takvim gösterilmez
  if (!settings.tracking) return <Navigate to="/" replace />;

  return (
    <div className="page">
      <div className="page-title">Takvim</div>
      <div className="card">
        <div className="cal-header">
          <button className="icon-btn" onClick={() => changeMonth(-1)} aria-label="Önceki ay">
            <IconChevronLeft size={18} />
          </button>
          <div className="cal-month">
            {TR_MONTHS[month - 1]} {year}
          </div>
          <button className="icon-btn" onClick={() => changeMonth(1)} aria-label="Sonraki ay">
            <IconChevronRight size={18} />
          </button>
        </div>
        <div className="cal-grid">
          {TR_WEEKDAYS_SHORT.map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
          {cells.map((key, i) => {
            if (!key) return <div key={`x${i}`} />;
            const future = key > now.dateKey;
            const ind = indicator(key);
            return (
              <button
                key={key}
                className={`cal-day${key === now.dateKey ? " today" : ""}${future ? " future" : ""}`}
                disabled={future}
                onClick={() => setSelected(key)}
                aria-label={formatKeyLongTR(key)}
              >
                {Number(key.slice(8, 10))}
                {!future && <span className={`cal-dot ${ind === "none" ? "" : ind}`} />}
              </button>
            );
          })}
        </div>
        <div className="cal-legend">
          <span>
            <span className="cal-dot full" /> Beş vakit tamam
          </span>
          <span>
            <span className="cal-dot partial" /> Kısmen
          </span>
          <span>
            <span className="cal-dot empty" /> Kayıt yok
          </span>
        </div>
      </div>

      {selected && (
        <Sheet title={formatKeyLongTR(selected)} onClose={() => setSelected(null)}>
          {selected === now.dateKey && (
            <div className="day-detail-sub">Bugün — vakitler saatine göre işaretlenir.</div>
          )}
          <div className="prayer-list">
            {PRAYERS.map((def) => {
              const isToday = selected === now.dateKey;
              const status =
                isToday && today
                  ? deriveStatus(def, today, selectedLog, now.minutes)
                  : derivePastStatus(selectedLog, def.key);
              const marked = status === "completed" || status === "qada";
              const name = prayerDisplayName(def, selected);
              const mark = (s: "completed" | "qada" | null, msg: string) => {
                markPrayer(selected, def.key, s);
                toast(msg);
              };
              return (
                <div key={def.key} className="prayer-row">
                  <span className="prayer-row-icon">
                    <TimeIcon timeKey={def.timeKey} />
                  </span>
                  <div className="prayer-row-main">
                    <div className="prayer-row-name">{name}</div>
                    <div
                      className={`prayer-row-status ${
                        marked ? "done" : status === "missed" ? "missed" : ""
                      }`}
                    >
                      {status === "missed" && !isToday ? "Kayıt yok" : STATUS_LABELS[status]}
                    </div>
                  </div>
                  <span className="prayer-row-action">
                    {status === "missed" && (
                      <button
                        className="mark-btn qada-action"
                        onClick={() =>
                          mark("qada", `${name} namazı kaza edildi olarak kaydedildi.`)
                        }
                        aria-label={`${name} namazını kaza edildi olarak işaretle`}
                        title="Kaza edildi olarak işaretle"
                      >
                        <IconQada size={18} />
                      </button>
                    )}
                    <button
                      className={`mark-btn${marked ? (status === "qada" ? " qada" : " done") : status !== "notYet" ? " markable" : ""}`}
                      disabled={status === "notYet"}
                      onClick={() =>
                        marked
                          ? mark(null, `${name} namazı işareti geri alındı.`)
                          : mark("completed", `${name} namazı kaydedildi.`)
                      }
                      aria-label={
                        marked
                          ? `${name} işaretini geri al`
                          : `${name} namazını kılındı olarak işaretle`
                      }
                      title={marked ? "İşareti geri al" : "Kılındı olarak işaretle"}
                    >
                      {marked ? <IconCheck size={20} /> : <IconPending size={20} />}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </Sheet>
      )}
    </div>
  );
}
