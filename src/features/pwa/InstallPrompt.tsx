import { useEffect, useState } from "react";
import { IconClose, IconDownload, IconShare } from "../../components/icons";
import { KEYS, readString, writeString } from "../../lib/storage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Telefona ekleme yönlendirmesi. Uygulama zaten yüklüyse veya kullanıcı
 * kapattıysa gösterilmez. Android'de doğrudan yükleme butonu, iOS'ta
 * "Ana Ekrana Ekle" yönergesi gösterir.
 */
export function InstallPrompt() {
  const [dismissed, setDismissed] = useState(() => readString(KEYS.installDismissed) === "1");
  const [installable, setInstallable] = useState(() => deferredPrompt !== null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || isStandalone()) return null;
  const ios = isIOS();
  if (!installable && !ios) return null;

  const dismiss = () => {
    writeString(KEYS.installDismissed, "1");
    setDismissed(true);
  };

  return (
    <div className="card" style={{ display: "flex", gap: "var(--sp-3)", alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: "var(--fw-semibold)", marginBottom: 4 }}>
          Telefonuna ekle
        </div>
        {ios ? (
          <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
            Safari'de <IconShare size={14} /> <strong>Paylaş</strong> butonuna dokunun,
            ardından <strong>"Ana Ekrana Ekle"</strong> seçeneğini seçin.
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: "var(--fs-sm)",
                color: "var(--text-muted)",
                marginBottom: "var(--sp-2)",
              }}
            >
              Uygulamayı ana ekranına ekleyerek daha hızlı erişebilirsin.
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={async () => {
                if (!deferredPrompt) return;
                await deferredPrompt.prompt();
                const choice = await deferredPrompt.userChoice;
                if (choice.outcome === "accepted") dismiss();
                deferredPrompt = null;
                setInstallable(false);
              }}
            >
              <IconDownload size={16} /> Uygulamayı yükle
            </button>
          </>
        )}
      </div>
      <button className="icon-btn" onClick={dismiss} aria-label="Kapat">
        <IconClose size={16} />
      </button>
    </div>
  );
}
