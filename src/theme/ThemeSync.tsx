import { useEffect, useRef } from "react";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useAuth } from "../features/auth/AuthContext";
import { useTheme, type AccentKey, type ThemePref } from "./ThemeContext";

interface CloudTheme {
  pref?: ThemePref;
  accent?: AccentKey;
}

/**
 * Tema tercihlerini (açık/koyu + tema rengi) Firestore profiliyle eşitler:
 * girişte buluttaki tercih benimsenir, sonrasında her değişiklik buluta yazılır.
 * Görsel bir çıktı üretmez; AuthProvider ve ThemeProvider altında çalışır.
 */
export function ThemeSync() {
  const { user, profile } = useAuth();
  const { pref, setPref, accent, setAccent } = useTheme();
  // Buluttaki tercih benimsenmeden yerel değerleri yazma (yarış önlenir)
  const readyForUid = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !profile || readyForUid.current === user.uid) return;
    const cloud = (profile as { theme?: CloudTheme }).theme;
    if (cloud?.pref && cloud.pref !== pref) setPref(cloud.pref);
    if (cloud?.accent && cloud.accent !== accent) setAccent(cloud.accent);
    readyForUid.current = user.uid;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u || readyForUid.current !== u.uid) return;
    setDoc(doc(db, "users", u.uid), { theme: { pref, accent } }, { merge: true }).catch((err) =>
      console.error("Tema tercihi kaydedilemedi:", err),
    );
  }, [pref, accent]);

  return null;
}
