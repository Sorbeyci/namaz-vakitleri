import { Link } from "react-router-dom";
import {
  IconCheck,
  IconChevronRight,
  IconGoogle,
  IconInfo,
  IconPending,
  IconProfile,
  PrayerIcon,
  TimeIcon,
} from "../components/icons";
import { Spinner, StateScreen, useToast } from "../components/ui";
import { useAuth } from "../features/auth/AuthContext";
import { useTimes } from "../features/prayer-times/TimesContext";
import { useLogs } from "../features/tracking/LogsContext";
import { InstallPrompt } from "../features/pwa/InstallPrompt";
import { formatDuration } from "../lib/dates";
import { PRAYERS, STATUS_LABELS, type DerivedStatus } from "../lib/prayers";
import { deriveStatus, findNextPrayer } from "../lib/status";

function NextPrayerCard() {
  const { days, now } = useTimes();
  const next = findNextPrayer(days, now.dateKey, now.minutes);
  if (!next) return null;
  return (
    <div className="next-card">
      <div className="next-card-icon">
        <PrayerIcon prayerKey={next.def.key} size={36} />
      </div>
      <div>
        <div className="next-card-label">Sıradaki namaz</div>
        <div className="next-card-name">{next.def.name}</div>
        <div className="next-card-time">{next.time}</div>
        <div className="next-card-remaining">
          {next.def.name} namazına {formatDuration(next.minutesLeft)} kaldı
          {!next.isToday && " (yarın)"}
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
  const toast = useToast();
  if (!today) return null;
  const dayLog = logs[today.date];

  return (
    <div className="card prayer-list">
      {PRAYERS.slice(0, 1).map((def) => (
        <PrayerRowView key={def.key} def={def} />
      ))}
      {/* Güneş: bilgi satırı, işaretlenemez */}
      <div className="prayer-row info">
        <span className="prayer-row-icon">
          <TimeIcon timeKey="gunes" />
        </span>
        <div className="prayer-row-main">
          <div className="prayer-row-name">Güneş</div>
          <div className="prayer-row-status">Sabah namazının vakti çıkar</div>
        </div>
        <span className="prayer-row-time">{today.times.gunes}</span>
        <span style={{ width: 40 }} />
      </div>
      {PRAYERS.slice(1).map((def) => (
        <PrayerRowView key={def.key} def={def} />
      ))}
    </div>
  );

  function PrayerRowView({ def }: { def: (typeof PRAYERS)[number] }) {
    const t = today!;
    const status = deriveStatus(def, t, dayLog, now.minutes);
    const marked = status === "completed" || status === "qada";

    const onMark = () => {
      if (marked) {
        markPrayer(t.date, def.key, null);
        toast(`${def.name} namazı işareti geri alındı.`);
      } else if (status === "current") {
        markPrayer(t.date, def.key, "completed");
        toast(`${def.name} namazı kaydedildi.`);
      } else if (status === "missed") {
        markPrayer(t.date, def.key, "qada");
        toast(`${def.name} namazı kaza edildi olarak kaydedildi.`);
      }
    };

    return (
      <div className={`prayer-row${status === "current" ? " current" : ""}`}>
        <span className="prayer-row-icon">
          <TimeIcon timeKey={def.timeKey} />
        </span>
        <div className="prayer-row-main">
          <div className="prayer-row-name">{def.name}</div>
          <div className={`prayer-row-status ${STATUS_CLASS[status] ?? ""}`}>
            {STATUS_LABELS[status]}
          </div>
        </div>
        <span className="prayer-row-time">{t.times[def.timeKey]}</span>
        {status === "missed" ? (
          <button className="qada-btn" onClick={onMark}>
            Kaza et
          </button>
        ) : (
          <button
            className={`mark-btn${marked ? (status === "qada" ? " qada" : " done") : status === "current" ? " markable" : ""}`}
            onClick={onMark}
            disabled={status === "notYet"}
            aria-label={
              marked
                ? `${def.name} işaretini geri al`
                : `${def.name} namazını kılındı olarak işaretle`
            }
          >
            {marked ? <IconCheck size={20} /> : <IconPending size={20} />}
          </button>
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
