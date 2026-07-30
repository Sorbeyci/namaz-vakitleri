// Firebase Admin SDK erişimi (FIREBASE_SERVICE_ACCOUNT env değişkeni gerekir).
// Hem vakit cache'i hem bildirim gönderimi bu modülü paylaşır.

import type { App } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";

let appPromise: Promise<App | null> | null = null;

export function getAdminApp(): Promise<App | null> {
  if (!appPromise) {
    appPromise = (async () => {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) return null;
      try {
        const { initializeApp, cert, getApps } = await import("firebase-admin/app");
        const creds = JSON.parse(raw);
        return getApps()[0] ?? initializeApp({ credential: cert(creds) });
      } catch (err) {
        console.error("[admin] Firebase Admin başlatılamadı:", err);
        return null;
      }
    })();
  }
  return appPromise;
}

export async function getAdminDb(): Promise<Firestore | null> {
  const app = await getAdminApp();
  if (!app) return null;
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore(app);
}
