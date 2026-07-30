import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut,
  deleteUser,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db, googleProvider } from "../../lib/firebase";
import { KEYS, readJSON, readString, remove } from "../../lib/storage";
import { useToast } from "../../components/ui";

export interface Profile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  city: string | null;
  createdAt: number;
  /** Uygulama ayarları (SettingsContext yönetir) */
  settings?: unknown;
  /** Tema tercihleri (ThemeSync yönetir) */
  theme?: unknown;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  /** İlk auth durumu henüz belirlenmediyse true */
  initializing: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  deleteAccountAndData: () => Promise<void>;
  updateProfileCity: (slug: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalı");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const toast = useToast();

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setInitializing(false);
      if (!u) {
        setProfile(null);
        return;
      }
      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        const localCity = readString(KEYS.city);
        if (!snap.exists()) {
          const fresh: Profile = {
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            city: localCity,
            createdAt: Date.now(),
          };
          await setDoc(ref, fresh);
          setProfile(fresh);
        } else {
          const data = snap.data() as Profile;
          if (!data.city && localCity) {
            await setDoc(ref, { city: localCity }, { merge: true });
            data.city = localCity;
          }
          setProfile(data);
        }
      } catch (err) {
        console.error("Profil yüklenemedi:", err);
        setProfile({
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
          city: readString(KEYS.city),
          createdAt: Date.now(),
        });
      }
    });
  }, []);

  const signIn = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast("Giriş yapıldı.");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      console.error("Giriş başarısız:", err);
      toast("Giriş yapılamadı. Lütfen tekrar deneyin.");
    }
  }, [toast]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    toast("Çıkış yapıldı.");
  }, [toast]);

  const updateProfileCity = useCallback(
    (slug: string) => {
      const u = auth.currentUser;
      setProfile((p) => (p ? { ...p, city: slug } : p));
      if (u) {
        setDoc(doc(db, "users", u.uid), { city: slug }, { merge: true }).catch((err) =>
          console.error("Şehir kaydedilemedi:", err),
        );
      }
    },
    [],
  );

  const deleteAccountAndData = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) {
      // misafir: yerel verileri sil
      remove(KEYS.logs);
      toast("Cihazdaki kayıtlar silindi.");
      return;
    }
    // 1) Namaz kayıtlarını sil (450'lik gruplar halinde)
    const daysSnap = await getDocs(collection(db, "users", u.uid, "days"));
    const docs = daysSnap.docs;
    for (let i = 0; i < docs.length; i += 450) {
      const batch = writeBatch(db);
      for (const d of docs.slice(i, i + 450)) batch.delete(d.ref);
      await batch.commit();
    }
    // 2) Profil dokümanını sil
    await deleteDoc(doc(db, "users", u.uid));
    // 3) Hesabı sil (gerekirse yeniden kimlik doğrulama)
    try {
      await deleteUser(u);
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === "auth/requires-recent-login") {
        await reauthenticateWithPopup(u, googleProvider);
        await deleteUser(u);
      } else {
        throw err;
      }
    }
    remove(KEYS.logs);
    toast("Hesabın ve tüm kayıtların silindi.");
  }, [toast]);

  return (
    <AuthContext.Provider
      value={{ user, profile, initializing, signIn, signOutUser, deleteAccountAndData, updateProfileCity }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Girişten önce cihazda biriken kayıtlar (varsa) — birleştirme LogsProvider'da yapılır. */
export function readLocalLogs() {
  return readJSON<Record<string, unknown>>(KEYS.logs);
}
