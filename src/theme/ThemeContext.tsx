import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { KEYS, readString, writeString } from "../lib/storage";

export type ThemePref = "light" | "dark" | "system";

export type AccentKey = "zumrut" | "firuze" | "lacivert" | "kehribar";

/** İslami sanattan ilhamla 4 tema rengi; color değeri seçim yuvarlağında gösterilir */
export const ACCENTS: { key: AccentKey; label: string; color: string }[] = [
  { key: "zumrut", label: "Zümrüt", color: "#11675c" },
  { key: "firuze", label: "Firuze", color: "#0d7285" },
  { key: "lacivert", label: "Lacivert", color: "#2e4b96" },
  { key: "kehribar", label: "Kehribar", color: "#8a5f14" },
];

const ACCENT_KEYS = new Set(ACCENTS.map((a) => a.key));

interface ThemeContextValue {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  accent: AccentKey;
  setAccent: (a: AccentKey) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  pref: "system",
  setPref: () => {},
  accent: "zumrut",
  setAccent: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function apply(pref: ThemePref) {
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function applyAccent(accent: AccentKey) {
  document.documentElement.dataset.accent = accent;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    const stored = readString(KEYS.theme);
    return stored === "light" || stored === "dark" ? stored : "system";
  });
  const [accent, setAccentState] = useState<AccentKey>(() => {
    const stored = readString(KEYS.accent);
    return stored && ACCENT_KEYS.has(stored as AccentKey) ? (stored as AccentKey) : "zumrut";
  });

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    writeString(KEYS.theme, p);
    apply(p);
  }, []);

  const setAccent = useCallback((a: AccentKey) => {
    setAccentState(a);
    writeString(KEYS.accent, a);
    applyAccent(a);
  }, []);

  useEffect(() => {
    apply(pref);
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  return (
    <ThemeContext.Provider value={{ pref, setPref, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}
