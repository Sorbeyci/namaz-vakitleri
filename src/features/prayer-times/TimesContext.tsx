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
import { fetchPrayerTimes, type TimesResponse } from "../../lib/api";
import { cityName } from "../../lib/cities";
import { addDaysKey, nowIstanbul, type IstanbulNow } from "../../lib/dates";
import type { DayTimes } from "../../lib/prayers";
import { KEYS, readJSON, readString, writeJSON, writeString } from "../../lib/storage";
import { useAuth } from "../auth/AuthContext";

interface StoredTimes {
  fetchedAt: number;
  data: TimesResponse;
}

type TimesStatus = "no-city" | "loading" | "ready" | "error";

interface TimesContextValue {
  citySlug: string | null;
  cityLabel: string;
  status: TimesStatus;
  /** Veri güncellenemedi, eski (cache) veri gösteriliyor */
  stale: boolean;
  demo: boolean;
  lastUpdated: string | null;
  errorMessage: string | null;
  days: DayTimes[];
  today: DayTimes | null;
  tomorrow: DayTimes | null;
  now: IstanbulNow;
  recentCities: string[];
  /** Şehrin nasıl seçildiği — "location" ise konumdan otomatik bulundu */
  citySource: "manual" | "location";
  selectCity: (slug: string, source?: "manual" | "location") => void;
  retry: () => void;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
}

const TimesContext = createContext<TimesContextValue | null>(null);

export function useTimes() {
  const ctx = useContext(TimesContext);
  if (!ctx) throw new Error("useTimes, TimesProvider içinde kullanılmalı");
  return ctx;
}

function coversToday(data: TimesResponse | null, today: string): boolean {
  return !!data?.days.some((d) => d.date === today);
}

/** Dakikada bir güncellenen Türkiye saati */
function useNow(): IstanbulNow {
  const [now, setNow] = useState<IstanbulNow>(() => nowIstanbul());
  useEffect(() => {
    const t = setInterval(() => {
      setNow((prev) => {
        const next = nowIstanbul();
        return next.dateKey === prev.dateKey && next.minutes === prev.minutes ? prev : next;
      });
    }, 20000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function TimesProvider({ children }: { children: ReactNode }) {
  const { profile, updateProfileCity } = useAuth();
  const now = useNow();
  const [citySlug, setCitySlug] = useState<string | null>(() => readString(KEYS.city));
  const [data, setData] = useState<TimesResponse | null>(null);
  const [status, setStatus] = useState<TimesStatus>(citySlug ? "loading" : "no-city");
  const [stale, setStale] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recentCities, setRecentCities] = useState<string[]>(
    () => readJSON<string[]>(KEYS.recentCities) ?? [],
  );
  const [citySource, setCitySource] = useState<"manual" | "location">(() =>
    readString(KEYS.citySource) === "location" ? "location" : "manual",
  );
  const loadSeq = useRef(0);

  const load = useCallback(async (slug: string) => {
    const seq = ++loadSeq.current;
    const today = nowIstanbul().dateKey;
    const stored = readJSON<StoredTimes>(KEYS.times(slug));
    const storedValid = stored && coversToday(stored.data, today) ? stored : null;

    // Yeterince taze yerel kopya varsa ağa hiç çıkma
    if (storedValid && Date.now() - storedValid.fetchedAt < 6 * 3600_000) {
      setData(storedValid.data);
      setStale(false);
      setErrorMessage(null);
      setStatus("ready");
      return;
    }

    if (storedValid) {
      // beklerken eldeki veriyi göster
      setData(storedValid.data);
      setStatus("ready");
    } else {
      setStatus("loading");
    }
    setStale(false);
    setErrorMessage(null);

    try {
      const res = await fetchPrayerTimes(slug);
      if (seq !== loadSeq.current) return;
      writeJSON(KEYS.times(slug), { fetchedAt: Date.now(), data: res } satisfies StoredTimes);
      setData(res);
      setStale(res.source === "stale-cache");
      setStatus("ready");
    } catch (err) {
      if (seq !== loadSeq.current) return;
      if (storedValid) {
        setData(storedValid.data);
        setStale(true);
        setStatus("ready");
      } else {
        setErrorMessage((err as Error).message || "Namaz vakitleri şu anda güncellenemedi.");
        setStatus("error");
      }
    }
  }, []);

  // Şehir değişince vakitleri çek
  useEffect(() => {
    if (citySlug) void load(citySlug);
    else setStatus("no-city");
  }, [citySlug, load]);

  // Gün değişince (gece yarısı) bugünü kapsamayan cache'i tazele
  useEffect(() => {
    if (citySlug && data && !coversToday(data, now.dateKey)) void load(citySlug);
  }, [now.dateKey, citySlug, data, load]);

  // Girişte buluttaki şehir tercihini benimse
  useEffect(() => {
    if (profile?.city && profile.city !== citySlug) {
      setCitySlug(profile.city);
      writeString(KEYS.city, profile.city);
    } else if (profile && !profile.city && citySlug) {
      updateProfileCity(citySlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const selectCity = useCallback(
    (slug: string, source: "manual" | "location" = "manual") => {
      setCitySlug(slug);
      writeString(KEYS.city, slug);
      setCitySource(source);
      writeString(KEYS.citySource, source);
      setRecentCities((prev) => {
        const next = [slug, ...prev.filter((s) => s !== slug)].slice(0, 5);
        writeJSON(KEYS.recentCities, next);
        return next;
      });
      updateProfileCity(slug);
      setPickerOpen(false);
    },
    [updateProfileCity],
  );

  const value = useMemo<TimesContextValue>(() => {
    const days = data?.days ?? [];
    return {
      citySlug,
      cityLabel: data?.city ?? cityName(citySlug),
      status,
      stale,
      demo: data?.source === "demo",
      lastUpdated: data?.lastUpdated ?? null,
      errorMessage,
      days,
      today: days.find((d) => d.date === now.dateKey) ?? null,
      tomorrow: days.find((d) => d.date === addDaysKey(now.dateKey, 1)) ?? null,
      now,
      recentCities,
      citySource,
      selectCity,
      retry: () => {
        if (citySlug) void load(citySlug);
      },
      pickerOpen,
      openPicker: () => setPickerOpen(true),
      closePicker: () => setPickerOpen(false),
    };
  }, [citySlug, data, status, stale, errorMessage, now, recentCities, citySource, selectCity, pickerOpen, load]);

  return <TimesContext.Provider value={value}>{children}</TimesContext.Provider>;
}
