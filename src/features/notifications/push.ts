// FCM web push kaydı — uygulama kapalıyken bildirim alabilmek için.
// VITE_FCM_VAPID_KEY (Firebase Console -> Cloud Messaging -> Web Push
// certificates içindeki herkese açık anahtar) yapılandırılmadıysa push
// devre dışı kalır; uygulama içi hatırlatmalar çalışmaya devam eder.

import { arrayRemove, arrayUnion, doc, setDoc } from "firebase/firestore";
import { app, db } from "../../lib/firebase";

const VAPID_KEY = (import.meta.env.VITE_FCM_VAPID_KEY as string | undefined) || "";

export function pushConfigured(): boolean {
  return VAPID_KEY.length > 0;
}

async function getMessagingIfSupported() {
  if (!pushConfigured() || !("serviceWorker" in navigator)) return null;
  const { getMessaging, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) return null;
  return getMessaging(app);
}

/** Bu cihaz için FCM token'ı alır ve kullanıcının profiline kaydeder. */
export async function enablePush(uid: string): Promise<boolean> {
  try {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    const { getToken } = await import("firebase/messaging");
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });
    if (!token) return false;
    await setDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) }, { merge: true });
    return true;
  } catch (err) {
    console.error("Push kaydı başarısız:", err);
    return false;
  }
}

/** Bu cihazın token'ını profilden ve FCM'den kaldırır. */
export async function disablePush(uid: string): Promise<void> {
  try {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const { getToken, deleteToken } = await import("firebase/messaging");
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    }).catch(() => null);
    if (token) {
      await setDoc(doc(db, "users", uid), { fcmTokens: arrayRemove(token) }, { merge: true });
    }
    await deleteToken(messaging).catch(() => {});
  } catch {
    // sessiz — push zaten aktif değildi
  }
}
