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
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { DayLog, EntryStatus, LogsMap, PrayerKey } from "../../lib/prayers";
import { KEYS, readJSON, remove, writeJSON } from "../../lib/storage";
import { useAuth } from "../auth/AuthContext";
import { useTimes } from "../prayer-times/TimesContext";
import { useToast } from "../../components/ui";

interface DayDoc {
  city?: string;
  prayers?: DayLog;
}

interface LogsContextValue {
  logs: LogsMap;
  /** Firestore aboneliği ilk veriyi getirene kadar true (misafirde hep false) */
  loading: boolean;
  /**
   * status null → kaydı geri al.
   * Başarısızsa toast gösterir; iyimser güncelleme yapılır.
   */
  markPrayer: (date: string, prayer: PrayerKey, status: EntryStatus | null) => void;
}

const LogsContext = createContext<LogsContextValue | null>(null);

export function useLogs() {
  const ctx = useContext(LogsContext);
  if (!ctx) throw new Error("useLogs, LogsProvider içinde kullanılmalı");
  return ctx;
}

export function LogsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { citySlug } = useTimes();
  const toast = useToast();
  const [logs, setLogs] = useState<LogsMap>({});
  const [loading, setLoading] = useState(false);
  const mergedForUid = useRef<string | null>(null);

  // Kaynağa (misafir ↔ hesap) göre kayıtları yükle
  useEffect(() => {
    if (!user) {
      setLogs(readJSON<LogsMap>(KEYS.logs) ?? {});
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "days"),
      (snap) => {
        const next: LogsMap = {};
        snap.forEach((d) => {
          const data = d.data() as DayDoc;
          if (data.prayers) next[d.id] = data.prayers;
        });
        setLogs(next);
        setLoading(false);
      },
      (err) => {
        console.error("Kayıtlar yüklenemedi:", err);
        setLoading(false);
        toast("Kayıtların yüklenemedi. Bağlantını kontrol et.");
      },
    );
    return unsub;
  }, [user, toast]);

  // Girişte cihazdaki misafir kayıtlarını hesapla birleştir.
  // Kural: buluttaki kayıt korunur, yalnızca bulutta olmayanlar aktarılır —
  // böylece hiçbir tarafın "kılındı" bilgisi kaybolmaz.
  useEffect(() => {
    if (!user || loading || mergedForUid.current === user.uid) return;
    mergedForUid.current = user.uid;
    const local = readJSON<LogsMap>(KEYS.logs);
    if (!local || Object.keys(local).length === 0) return;

    (async () => {
      const batch = writeBatch(db);
      let moved = 0;
      for (const [date, dayLog] of Object.entries(local)) {
        const cloudDay = logs[date] ?? {};
        const missing: DayLog = {};
        for (const [prayer, entry] of Object.entries(dayLog)) {
          if (entry && !cloudDay[prayer as PrayerKey]) {
            missing[prayer as PrayerKey] = entry;
            moved++;
          }
        }
        if (Object.keys(missing).length > 0) {
          batch.set(
            doc(db, "users", user.uid, "days", date),
            { city: citySlug ?? "", prayers: missing },
            { merge: true },
          );
        }
      }
      try {
        if (moved > 0) {
          await batch.commit();
          toast("Cihazdaki kayıtlar hesabına aktarıldı.");
        }
        remove(KEYS.logs);
      } catch (err) {
        console.error("Yerel kayıtlar aktarılamadı:", err);
        mergedForUid.current = null; // sonraki açılışta tekrar dene
      }
    })();
  }, [user, loading, logs, citySlug, toast]);

  const markPrayer = useCallback(
    (date: string, prayer: PrayerKey, status: EntryStatus | null) => {
      const entry = status ? { status, completedAt: Date.now() } : null;

      if (!user) {
        setLogs((prev) => {
          const day: DayLog = { ...prev[date] };
          if (entry) day[prayer] = entry;
          else delete day[prayer];
          const next = { ...prev, [date]: day };
          if (Object.keys(day).length === 0) delete next[date];
          writeJSON(KEYS.logs, next);
          return next;
        });
        return;
      }

      // İyimser güncelleme; gerçek durum onSnapshot ile gelir
      setLogs((prev) => {
        const day: DayLog = { ...prev[date] };
        if (entry) day[prayer] = entry;
        else delete day[prayer];
        return { ...prev, [date]: day };
      });
      setDoc(
        doc(db, "users", user.uid, "days", date),
        { city: citySlug ?? "", prayers: { [prayer]: entry ?? deleteField() } },
        { merge: true },
      ).catch((err) => {
        console.error("Kayıt oluşturulamadı:", err);
        toast("Namaz kaydı oluşturulamadı. Lütfen tekrar dene.");
      });
    },
    [user, citySlug, toast],
  );

  const value = useMemo(() => ({ logs, loading, markPrayer }), [logs, loading, markPrayer]);

  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>;
}
