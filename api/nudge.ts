// Arkadaşa "namaz hatırlatması" (dürtme) gönderir.
// Çağıran, Firebase ID token'ı ile kimliğini kanıtlar; sunucu arkadaşlığı,
// hedefin şu anki vaktini ve işaretleme durumunu doğrular, vakit başına
// gönderen-alıcı çifti için tek hatırlatmaya izin verir ve FCM push atar.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminApp, getAdminDb } from "../server/admin.js";
import { handlePrayerTimes } from "../server/prayerTimes.js";
import { isFriday, istanbulEpoch, todayIstanbul } from "../server/time.js";
import { PRAYERS } from "../src/lib/prayers.js";

const SITE_URL = "https://namaz365.com/";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const [db, app] = [await getAdminDb(), await getAdminApp()];
  if (!db || !app) {
    res.status(503).json({ error: "admin_unavailable" });
    return;
  }

  // 1) Kimlik: Firebase ID token
  const idToken = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!idToken) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const { getAuth } = await import("firebase-admin/auth");
  let sender: { uid: string; name?: string };
  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    sender = { uid: decoded.uid, name: decoded.name as string | undefined };
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const targetUid = String((req.body as { targetUid?: string })?.targetUid ?? "");
  if (!targetUid || targetUid === sender.uid) {
    res.status(400).json({ error: "bad_request" });
    return;
  }

  // 2) Arkadaşlık doğrulaması
  const friendship = await db.doc(`users/${targetUid}/friends/${sender.uid}`).get();
  if (!friendship.exists) {
    res.status(403).json({ error: "not_friends" });
    return;
  }

  // 3) Hedefin şu anki vakti (kendi şehrine göre)
  const targetDoc = await db.doc(`users/${targetUid}`).get();
  const target = targetDoc.data() as
    | { city?: string | null; fcmTokens?: string[]; displayName?: string | null }
    | undefined;
  if (!target?.city) {
    res.status(200).json({ status: "no_city" });
    return;
  }
  const today = todayIstanbul();
  const timesRes = await handlePrayerTimes(target.city);
  if (timesRes.status !== 200) {
    res.status(503).json({ error: "times_unavailable" });
    return;
  }
  const day = (timesRes.body as { days: { date: string; times: Record<string, string> }[] }).days.find(
    (d) => d.date === today,
  );
  if (!day) {
    res.status(503).json({ error: "times_unavailable" });
    return;
  }
  const now = Date.now();
  let current: (typeof PRAYERS)[number] | null = null;
  for (const p of PRAYERS) {
    if (istanbulEpoch(today, day.times[p.timeKey]) <= now) current = p;
  }
  if (!current) {
    res.status(200).json({ status: "no_active" });
    return;
  }
  const prayerName = current.key === "dhuhr" && isFriday(today) ? "Cuma" : current.name;

  // 4) Zaten kılmışsa bildirim gitmez
  const dayLog = await db.doc(`users/${targetUid}/days/${today}`).get();
  const prayers = (dayLog.data()?.prayers ?? {}) as Record<string, unknown>;
  if (prayers[current.key]) {
    res.status(200).json({ status: "already_prayed", prayer: prayerName });
    return;
  }

  // 5) Alıcının kayıtlı cihazı yoksa hatırlatma hakkını tüketme
  const tokens = (target.fcmTokens ?? []).filter(Boolean);
  if (!tokens.length) {
    console.log(`[nudge] ${sender.uid} -> ${targetUid}: token yok`);
    res.status(200).json({ status: "no_tokens", prayer: prayerName });
    return;
  }

  // 6) Vakit başına gönderen-alıcı çifti için tek hatırlatma
  const nudgeRef = db.doc(`users/${targetUid}/nudges/${today}_${current.key}_${sender.uid}`);
  try {
    await nudgeRef.create({ from: sender.uid, prayer: current.key, date: today, at: now });
  } catch {
    res.status(200).json({ status: "already_nudged", prayer: prayerName });
    return;
  }

  // 7) Push gönder
  const { getMessaging } = await import("firebase-admin/messaging");
  const { FieldValue } = await import("firebase-admin/firestore");
  const senderName = sender.name || "Bir arkadaşın";
  const resp = await getMessaging(app).sendEachForMulticast({
    tokens,
    webpush: {
      notification: {
        title: `${senderName} sana selam gönderdi`,
        body: `${prayerName} namazı seni bekliyor.`,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: `nudge-${today}-${current.key}`,
      },
      fcmOptions: { link: SITE_URL },
    },
  });
  const invalid: string[] = [];
  resp.responses.forEach((r, i) => {
    if (!r.error) return;
    console.error(`[nudge] hata (${tokens[i].slice(0, 12)}…):`, r.error.code, r.error.message);
    if (
      r.error.code.includes("registration-token-not-registered") ||
      r.error.code.includes("invalid-argument")
    ) {
      invalid.push(tokens[i]);
    }
  });
  if (invalid.length) {
    await targetDoc.ref.update({ fcmTokens: FieldValue.arrayRemove(...invalid) }).catch(() => {});
  }
  console.log(`[nudge] ${sender.uid} -> ${targetUid}: ${resp.successCount}/${tokens.length} gönderildi`);
  if (resp.successCount === 0) {
    // Bildirim hiçbir cihaza ulaşmadıysa hakkı iade et, tekrar denenebilsin
    await nudgeRef.delete().catch(() => {});
    res.status(200).json({ status: "delivery_failed", prayer: prayerName });
    return;
  }
  res.status(200).json({ status: "sent", prayer: prayerName, sent: resp.successCount });
}
