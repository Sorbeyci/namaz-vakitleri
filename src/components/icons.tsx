// Uygulamaya özel ikon seti. Tüm ikonlar aynı görsel dili paylaşır:
// 24x24 viewBox, 1.75 stroke, yuvarlak uç/köşe, dolgusuz çizgi.

import type { PrayerKey, TimeKey } from "../lib/prayers";

interface IconProps {
  size?: number;
  className?: string;
}

function Svg({ size = 22, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* Sabah — ufukta doğan güneş, yukarı ışıklar */
export function IconFajr(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 17h18" />
      <path d="M7 17a5 5 0 0 1 10 0" />
      <path d="M12 6v3" />
      <path d="M5.6 8.6l1.8 1.8" />
      <path d="M18.4 8.6l-1.8 1.8" />
    </Svg>
  );
}

/* Güneş (doğuş) — ufkun üzerinde beliren yarım güneş */
export function IconSunrise(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 18h18" />
      <path d="M8 18a4 4 0 0 1 8 0" />
      <path d="M12 4v3M9.5 5.5L12 3l2.5 2.5" />
    </Svg>
  );
}

/* Öğle — tepede güneş */
export function IconDhuhr(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </Svg>
  );
}

/* İkindi — yana doğru alçalan güneş */
export function IconAsr(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="14.5" cy="9.5" r="3.5" />
      <path d="M14.5 2.5v1.5M21.5 9.5H20M19.5 4.5l-1.1 1.1" />
      <path d="M3 15.5h13" />
      <path d="M5 19h9" />
    </Svg>
  );
}

/* Akşam — batan güneş, aşağı ok */
export function IconMaghrib(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 18h18" />
      <path d="M8 18a4 4 0 0 1 8 0" />
      <path d="M12 7V4M9.5 5.5L12 8l2.5-2.5" />
    </Svg>
  );
}

/* Yatsı — hilal ve küçük yıldız */
export function IconIsha(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />
      <path d="M17 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z" />
    </Svg>
  );
}

/* Kıble — yön oku */
export function IconQibla(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l3.5 8.5L12 13.6 8.5 15.5 12 7Z" />
    </Svg>
  );
}

/* Takvim */
export function IconCalendar(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
      <path d="M4 10h16" />
      <path d="M8.5 3.5v3M15.5 3.5v3" />
      <path d="M9 14.5h.01M12 14.5h.01M15 14.5h.01" />
    </Svg>
  );
}

/* Şehir */
export function IconCity(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 20.5h17" />
      <path d="M5.5 20.5V10l4.5-3v13.5" />
      <path d="M13.5 20.5V6.5l5 3.5v10.5" />
      <path d="M7.5 13h.01M7.5 16.5h.01M16 13.5h.01M16 17h.01" />
    </Svg>
  );
}

/* Tamamlanan namaz */
export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

/* Bekleyen namaz */
export function IconPending(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5l2.8 1.7" />
    </Svg>
  );
}

/* İstatistik */
export function IconStats(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 20V13" />
      <path d="M10.5 20V8" />
      <path d="M16 20v-9" />
      <path d="M21 20H3" />
      <path d="M16 5.5h4.5" />
    </Svg>
  );
}

/* Profil */
export function IconProfile(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  );
}

/* Kaza — geriye dönüş oku */
export function IconQada(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 9.5h11a5 5 0 0 1 0 10H8" />
      <path d="M7.5 6L4 9.5 7.5 13" />
    </Svg>
  );
}

/* Konum — harita iğnesi */
export function IconLocation(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19 10.5c0 5-7 10-7 10s-7-5-7-10a7 7 0 0 1 14 0Z" />
      <circle cx="12" cy="10.5" r="2.5" />
    </Svg>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </Svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconChevronLeft(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.5 6L8.5 12l6 6" />
    </Svg>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.5 6l6 6-6 6" />
    </Svg>
  );
}

export function IconInfo(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 7.8h.01" />
    </Svg>
  );
}

export function IconLogout(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 4.5H6.5A2.5 2.5 0 0 0 4 7v10a2.5 2.5 0 0 0 2.5 2.5H9" />
      <path d="M15 8l4 4-4 4M19 12H9.5" />
    </Svg>
  );
}

export function IconTrash(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 6.5h15" />
      <path d="M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8v1.7" />
      <path d="M6.5 6.5l.8 12A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-1.9l.8-12.1" />
      <path d="M10 10.5v6M14 10.5v6" />
    </Svg>
  );
}

export function IconDownload(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v10M8 10.5l4 4 4-4" />
      <path d="M5 19.5h14" />
    </Svg>
  );
}

export function IconShare(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 14V4M8.5 6.5L12 3l3.5 3.5" />
      <path d="M6.5 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5" />
    </Svg>
  );
}

export function IconBell(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 16.5v-6a6 6 0 0 1 12 0v6l1.5 2h-15L6 16.5Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function IconTheme(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" />
      <path d="M12 7a5 5 0 0 1 0 10" fill="currentColor" stroke="none" opacity="0.3" />
    </Svg>
  );
}

export function IconGoogle(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20.5 12.2c0-.6-.05-1.2-.16-1.7H12v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.6Z" />
      <path d="M12 20.5c2.4 0 4.4-.8 5.9-2.1l-2.9-2.2c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3a8.5 8.5 0 0 0 8 4.8Z" />
      <path d="M7 13.4a5.1 5.1 0 0 1 0-3.3V7.8H4a8.5 8.5 0 0 0 0 7.9l3-2.3Z" />
      <path d="M12 6.9c1.3 0 2.5.4 3.4 1.3l2.6-2.6A8.5 8.5 0 0 0 4 7.8l3 2.3c.7-2.1 2.7-3.2 5-3.2Z" />
    </Svg>
  );
}

/* Vakit anahtarı → ikon eşlemesi */
const TIME_ICONS: Record<TimeKey, (p: IconProps) => React.ReactElement> = {
  imsak: IconFajr,
  gunes: IconSunrise,
  ogle: IconDhuhr,
  ikindi: IconAsr,
  aksam: IconMaghrib,
  yatsi: IconIsha,
};

const PRAYER_ICONS: Record<PrayerKey, (p: IconProps) => React.ReactElement> = {
  fajr: IconFajr,
  dhuhr: IconDhuhr,
  asr: IconAsr,
  maghrib: IconMaghrib,
  isha: IconIsha,
};

export function TimeIcon({ timeKey, ...p }: IconProps & { timeKey: TimeKey }) {
  const C = TIME_ICONS[timeKey];
  return <C {...p} />;
}

export function PrayerIcon({ prayerKey, ...p }: IconProps & { prayerKey: PrayerKey }) {
  const C = PRAYER_ICONS[prayerKey];
  return <C {...p} />;
}
