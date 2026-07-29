import { useState } from "react";
import {
  IconBell,
  IconChevronRight,
  IconCity,
  IconGoogle,
  IconLogout,
  IconProfile,
  IconTheme,
  IconTrash,
} from "../components/icons";
import { Sheet, useToast } from "../components/ui";
import { useAuth } from "../features/auth/AuthContext";
import { useTimes } from "../features/prayer-times/TimesContext";
import { useTheme, type ThemePref } from "../theme/ThemeContext";

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: "light", label: "Açık" },
  { value: "dark", label: "Koyu" },
  { value: "system", label: "Sistem" },
];

export function ProfilePage() {
  const { user, signIn, signOutUser, deleteAccountAndData } = useAuth();
  const { cityLabel, openPicker } = useTimes();
  const { pref, setPref } = useTheme();
  const toast = useToast();
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
          <span className="grow">Bildirimler</span>
          <span className="value">Yakında</span>
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
