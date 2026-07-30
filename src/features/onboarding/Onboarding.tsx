import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  IconAsr,
  IconBell,
  IconCheck,
  IconChevronRight,
  IconDhuhr,
  IconFajr,
  IconPending,
} from "../../components/icons";
import { KEYS, readString, writeString } from "../../lib/storage";

// Reels gibi dikey kaydırılan tanıtım ekranı. İlk açılışta bir kez gösterilir;
// Profil'deki "Uygulama rehberi" satırından tekrar açılabilir.

const OnboardingContext = createContext<{ open: () => void }>({ open: () => {} });

export function useOnboarding() {
  return useContext(OnboardingContext);
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(() => readString(KEYS.onboarded) !== "1");
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => {
    writeString(KEYS.onboarded, "1");
    setVisible(false);
  }, []);

  return (
    <OnboardingContext.Provider value={{ open }}>
      {children}
      {visible && <OnboardingOverlay onClose={close} />}
    </OnboardingContext.Provider>
  );
}

/** Uygulama motifinin (hilal + sekiz köşeli yıldız) satır içi çizimi */
function Motif({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <linearGradient id="obg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--card-a)" />
          <stop offset="1" stopColor="var(--card-b)" />
        </linearGradient>
        <mask id="obm">
          <rect width="512" height="512" fill="white" />
          <circle cx="342" cy="192" r="152" fill="black" />
        </mask>
      </defs>
      <circle cx="244" cy="276" r="186" fill="url(#obg)" mask="url(#obm)" />
      <g transform="translate(374,138)" fill="url(#obg)">
        <rect x="-46" y="-46" width="92" height="92" rx="12" />
        <rect x="-46" y="-46" width="92" height="92" rx="12" transform="rotate(45)" />
      </g>
    </svg>
  );
}

function OnboardingOverlay({ onClose }: { onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const SLIDE_COUNT = 5;

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== active) setActive(Math.min(SLIDE_COUNT - 1, Math.max(0, idx)));
  };

  return (
    <div className="onboard">
      <button className="onboard-skip" onClick={onClose}>
        Atla
      </button>

      <div className="onboard-scroll" ref={scrollRef} onScroll={onScroll}>
        {/* 1 — Hoş geldin */}
        <section className="onboard-slide">
          <Motif />
          <h2>Namaz 365'e hoş geldin</h2>
          <p>
            Vakitleri gör, namazlarını işaretle, düzenini koru. Nasıl çalıştığını
            görmek için kaydır.
          </p>
          <div className="ob-hint">
            <IconChevronRight size={22} />
          </div>
        </section>

        {/* 2 — Sıradaki namaz */}
        <section className="onboard-slide">
          <div className="ob-card">
            <div className="ob-card-icon">
              <IconAsr size={30} />
            </div>
            <div>
              <div className="ob-card-label">Sıradaki namaz</div>
              <div className="ob-card-name">İkindi</div>
              <div className="ob-card-time">17:11</div>
              <div className="ob-card-rem">
                <span className="pulse-dot" />
                İkindi namazına 1 saat 24 dakika kaldı
              </div>
            </div>
          </div>
          <h2>Sıradaki namazı bir bakışta gör</h2>
          <p>
            Ana ekrandaki kart kalan süreyi saniye saniye sayar, vakit yaklaştıkça
            dolar ve son 15 dakikada koyulaşarak seni nazikçe uyarır.
          </p>
        </section>

        {/* 3 — İşaretleme */}
        <section className="onboard-slide">
          <div className="ob-rows">
            <div className="ob-row">
              <span className="ob-row-icon">
                <IconFajr size={20} />
              </span>
              <span className="ob-row-main">
                <b>Sabah</b>
                <em className="done">Kılındı</em>
              </span>
              <span className="ob-row-time">04:04</span>
              <span className="ob-mark done">
                <IconCheck size={16} />
              </span>
            </div>
            <div className="ob-row now">
              <span className="ob-row-icon">
                <IconDhuhr size={20} />
              </span>
              <span className="ob-row-main">
                <b>Öğle</b>
                <em className="cur">Vakti girdi</em>
              </span>
              <span className="ob-row-time">13:16</span>
              <span className="ob-mark markable">
                <IconPending size={16} />
              </span>
            </div>
          </div>
          <h2>Tek dokunuşla işaretle</h2>
          <p>
            Vakti giren namazı daireye dokunarak "Kılındı" yap. Kaçırdıklarını
            sonradan kılındı ya da kaza olarak işaretleyebilirsin.
          </p>
        </section>

        {/* 4 — Takvim ve istatistik */}
        <section className="onboard-slide">
          <div className="ob-cal">
            {["full", "full", "partial", "full", "empty", "full", "partial"].map(
              (t, i) => (
                <span key={i} className="ob-day">
                  {22 + i}
                  <span className={`cal-dot ${t}`} />
                </span>
              ),
            )}
          </div>
          <div className="ob-progress">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: "80%" }} />
            </div>
            <span>Bu hafta 35 vakitten 28 tanesini tamamladın.</span>
          </div>
          <h2>Takvim ve istatistiklerle takip et</h2>
          <p>
            Geçmiş günlerini takvimden incele, haftalık ve aylık ilerlemeni
            istatistik ekranında gör.
          </p>
        </section>

        {/* 5 — Bildirimler */}
        <section className="onboard-slide">
          <div className="ob-bell">
            <IconBell size={44} />
          </div>
          <h2>Vakti hiç kaçırma</h2>
          <p>
            Profil'den hatırlatmaları aç: vakitten 10, 15 veya 30 dakika önce —
            uygulama kapalıyken bile — bildirim al.
          </p>
          <button className="btn btn-primary btn-block" onClick={onClose}>
            Başla
          </button>
        </section>
      </div>

      <div className="onboard-dots" aria-hidden="true">
        {Array.from({ length: SLIDE_COUNT }, (_, i) => (
          <span key={i} className={i === active ? "on" : ""} />
        ))}
      </div>
    </div>
  );
}
