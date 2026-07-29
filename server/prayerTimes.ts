// Diyanet API proxy'sinin çekirdeği. Hem Vercel serverless fonksiyonu
// (api/prayer-times.ts) hem de Vite dev sunucusu (vite.config.ts) kullanır.
//
// Cache stratejisi:
//   1. bellek içi Map (Fluid Compute instance'ları istekler arası paylaşır)
//   2. isteğe bağlı Firestore `prayerTimesCache` koleksiyonu
//      (FIREBASE_SERVICE_ACCOUNT env değişkeni verilirse — kalıcı, tüm
//      instance'lar ve deploy'lar arasında paylaşılır)
// Bir şehir için 30 günlük veri tek istekte çekilir; bugün + en az 4 gün
// kapsandığı sürece upstream'e gidilmez. Upstream hatasında eldeki son
// geçerli veri (stale) döndürülür.

import type { Firestore } from "firebase-admin/firestore";
import { CITY_BY_SLUG, slugifyCity } from "../src/lib/cities";

type TimeKey = "imsak" | "gunes" | "ogle" | "ikindi" | "aksam" | "yatsi";

interface NormalizedDay {
  date: string;
  weekday: string;
  miladi: string;
  hicri: string;
  times: Record<TimeKey, string>;
}

interface CacheEntry {
  city: string;
  fetchedAt: number;
  days: NormalizedDay[];
  /** Yalnızca yerel geliştirmede üretilen örnek veri */
  demo?: boolean;
}

export interface HandlerResult {
  status: number;
  body: unknown;
}

const memCache = new Map<string, CacheEntry>();

const TR_MONTH_INDEX: Record<string, number> = {
  Ocak: 1, Şubat: 2, Mart: 3, Nisan: 4, Mayıs: 5, Haziran: 6,
  Temmuz: 7, Ağustos: 8, Eylül: 9, Ekim: 10, Kasım: 11, Aralık: 12,
};

function todayIstanbul(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** "29 Temmuz 2026 Çarşamba" → { date: "2026-07-29", weekday: "Çarşamba" } */
function parseMiladi(miladi: string): { date: string; weekday: string } | null {
  const parts = miladi.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const day = Number(parts[0]);
  const month = TR_MONTH_INDEX[parts[1]];
  const year = Number(parts[2]);
  if (!day || !month || !year) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${year}-${pad(month)}-${pad(day)}`, weekday: parts[3] ?? "" };
}

interface UpstreamDay {
  miladi_tarih: string;
  hicri_tarih: string;
  imsak: string;
  gunes: string;
  ogle: string;
  ikindi: string;
  aksam: string;
  yatsi: string;
}

function normalize(vakitler: UpstreamDay[], requestDay: string): NormalizedDay[] {
  const out: NormalizedDay[] = [];
  vakitler.forEach((v, i) => {
    const parsed = parseMiladi(v.miladi_tarih);
    out.push({
      date: parsed?.date ?? addDays(requestDay, i),
      weekday: parsed?.weekday ?? "",
      miladi: v.miladi_tarih,
      hicri: v.hicri_tarih,
      times: {
        imsak: v.imsak,
        gunes: v.gunes,
        ogle: v.ogle,
        ikindi: v.ikindi,
        aksam: v.aksam,
        yatsi: v.yatsi,
      },
    });
  });
  return out;
}

// ---- İsteğe bağlı Firestore cache (Admin SDK) ----

let adminDbPromise: Promise<Firestore | null> | null = null;

function getAdminDb(): Promise<Firestore | null> {
  if (!adminDbPromise) {
    adminDbPromise = (async () => {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) return null;
      try {
        const { initializeApp, cert, getApps } = await import("firebase-admin/app");
        const { getFirestore } = await import("firebase-admin/firestore");
        const creds = JSON.parse(raw);
        const app = getApps()[0] ?? initializeApp({ credential: cert(creds) });
        return getFirestore(app);
      } catch (err) {
        console.error("[prayer-times] Firestore cache devre dışı:", err);
        return null;
      }
    })();
  }
  return adminDbPromise;
}

async function readPersistentCache(slug: string): Promise<CacheEntry | null> {
  const db = await getAdminDb();
  if (!db) return null;
  try {
    const snap = await db.collection("prayerTimesCache").doc(slug).get();
    if (!snap.exists) return null;
    return snap.data() as CacheEntry;
  } catch (err) {
    console.error("[prayer-times] cache okunamadı:", err);
    return null;
  }
}

async function writePersistentCache(slug: string, entry: CacheEntry): Promise<void> {
  const db = await getAdminDb();
  if (!db) return;
  try {
    await db.collection("prayerTimesCache").doc(slug).set(entry);
  } catch (err) {
    console.error("[prayer-times] cache yazılamadı:", err);
  }
}

// ---- Upstream ----

async function fetchUpstream(slug: string, cityLabel: string): Promise<CacheEntry> {
  const key = process.env.DIYANET_API_KEY;
  if (!key) throw new Error("DIYANET_API_KEY tanımlı değil");
  const url = `https://diyanet.kkerem.com/?apikey=${encodeURIComponent(key)}&sehir=${encodeURIComponent(slug)}&gun=30`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`upstream HTTP ${res.status}`);
    const json = (await res.json()) as {
      durum?: string;
      kalan_kullanim?: number;
      sehir?: string;
      vakitler?: UpstreamDay[];
    };
    if (json.durum !== "basarili" || !Array.isArray(json.vakitler) || json.vakitler.length === 0) {
      throw new Error(`upstream durum: ${json.durum ?? "bilinmiyor"}`);
    }
    // kalan_kullanim kullanıcıya gösterilmez, yalnızca sunucu loglarında izlenir
    console.log(`[prayer-times] ${slug}: ${json.vakitler.length} gün çekildi, kalan kullanım: ${json.kalan_kullanim}`);
    return {
      city: json.sehir || cityLabel,
      fetchedAt: Date.now(),
      days: normalize(json.vakitler, todayIstanbul()),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---- Demo verisi (yalnızca yerel geliştirmede, API anahtarı yokken) ----

const DEMO_TIMES: Record<TimeKey, string> = {
  imsak: "04:04", gunes: "05:50", ogle: "13:16",
  ikindi: "17:11", aksam: "20:31", yatsi: "22:10",
};

const TR_WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const TR_MONTHS = Object.keys(TR_MONTH_INDEX);

function demoEntry(cityLabel: string): CacheEntry {
  const start = todayIstanbul();
  const days: NormalizedDay[] = [];
  for (let i = 0; i < 30; i++) {
    const date = addDays(start, i);
    const [y, m, d] = date.split("-").map(Number);
    const weekday = TR_WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    days.push({
      date,
      weekday,
      miladi: `${d} ${TR_MONTHS[m - 1]} ${y} ${weekday}`,
      hicri: "Örnek veri",
      times: DEMO_TIMES,
    });
  }
  return { city: cityLabel, fetchedAt: Date.now(), days, demo: true };
}

// ---- Ana işleyici ----

function coversToday(entry: CacheEntry, today: string): boolean {
  return entry.days.some((d) => d.date === today);
}

function remainingDays(entry: CacheEntry, today: string): number {
  return entry.days.filter((d) => d.date >= today).length;
}

function ok(slug: string, entry: CacheEntry, source: string): HandlerResult {
  const today = todayIstanbul();
  return {
    status: 200,
    body: {
      city: entry.city,
      citySlug: slug,
      lastUpdated: new Date(entry.fetchedAt).toISOString(),
      source: entry.demo ? "demo" : source,
      // dünden eski günleri gönderme (yanıtı küçük tut)
      days: entry.days.filter((d) => d.date >= addDays(today, -1)),
    },
  };
}

export async function handlePrayerTimes(
  cityParam: string,
  opts: { allowDemo?: boolean } = {},
): Promise<HandlerResult> {
  const slug = slugifyCity(cityParam ?? "");
  const city = CITY_BY_SLUG.get(slug);
  if (!city) {
    return {
      status: 400,
      body: { error: "unknown_city", message: "Şehir adına karşılık veri bulunamadı." },
    };
  }

  const today = todayIstanbul();

  let cached = memCache.get(slug) ?? null;
  if (!cached || !coversToday(cached, today)) {
    const persistent = await readPersistentCache(slug);
    if (persistent && (!cached || persistent.fetchedAt > cached.fetchedAt)) {
      cached = persistent;
      memCache.set(slug, persistent);
    }
  }

  if (cached && coversToday(cached, today) && remainingDays(cached, today) >= 4) {
    return ok(slug, cached, "cache");
  }

  if (!process.env.DIYANET_API_KEY && opts.allowDemo) {
    const entry = demoEntry(city.name);
    memCache.set(slug, entry);
    return ok(slug, entry, "demo");
  }

  try {
    const entry = await fetchUpstream(slug, city.name);
    memCache.set(slug, entry);
    await writePersistentCache(slug, entry);
    return ok(slug, entry, "api");
  } catch (err) {
    console.error(`[prayer-times] ${slug} güncellenemedi:`, err);
    if (cached && coversToday(cached, today)) {
      return ok(slug, cached, "stale-cache");
    }
    return {
      status: 503,
      body: { error: "unavailable", message: "Namaz vakitleri şu anda güncellenemedi." },
    };
  }
}
