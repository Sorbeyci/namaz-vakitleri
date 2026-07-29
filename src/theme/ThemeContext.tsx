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

interface ThemeContextValue {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  pref: "system",
  setPref: () => {},
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    const stored = readString(KEYS.theme);
    return stored === "light" || stored === "dark" ? stored : "system";
  });

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    writeString(KEYS.theme, p);
    apply(p);
  }, []);

  useEffect(() => {
    apply(pref);
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  return <ThemeContext.Provider value={{ pref, setPref }}>{children}</ThemeContext.Provider>;
}
