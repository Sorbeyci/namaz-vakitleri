import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { enablePush } from "../features/notifications/push";
import {
  IconCalendar,
  IconFajr,
  IconProfile,
  IconStats,
  IconUsers,
} from "./icons";
import { useHasFriends } from "../features/friends/useHasFriends";
import { useTimes } from "../features/prayer-times/TimesContext";
import { useSettings } from "../features/settings/SettingsContext";
import { useNotificationScheduler } from "../features/notifications/useNotificationScheduler";
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
  const { settings } = useSettings();
  const { user } = useAuth();
  const hasFriends = useHasFriends();
  useNotificationScheduler();

  // Girişli kullanıcının FCM token'ını güncel tut (token zaman içinde yenilenebilir)
  useEffect(() => {
    if (
      user &&
      settings.notif.enabled &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      void enablePush(user.uid);
    }
  }, [user, settings.notif.enabled]);

  // Takip modu kapalıyken takvim ve istatistik menüde gösterilmez;
  // Arkadaşlar sekmesi yalnızca en az bir arkadaş varsa görünür
  const navItems = (
    settings.tracking ? [...NAV] : NAV.filter((n) => n.to === "/" || n.to === "/profil")
  );
  if (hasFriends) {
    navItems.splice(navItems.length - 1, 0, {
      to: "/arkadaslar",
      label: "Arkadaşlar",
      icon: IconUsers,
    });
  }

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
          {navItems.map(({ to, label, icon: Icon }) => (
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
