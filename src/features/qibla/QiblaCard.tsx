import { useEffect, useRef, useState } from "react";
import { IconChevronRight, IconQibla } from "../../components/icons";
import { CITY_BY_SLUG } from "../../lib/cities";
import { useTimes } from "../prayer-times/TimesContext";

// Kıble açısı seçili il merkezinin koordinatından hesaplanır (çevrimdışı,
// konum izni gerekmez). Pusula, kullanıcı istediğinde cihaz yön sensörüyle
// başlatılır; iOS'ta sensör izni ilk dokunuşta istenir.

const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Kuzeyden saat yönünde kıble açısı (0-360°) */
export function qiblaBearing(lat: number, lon: number): number {
  const dLon = rad(KAABA_LON - lon);
  const y = Math.sin(dLon);
  const x = Math.cos(rad(lat)) * Math.tan(rad(KAABA_LAT)) - Math.sin(rad(lat)) * Math.cos(dLon);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

const DIRECTIONS = [
  "Kuzey", "Kuzeydoğu", "Doğu", "Güneydoğu",
  "Güney", "Güneybatı", "Batı", "Kuzeybatı",
];

function directionName(bearing: number): string {
  return DIRECTIONS[Math.round(bearing / 45) % 8];
}

type CompassState = "starting" | "active" | "unsupported" | "denied";

interface OrientationEventCtor {
  requestPermission?: () => Promise<"granted" | "denied">;
}

function Dial({ heading, bearing }: { heading: number; bearing: number }) {
  const diff = (((bearing - heading) % 360) + 360) % 360;
  const aligned = diff < 7 || diff > 353;
  return (
    <>
      <div className="qibla-dial-wrap">
        <span className="qibla-notch" aria-hidden="true" />
        <svg
          width="210"
          height="210"
          viewBox="-105 -105 210 210"
          className="qibla-dial"
          style={{ transform: `rotate(${-heading}deg)` }}
          aria-hidden="true"
        >
          <circle r="100" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line
              key={a}
              x1="0"
              y1="-100"
              x2="0"
              y2={a % 90 === 0 ? "-88" : "-94"}
              stroke="var(--text-faint)"
              strokeWidth={a === 0 ? 3 : 1.5}
              transform={`rotate(${a})`}
            />
          ))}
          <text y="-68" textAnchor="middle" fill="var(--danger)" fontWeight="700" fontSize="17">K</text>
          <text x="76" y="6" textAnchor="middle" fontSize="14" fill="var(--text-muted)">D</text>
          <text y="82" textAnchor="middle" fontSize="14" fill="var(--text-muted)">G</text>
          <text x="-76" y="6" textAnchor="middle" fontSize="14" fill="var(--text-muted)">B</text>
          <g transform={`rotate(${bearing})`}>
            <path d="M0 -96 L11 -68 L0 -77 L-11 -68 Z" fill="var(--primary)" />
            <line x1="0" y1="-68" x2="0" y2="-8" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" />
          </g>
          <circle r="5" fill="var(--text)" />
        </svg>
      </div>
      <div className={`qibla-status${aligned ? " ok" : ""}`}>
        {aligned
          ? "Kıbleye dönüksün"
          : "Telefonu düz tutup, oku üstteki işarete getirecek şekilde dön"}
      </div>
    </>
  );
}

export function QiblaCard() {
  const { citySlug, cityLabel } = useTimes();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CompassState>("starting");
  const [heading, setHeading] = useState<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const gotEvent = useRef(false);

  useEffect(() => () => cleanupRef.current?.(), []);

  const city = citySlug ? CITY_BY_SLUG.get(citySlug) : undefined;
  if (!city) return null;
  const bearing = qiblaBearing(city.lat, city.lon);

  const startCompass = async () => {
    setOpen(true);
    if (cleanupRef.current) return; // zaten dinliyor
    const DOE = window.DeviceOrientationEvent as unknown as OrientationEventCtor | undefined;
    if (!DOE) {
      setState("unsupported");
      return;
    }
    if (typeof DOE.requestPermission === "function") {
      try {
        if ((await DOE.requestPermission()) !== "granted") {
          setState("denied");
          return;
        }
      } catch {
        setState("denied");
        return;
      }
    }
    gotEvent.current = false;
    const handler = (e: DeviceOrientationEvent) => {
      const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading;
      let h: number | null = null;
      if (typeof webkit === "number") h = webkit;
      else if (e.alpha != null) h = (360 - e.alpha) % 360;
      if (h != null) {
        gotEvent.current = true;
        setHeading(h);
        setState("active");
      }
    };
    window.addEventListener("deviceorientationabsolute", handler as EventListener, true);
    window.addEventListener("deviceorientation", handler, true);
    cleanupRef.current = () => {
      window.removeEventListener("deviceorientationabsolute", handler as EventListener, true);
      window.removeEventListener("deviceorientation", handler, true);
      cleanupRef.current = null;
    };
    setState("starting");
    setTimeout(() => {
      if (!gotEvent.current) setState("unsupported");
    }, 2500);
  };

  return (
    <div className="card qibla-card">
      <button
        className="qibla-head"
        onClick={() => (open ? setOpen(false) : void startCompass())}
        aria-expanded={open}
      >
        <IconQibla size={22} />
        <span className="qibla-title">
          <b>Kıble</b>
          <span className="qibla-sub">
            {cityLabel} için {Math.round(bearing)}° · {directionName(bearing)}
          </span>
        </span>
        <span className={`qibla-chev${open ? " open" : ""}`}>
          <IconChevronRight size={16} />
        </span>
      </button>
      {open && (
        <div className="qibla-body">
          {state === "active" && heading !== null ? (
            <Dial heading={heading} bearing={bearing} />
          ) : state === "unsupported" ? (
            <p className="qibla-note">
              Bu cihazda pusula sensörü bulunamadı. Kıble, kuzeyden saat yönünde{" "}
              <b>{Math.round(bearing)}°</b> ({directionName(bearing).toLowerCase()}) yönündedir.
            </p>
          ) : state === "denied" ? (
            <p className="qibla-note">
              Pusula izni verilmedi. Kıble, kuzeyden saat yönünde <b>{Math.round(bearing)}°</b>{" "}
              yönündedir.
            </p>
          ) : (
            <p className="qibla-note">Pusula başlatılıyor…</p>
          )}
        </div>
      )}
    </div>
  );
}
