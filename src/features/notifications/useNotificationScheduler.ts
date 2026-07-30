import { useEffect } from "react";
import { istanbulEpoch } from "../../lib/dates";
import { findNextPrayer, prayerDisplayName } from "../../lib/status";
import { useSettings } from "../settings/SettingsContext";
import { useTimes } from "../prayer-times/TimesContext";

function show(title: string, body: string, tag: string) {
  const opts: NotificationOptions = {
    body,
    tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (reg) return reg.showNotification(title, opts);
        new Notification(title, opts);
      })
      .catch(() => {
        try {
          new Notification(title, opts);
        } catch {
          // bildirim gösterilemedi — sessiz
        }
      });
  } else {
    try {
      new Notification(title, opts);
    } catch {
      // sessiz
    }
  }
}

/**
 * Sıradaki namaz için hatırlatma bildirimi zamanlar (vakitten X dk önce ve
 * isteğe bağlı vakit girince). Uygulama/sekme açıkken (arka plan dahil)
 * çalışır; zamanlayıcı her vakit değişiminde otomatik güncellenir.
 */
export function useNotificationScheduler() {
  const { days, now } = useTimes();
  const { settings } = useSettings();
  const { enabled, offsetMinutes, atTime } = settings.notif;

  useEffect(() => {
    if (!enabled) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const next = findNextPrayer(days, now.dateKey, now.minutes);
    if (!next) return;

    const target = istanbulEpoch(next.dateKey, next.time);
    const nowMs = Date.now();
    const timers: number[] = [];
    const name = prayerDisplayName(next.def, next.dateKey);

    const beforeAt = target - offsetMinutes * 60_000;
    if (beforeAt > nowMs) {
      timers.push(
        window.setTimeout(
          () =>
            show(
              `${name} namazına ${offsetMinutes} dakika kaldı`,
              `Vakit: ${next.time}`,
              `pre-${next.dateKey}-${next.def.key}`,
            ),
          beforeAt - nowMs,
        ),
      );
    }
    if (atTime && target > nowMs) {
      timers.push(
        window.setTimeout(
          () => show(`${name} vakti girdi`, `Vakit: ${next.time}`, `at-${next.dateKey}-${next.def.key}`),
          target - nowMs,
        ),
      );
    }
    return () => timers.forEach((t) => clearTimeout(t));
  }, [days, now, enabled, offsetMinutes, atTime]);
}
