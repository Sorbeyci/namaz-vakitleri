import { useState } from "react";
import {
  IconBell,
  IconChevronRight,
  IconCity,
  IconGoogle,
  IconLocation,
  IconLogout,
  IconPending,
  IconProfile,
  IconTheme,
  IconTrash,
} from "../components/icons";
import { Sheet, Switch, useToast } from "../components/ui";
import { useAuth } from "../features/auth/AuthContext";
import { disablePush, enablePush, pushConfigured } from "../features/notifications/push";
import { useSettings } from "../features/settings/SettingsContext";
import { useTimes } from "../features/prayer-times/TimesContext";
import { useLocateCity } from "../features/city/useLocateCity";
import { useTheme, type ThemePref } from "../theme/ThemeContext";

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: "light", label: "Açık" },
  { value: "dark", label: "Koyu" },
  { value: "system", label: "Sistem" },
];

export function ProfilePage() {
  const { user, signIn, signOutUser, deleteAccountAndData } = useAuth();
  const { cityLabel, openPicker } = useTimes();
  const { locate, locating } = useLocateCity();
  const { pref, setPref } = useTheme();
  const { settings, setTracking, setNotif } = useSettings();
  const toast = useToast();

  const toggleNotifications = async () => {
    if (settings.notif.enabled) {
      setNotif({ enabled: false });
      if (user) void disablePush(user.uid);
      toast("Namaz hatırlatmaları kapatıldı.");
      return;
    }
    if (typeof Notification === "undefined") {
      toast("Bu tarayıcıda bildirim desteği yok. (iPhone'da uygulamayı ana ekrana eklemen gerekir.)");
      return;
    }
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") {
      toast("Bildirim izni verilmedi. Tarayıcı ayarlarından izin verebilirsin.");
      return;
    }
    setNotif({ enabled: true });
    if (user && pushConfigured()) {
      const ok = await enablePush(user.uid);
      toast(
        ok
          ? "Hatırlatmalar açıldı; uygulama kapalıyken de bildirim alacaksın."
          : "Hatırlatmalar açıldı (bu cihazda yalnızca uygulama açıkken).",
      );
    } else {
      toast("Namaz hatırlatmaları açıldı.");
    }
  };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccountAndData();
      setConfirmOpen(false);
    } catch (err) {
      console.error("Silme başarısız:", err);
      toast("Veriler silinemedi. Lütfen tekrar dene.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-title">Profil</div>

      <div className="card profile-head">
        <div className="avatar">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
          ) : (
            <IconProfile size={26} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="profile-name">{user?.displayName ?? "Misafir"}</div>
          <div className="profile-email">
            {user?.email ?? "Kayıtlar yalnızca bu cihazda tutuluyor"}
          </div>
        </div>
      </div>

      {!user && (
        <button className="btn btn-primary btn-block" onClick={signIn}>
          <IconGoogle size={18} /> Google ile giriş yap
        </button>
      )}

      <div className="card settings-list">
        <button className="settings-row" onClick={openPicker}>
          <IconCity size={20} />
          <span className="grow">Şehir</span>
          <span className="value">{cityLabel}</span>
          <IconChevronRight size={16} />
        </button>

        <button className="settings-row" onClick={locate} disabled={locating}>
          <IconLocation size={20} />
          <span className="grow">Konumdan şehir bul</span>
          {locating && <span className="value">Aranıyor…</span>}
        </button>

        <div className="settings-row">
          <IconTheme size={20} />
          <span className="grow">Tema</span>
        </div>
        <div style={{ padding: "0 var(--sp-3) var(--sp-3)" }}>
          <div className="segmented">
            {THEME_OPTIONS.map((o) => (
              <button
                key={o.value}
                className={pref === o.value ? "active" : ""}
                onClick={() => setPref(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <IconBell size={20} />
          <span className="grow">Namaz hatırlatması</span>
          <Switch
            on={settings.notif.enabled}
            onToggle={toggleNotifications}
            label="Namaz hatırlatması"
          />
        </div>
        {settings.notif.enabled && (
          <div style={{ padding: "0 var(--sp-3) var(--sp-3)" }}>
            <div
              style={{
                fontSize: "var(--fs-sm)",
                color: "var(--text-muted)",
                marginBottom: "var(--sp-2)",
              }}
            >
              Vakitten kaç dakika önce?
            </div>
            <div className="segmented">
              {([10, 15, 30] as const).map((m) => (
                <button
                  key={m}
                  className={settings.notif.offsetMinutes === m ? "active" : ""}
                  onClick={() => setNotif({ offsetMinutes: m })}
                >
                  {m} dk
                </button>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--sp-3)",
                marginTop: "var(--sp-3)",
                fontSize: "var(--fs-sm)",
              }}
            >
              <span style={{ flex: 1 }}>Vakit girince de bildir</span>
              <Switch
                on={settings.notif.atTime}
                onToggle={() => setNotif({ atTime: !settings.notif.atTime })}
                label="Vakit girince de bildir"
              />
            </div>
            <div className="caption" style={{ textAlign: "left", marginTop: "var(--sp-2)" }}>
              {user && pushConfigured()
                ? "Bildirimler uygulama kapalıyken de gönderilir."
                : user
                  ? "Bu sürümde hatırlatmalar uygulama açıkken gösterilir."
                  : "Uygulama kapalıyken de bildirim almak için Google ile giriş yap."}
            </div>
          </div>
        )}
      </div>

      <div className="card settings-list">
        <div className="settings-row">
          <IconPending size={20} />
          <span className="grow">Namaz takibi</span>
          <Switch
            on={settings.tracking}
            onToggle={() => {
              setTracking(!settings.tracking);
              toast(
                settings.tracking
                  ? "Namaz takibi kapatıldı; takvim ve istatistik gizlendi."
                  : "Namaz takibi açıldı.",
              );
            }}
            label="Namaz takibi"
          />
        </div>
        <div className="caption" style={{ textAlign: "left", padding: "0 var(--sp-3) var(--sp-3)" }}>
          Kapalıyken işaretleme butonları, takvim ve istatistik gösterilmez;
          kayıtların silinmez.
        </div>
      </div>

      <div className="card settings-list">
        {user && (
          <button className="settings-row" onClick={signOutUser}>
            <IconLogout size={20} />
            <span className="grow">Hesaptan çıkış</span>
          </button>
        )}
        <button className="settings-row danger" onClick={() => setConfirmOpen(true)}>
          <IconTrash size={20} />
          <span className="grow">{user ? "Hesabı ve verileri sil" : "Cihazdaki kayıtları sil"}</span>
        </button>
      </div>

      <div className="caption">Namaz Vakitleri · v0.1</div>

      {confirmOpen && (
        <Sheet title="Emin misin?" onClose={() => setConfirmOpen(false)} center>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "var(--sp-4)" }}>
            {user
              ? "Hesabın ve tüm namaz takip kayıtların kalıcı olarak silinecek. Bu işlem geri alınamaz."
              : "Bu cihazda tutulan tüm namaz takip kayıtların kalıcı olarak silinecek. Bu işlem geri alınamaz."}
          </p>
          <div style={{ display: "flex", gap: "var(--sp-2)" }}>
            <button
              className="btn btn-subtle"
              style={{ flex: 1 }}
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Vazgeç
            </button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={onDelete} disabled={deleting}>
              {deleting ? "Siliniyor…" : "Evet, kalıcı olarak sil"}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
