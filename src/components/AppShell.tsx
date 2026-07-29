import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  IconCalendar,
  IconFajr,
  IconProfile,
  IconStats,
} from "./icons";
import { useTimes } from "../features/prayer-times/TimesContext";
import { CityPicker } from "../features/city/CityPicker";

const NAV = [
  { to: "/", label: "Bugün", icon: IconFajr },
  { to: "/takvim", label: "Takvim", icon: IconCalendar },
  { to: "/istatistik", label: "İstatistik", icon: IconStats },
  { to: "/profil", label: "Profil", icon: IconProfile },
];

function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (online) return null;
  return <div className="offline-pill">İnternet bağlantısı yok</div>;
}

export function AppShell() {
  const { citySlug, pickerOpen } = useTimes();

  // İlk kurulum: şehir seçilmeden uygulama akışı başlamaz
  if (!citySlug) {
    return (
      <>
        <OfflineBanner />
        <CityPicker fullscreen />
      </>
    );
  }

  return (
    <>
      <OfflineBanner />
      <div className="app">
        <Outlet />
      </div>
      <nav className="bottom-nav" aria-label="Ana gezinme">
        <div className="bottom-nav-inner">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      {pickerOpen && <CityPicker />}
    </>
  );
}
