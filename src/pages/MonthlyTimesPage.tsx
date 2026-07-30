import { Link } from "react-router-dom";
import { IconChevronLeft, IconInfo } from "../components/icons";
import { StateScreen } from "../components/ui";
import { useTimes } from "../features/prayer-times/TimesContext";
import { TR_MONTHS_SHORT, TR_WEEKDAYS_SHORT, weekdayIndex } from "../lib/dates";
import { TIME_LABELS } from "../lib/prayers";

/**
 * Seçili şehir için önümüzdeki 30 günün vakit listesi.
 * Veri localStorage + service worker'da saklandığı için çevrimdışı da açılır.
 */
export function MonthlyTimesPage() {
  const { days, now, cityLabel, status, retry } = useTimes();
  const upcoming = days.filter((d) => d.date >= now.dateKey);

  return (
    <div className="page">
      <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
        <Link to="/" className="icon-btn" aria-label="Geri">
          <IconChevronLeft size={18} />
        </Link>
        30 Günlük Vakitler
      </div>
      {upcoming.length > 0 ? (
        <>
          <div className="caption" style={{ textAlign: "left" }}>
            {cityLabel} — bu liste çevrimdışıyken de kullanılabilir.
          </div>
          <div className="card" style={{ padding: "var(--sp-3)" }}>
            <div className="times-row times-head">
              <span>Tarih</span>
              {TIME_LABELS.map((t) => (
                <span key={t.key}>{t.label}</span>
              ))}
            </div>
            {upcoming.map((d) => {
              const [, m, day] = d.date.split("-").map(Number);
              return (
                <div
                  key={d.date}
                  className={`times-row${d.date === now.dateKey ? " today" : ""}`}
                >
                  <span className="times-date">
                    {day} {TR_MONTHS_SHORT[m - 1]}
                    <em>{TR_WEEKDAYS_SHORT[weekdayIndex(d.date)]}</em>
                  </span>
                  {TIME_LABELS.map((t) => (
                    <span key={t.key}>{d.times[t.key]}</span>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <StateScreen
          icon={<IconInfo size={32} />}
          title={status === "loading" ? "Vakitler yükleniyor…" : "Vakit verisi bulunamadı"}
          text="Bağlantı kurulduğunda 30 günlük liste cihazına kaydedilir ve çevrimdışı da açılır."
          action={
            status !== "loading" ? (
              <button className="btn btn-primary btn-sm" onClick={retry}>
                Tekrar dene
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
