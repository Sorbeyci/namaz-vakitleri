import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import {
  normalizeSettings,
  type AppSettings,
  type NotifPrefs,
} from "../../lib/settings";
import { KEYS, readJSON, writeJSON } from "../../lib/storage";
import { useAuth } from "../auth/AuthContext";

interface SettingsContextValue {
  settings: AppSettings;
  setTracking: (on: boolean) => void;
  setNotif: (patch: Partial<NotifPrefs>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings, SettingsProvider içinde kullanılmalı");
  return ctx;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(() =>
    normalizeSettings(readJSON(KEYS.settings)),
  );
  const adoptedForUid = useRef<string | null>(null);

  // Girişte buluttaki ayarları benimse (bir kez, uid başına)
  useEffect(() => {
    if (!user || !profile || adoptedForUid.current === user.uid) return;
    adoptedForUid.current = user.uid;
    if (profile.settings) {
      const next = normalizeSettings(profile.settings);
      setSettings(next);
      writeJSON(KEYS.settings, next);
    }
  }, [user, profile]);

  const apply = useCallback((updater: (prev: AppSettings) => AppSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      writeJSON(KEYS.settings, next);
      const u = auth.currentUser;
      if (u) {
        setDoc(doc(db, "users", u.uid), { settings: next }, { merge: true }).catch((err) =>
          console.error("Ayarlar kaydedilemedi:", err),
        );
      }
      return next;
    });
  }, []);

  const setTracking = useCallback(
    (on: boolean) => apply((prev) => ({ ...prev, tracking: on })),
    [apply],
  );

  const setNotif = useCallback(
    (patch: Partial<NotifPrefs>) =>
      apply((prev) => ({ ...prev, notif: { ...prev.notif, ...patch } })),
    [apply],
  );

  const value = useMemo(
    () => ({ settings, setTracking, setNotif }),
    [settings, setTracking, setNotif],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
