import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconGoogle,
  IconInfo,
  IconPending,
  IconProfile,
  IconQada,
  PrayerIcon,
  TimeIcon,
} from "../components/icons";
import { Spinner, StateScreen, useToast } from "../components/ui";
import { useAuth } from "../features/auth/AuthContext";
import { useSettings } from "../features/settings/SettingsContext";
import { useTimes } from "../features/prayer-times/TimesContext";
import { useLogs } from "../features/tracking/LogsContext";
import { InstallPrompt } from "../features/pwa/InstallPrompt";
import { istanbulEpoch } from "../lib/dates";
import { PRAYERS, STATUS_LABELS, type DerivedStatus } from "../lib/prayers";
import { activeTimeKey, deriveStatus, findNextPrayer, findPrevPrayerEpoch } from "../lib/status";

function NextPrayerCard() {
  const { days, now } = useTimes();
  // Saniyeli geri sayım: dakikalık context saatinden bağımsız, saniyede bir işler
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const next = findNextPrayer(days, now.dateKey, now.minutes);
  if (!next) return null;
  const targetMs = istanbulEpoch(next.dateKey, next.time);
  const secondsLeft = Math.max(0, Math.floor((targetMs - nowMs) / 1000));

  // Doluluk göstergesi: önceki namazdan sıradakine geçen sürenin oranı.
  // Dolu (opak) kısım vakit yaklaştıkça büyür; kalan süre saydam dilimdir.
  const prevMs = findPrevPrayerEpoch(days, now.dateKey, now.minutes);
  const progress =
    prevMs !== null && targetMs > prevMs
      ? Math.min(1, Math.max(0, (nowMs - prevMs) / (targetMs - prevMs)))
      : 1;

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;

  // Son 15/10/5 dakikada kart kademeli olarak koyulaşır
  const urgency =
    secondsLeft > 0 && secondsLeft <= 300
      ? " urgent-5"
      : secondsLeft > 0 && secondsLeft <= 600
        ? " urgent-10"
        : secondsLeft > 0 && secondsLeft <= 900
          ? " urgent-15"
          : "";

  return (
    <div className={`next-card${urgency}`}>
      <div className="next-card-urgency" aria-hidden="true" />
      <div
        className="next-card-fade"
        style={{ width: `${((1 - progress) * 100).toFixed(2)}%` }}
        aria-hidden="true"
      />
      <div className="next-card-icon">
        <PrayerIcon prayerKey={next.def.key} size={36} />
      </div>
      <div>
        <div className="next-card-label">Sıradaki namaz</div>
        <div className="next-card-name">{next.def.name}</div>
        <div className="next-card-time">{next.time}</div>
        <div className="next-card-remaining">
          <span className="pulse-dot" />
          {secondsLeft === 0 ? (
            <span>{next.def.name} vakti girdi</span>
          ) : (
            <span>
              {next.def.name} namazına{" "}
              {h > 0 && (
                <>
                  <span className="cd-num">{h}</span> saat{" "}
                </>
              )}
              {(h > 0 || m > 0) && (
                <>
                  <span className="cd-num">{m}</span> dakika{" "}
                </>
              )}
              <span className="cd-num">{s}</span> saniye kaldı
              {!next.isToday && " (yarın)"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_CLASS: Partial<Record<DerivedStatus, string>> = {
  current: "current",
  missed: "missed",
  completed: "done",
  qada: "done",
};

function PrayerList() {
  const { today, now } = useTimes();
  const { logs, markPrayer } = useLogs();
  const { settings } = useSettings();
  const toast = useToast();
  if (!today) return null;
  const dayLog = logs[today.date];
  const tracking = settings.tracking;
  // Şu an içinde bulunulan vakit (imsaktan önce yatsı devam ediyor sayılır)
  const activeKey = activeTimeKey(today, now.minutes);

  return (
    <div className="card prayer-list">
      {PRAYERS.slice(0, 1).map((def) => (
        <PrayerRowView key={def.key} def={def} />
      ))}
      {/* Güneş: bilgi satırı, işaretlenemez */}
      <div className={`prayer-row info${activeKey === "gunes" ? " now" : ""}`}>
        <span className="prayer-row-icon">
          <TimeIcon timeKey="gunes" />
        </span>
        <div className="prayer-row-main">
          <div className="prayer-row-name">
            Güneş
            {activeKey === "gunes" && <span className="now-badge">Şu an</span>}
          </div>
          <div className="prayer-row-status">Sabah namazının vakti çıkar</div>
        </div>
        <span className="prayer-row-time">{today.times.gunes}</span>
        {tracking && <span className="prayer-row-action" />}
      </div>
      {PRAYERS.slice(1).map((def) => (
        <PrayerRowView key={def.key} def={def} />
      ))}
    </div>
  );

  function PrayerRowView({ def }: { def: (typeof PRAYERS)[number] }) {
    const t = today!;
    // Takip kapalıyken kayıtlar yok sayılır; yalnızca saat bilgisi gösterilir
    const status = deriveStatus(def, t, tracking ? dayLog : undefined, now.minutes);
    const marked = status === "completed" || status === "qada";
    const label = tracking
      ? STATUS_LABELS[status]
      : status === "missed"
        ? "Vakti çıktı"
        : STATUS_LABELS[status];

    const mark = (s: "completed" | "qada" | null, msg: string) => {
      markPrayer(t.date, def.key, s);
      toast(msg);
    };

    const isNow = def.timeKey === activeKey;
    return (
      <div className={`prayer-row${isNow ? " now" : ""}`}>
        <span className="prayer-row-icon">
          <TimeIcon timeKey={def.timeKey} />
        </span>
        <div className="prayer-row-main">
          <div className="prayer-row-name">
            {def.name}
            {isNow && <span className="now-badge">Şu an</span>}
          </div>
          <div className={`prayer-row-status ${tracking ? (STATUS_CLASS[status] ?? "") : ""}`}>
            {label}
          </div>
        </div>
        <span className="prayer-row-time">{t.times[def.timeKey]}</span>
        {tracking && (
          <span className="prayer-row-action">
            {status === "missed" && (
              <button
                className="mark-btn qada-action"
                onClick={() =>
                  mark("qada", `${def.name} namazı kaza edildi olarak kaydedildi.`)
                }
                aria-label={`${def.name} namazını kaza edildi olarak işaretle`}
                title="Kaza edildi olarak işaretle"
              >
                <IconQada size={18} />
              </button>
            )}
            <button
              className={`mark-btn${marked ? (status === "qada" ? " qada" : " done") : status !== "notYet" ? " markable" : ""}`}
              onClick={() =>
                marked
                  ? mark(null, `${def.name} namazı işareti geri alındı.`)
                  : mark("completed", `${def.name} namazı kaydedildi.`)
              }
              disabled={status === "notYet"}
              aria-label={
                marked
                  ? `${def.name} işaretini geri al`
                  : `${def.name} namazını kılındı olarak işaretle`
              }
              title={marked ? "İşareti geri al" : "Kılındı olarak işaretle"}
            >
              {marked ? <IconCheck size={20} /> : <IconPending size={20} />}
            </button>
          </span>
        )}
      </div>
    );
  }
}

export function TodayPage() {
  const { cityLabel, today, status, stale, demo, lastUpdated, errorMessage, retry, openPicker } =
    useTimes();
  const { user, signIn } = useAuth();

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <button className="topbar-city" onClick={openPicker} aria-label="Şehir değiştir">
            {cityLabel}
            <IconChevronRight size={18} />
          </button>
          {today && (
            <div className="topbar-dates">
              {today.miladi}
              <br />
              {today.hicri}
            </div>
          )}
        </div>
        <Link to="/profil" className="avatar" aria-label="Profil">
          {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <IconProfile />}
        </Link>
      </header>

      {status === "loading" && (
        <StateScreen icon={<Spinner />} title="Vakitler yükleniyor…" />
      )}

      {status === "error" && (
        <StateScreen
          icon={<IconInfo size={32} />}
          title="Namaz vakitleri şu anda güncellenemedi"
          text={errorMessage ?? undefined}
          action={
            <button className="btn btn-primary btn-sm" onClick={retry}>
              Tekrar dene
            </button>
          }
        />
      )}

      {status === "ready" && !today && (
        <StateScreen
          icon={<IconInfo size={32} />}
          title="Bugünün verisi bulunamadı"
          text="Vakitler güncellenemedi. Bağlantını kontrol edip tekrar dene."
          action={
            <button className="btn btn-primary btn-sm" onClick={retry}>
              Tekrar dene
            </button>
          }
        />
      )}

      {status === "ready" && today && (
        <>
          {stale && (
            <div className="notice">
              <IconInfo size={18} />
              <span>
                Namaz vakitleri şu anda güncellenemedi. Son kaydedilen vakitler gösteriliyor.
              </span>
            </div>
          )}
          {demo && (
            <div className="notice">
              <IconInfo size={18} />
              <span>Örnek veriler gösteriliyor (DIYANET_API_KEY yapılandırılmadı).</span>
            </div>
          )}
          <NextPrayerCard />
          <PrayerList />
          <Link to="/vakitler" className="card list-link">
            <IconCalendar size={20} />
            <span style={{ flex: 1 }}>30 günlük vakit listesi</span>
            <IconChevronRight size={16} />
          </Link>
          {!user && (
            <div className="card" style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center" }}>
              <div style={{ flex: 1, fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
                Google ile giriş yap; kayıtların tüm cihazlarında güvenle saklansın.
              </div>
              <button className="btn btn-subtle btn-sm" onClick={signIn}>
                <IconGoogle size={16} /> Giriş yap
              </button>
            </div>
          )}
          <InstallPrompt />
          {lastUpdated && (
            <div className="caption">
              Son güncelleme:{" "}
              {new Date(lastUpdated).toLocaleString("tr-TR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
