// Service worker'a eklenen push işleyicisi (vite.config.ts -> workbox.importScripts).
// FCM'den gelen web push mesajlarını uygulama kapalıyken de bildirime çevirir.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: "Namaz Vakitleri", body: event.data.text() } };
  }
  const n = payload.notification || payload.data || {};
  const title = n.title || "Namaz Vakitleri";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: n.body || "",
      icon: n.icon || "/icons/icon-192.png",
      badge: n.badge || "/icons/icon-192.png",
      tag: n.tag || "namaz",
      data: { url: "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const win = wins[0];
      if (win) return win.focus();
      return self.clients.openWindow("/");
    }),
  );
});
