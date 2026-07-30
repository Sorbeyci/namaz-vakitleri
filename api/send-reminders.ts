// Uygulama kapalıyken çalışan FCM push hatırlatmaları.
// Bir zamanlayıcı (GitHub Actions cron, ~5 dk'da bir) bu ucu CRON_SECRET ile
// çağırır; son çalıştırmadan bu yana penceresine düşen "vakitten X dk önce"
// ve "vakit girince" bildirimleri, bildirim açık kullanıcıların FCM
// token'larına gönderilir. Vakitler mevcut sunucu cache'inden okunur (ek
// Diyanet API maliyeti yok).

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminApp, getAdminDb } from "../server/admin.js";
import { handlePrayerTimes } from "../server/prayerTimes.js";
import { addDays, istanbulEpoch, todayIstanbul } from "../server/time.js";
import { PRAYERS } from "../src/lib/prayers.js";

const SITE_URL = "https://namaz-vakitleri-five.vercel.app/";

interface DayTimesLike {
  date: string;
  times: Record<string, string>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  const header = String(req.headers.authorization ?? "");
  const provided = header.replace(/^Bearer\s+/i, "") || String(req.query.key ?? "");
  if (!secret || provided !== secret) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const [db, app] = [await getAdminDb(), await getAdminApp()];
  if (!db || !app) {
    res.status(503).json({ error: "admin_unavailable", message: "FIREBASE_SERVICE_ACCOUNT gerekli" });
    return;
  }
  const { getMessaging } = await import("firebase-admin/messaging");
  const { FieldValue } = await import("firebase-admin/firestore");
  const messaging = getMessaging(app);

  // Test modu: ?test=1 ile çağrılırsa bildirim açık tüm kullanıcılara anında
  // bir deneme bildirimi gönderir — FCM zincirini beklemeden doğrulamak için.
  if (req.query.test !== undefined) {
    const snap = await db.collection("users").where("settings.notif.enabled", "==", true).get();
    let testSent = 0;
    let tokenCount = 0;
    for (const d of snap.docs) {
      const tokens = ((d.data().fcmTokens as string[] | undefined) ?? []).filter(Boolean);
      if (!tokens.length) continue;
      tokenCount += tokens.length;
      const resp = await messaging.sendEachForMulticast({
        tokens,
        webpush: {
          notification: {
            title: "Test bildirimi",
            body: "Namaz hatırlatmaları bu cihazda çalışıyor.",
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: "test",
          },
          fcmOptions: { link: SITE_URL },
        },
      });
      testSent += resp.successCount;
      const invalid: string[] = [];
      resp.responses.forEach((r, i) => {
        if (!r.error) return;
        console.error(`[reminders] test hata (${tokens[i].slice(0, 12)}…):`, r.error.code, r.error.message);
        if (
          r.error.code.includes("registration-token-not-registered") ||
          r.error.code.includes("invalid-argument")
        ) {
          invalid.push(tokens[i]);
        }
      });
      if (invalid.length) {
        await d.ref.update({ fcmTokens: FieldValue.arrayRemove(...invalid) }).catch(() => {});
      }
    }
    res.status(200).json({ test: true, tokens: tokenCount, sent: testSent });
    return;
  }

  const now = Date.now();
  // Pencere: son çalıştırmadan şimdiye; cron aksarsa en fazla 10 dk geriye bak
  const stateRef = db.collection("reminders").doc("state");
  const lastRun = ((await stateRef.get()).data()?.lastRunAt as number | undefined) ?? now - 5 * 60_000;
  const windowStart = Math.max(lastRun, now - 10 * 60_000);

  const usersSnap = await db.collection("users").where("settings.notif.enabled", "==", true).get();
  const today = todayIstanbul();
  const tomorrow = addDays(today, 1);

  // Şehir başına vakitleri bir kez çöz (cache'ten gelir)
  const cityTimes = new Map<string, Map<string, Record<string, string>>>();
  async function timesFor(city: string) {
    let m = cityTimes.get(city);
    if (!m) {
      m = new Map();
      const r = await handlePrayerTimes(city);
      if (r.status === 200) {
        for (const d of (r.body as { days: DayTimesLike[] }).days) m.set(d.date, d.times);
      }
      cityTimes.set(city, m);
    }
    return m;
  }

  let sent = 0;
  let candidates = 0;

  for (const userDoc of usersSnap.docs) {
    const u = userDoc.data() as {
      city?: string | null;
      fcmTokens?: string[];
      settings?: { notif?: { offsetMinutes?: number; atTime?: boolean } };
    };
    const tokens = Array.isArray(u.fcmTokens) ? u.fcmTokens.filter(Boolean) : [];
    if (!tokens.length || !u.city) continue;
    candidates++;

    const offset = Number(u.settings?.notif?.offsetMinutes) || 15;
    const atTime = !!u.settings?.notif?.atTime;
    const times = await timesFor(u.city);

    // Bugünün 5 vakti + yarının sabahı (gece yarısından sonra ilk hatırlatma)
    const targets: { name: string; date: string; time: string | undefined }[] = [];
    const t0 = times.get(today);
    if (t0) for (const p of PRAYERS) targets.push({ name: p.name, date: today, time: t0[p.timeKey] });
    const t1 = times.get(tomorrow);
    if (t1) targets.push({ name: "Sabah", date: tomorrow, time: t1.imsak });

    const messages: { title: string; body: string; tag: string }[] = [];
    for (const tg of targets) {
      if (!tg.time) continue;
      const target = istanbulEpoch(tg.date, tg.time);
      const preAt = target - offset * 60_000;
      if (preAt > windowStart && preAt <= now) {
        messages.push({
          title: `${tg.name} namazına ${offset} dakika kaldı`,
          body: `Vakit: ${tg.time}`,
          tag: `pre-${tg.date}-${tg.name}`,
        });
      }
      if (atTime && target > windowStart && target <= now) {
        messages.push({
          title: `${tg.name} vakti girdi`,
          body: `Vakit: ${tg.time}`,
          tag: `at-${tg.date}-${tg.name}`,
        });
      }
    }

    for (const m of messages) {
      const resp = await messaging.sendEachForMulticast({
        tokens,
        webpush: {
          notification: {
            title: m.title,
            body: m.body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: m.tag,
          },
          fcmOptions: { link: SITE_URL },
        },
      });
      sent += resp.successCount;
      const invalid: string[] = [];
      resp.responses.forEach((r, i) => {
        const code = r.error?.code ?? "";
        if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
          invalid.push(tokens[i]);
        }
      });
      if (invalid.length) {
        await userDoc.ref.update({ fcmTokens: FieldValue.arrayRemove(...invalid) }).catch(() => {});
      }
    }
  }

  await stateRef.set({ lastRunAt: now }, { merge: true });
  console.log(`[reminders] kullanıcı: ${candidates}, gönderilen: ${sent}`);
  res.status(200).json({ users: candidates, sent });
}
