import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  IconBell,
  IconCheck,
  IconChevronRight,
  IconClose,
  IconGoogle,
  IconProfile,
  IconUsers,
} from "../../components/icons";
import { Sheet, Spinner, StateScreen, useToast } from "../../components/ui";
import { db } from "../../lib/firebase";
import type { DayLog, PrayerKey } from "../../lib/prayers";
import { PRAYERS } from "../../lib/prayers";
import { prayerDisplayName } from "../../lib/status";
import { useAuth } from "../auth/AuthContext";
import { useTimes } from "../prayer-times/TimesContext";

interface FriendDoc {
  id: string;
  name: string | null;
  photoURL: string | null;
}

interface RequestDoc {
  id: string;
  name: string | null;
  photoURL: string | null;
}

// Karışması kolay karakterler (0/O, 1/I) kod alfabesine alınmaz
const CODE_CHARS = "ABCDEFGHJKMNPRSTUVYZ23456789";

function generateCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

/** Kullanıcının davet kodunu döndürür; yoksa üretip kaydeder. */
async function ensureInviteCode(uid: string, name: string | null): Promise<string | null> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  const existing = (snap.data() as { inviteCode?: string } | undefined)?.inviteCode;
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      await runTransaction(db, async (tx) => {
        const codeRef = doc(db, "inviteCodes", code);
        const codeSnap = await tx.get(codeRef);
        if (codeSnap.exists()) throw new Error("taken");
        tx.set(codeRef, { uid, name });
        tx.update(userRef, { inviteCode: code });
      });
      return code;
    } catch {
      // kod çakıştı — yeniden dene
    }
  }
  return null;
}

function Avatar({ photoURL }: { photoURL: string | null }) {
  return (
    <span className="avatar" style={{ width: 40, height: 40 }}>
      {photoURL ? <img src={photoURL} alt="" referrerPolicy="no-referrer" /> : <IconProfile size={20} />}
    </span>
  );
}

/** Bir arkadaşın bugünkü 5 vaktinin mini durumu */
function DayDots({ log }: { log: DayLog | null }) {
  return (
    <span className="friend-dots">
      {PRAYERS.map((p) => {
        const entry = log?.[p.key];
        const cls = entry ? (entry.status === "completed" ? " done" : " qada") : "";
        return <span key={p.key} className={`friend-dot${cls}`} title={p.name} />;
      })}
    </span>
  );
}

export function FriendsPage() {
  const { user, profile, signIn } = useAuth();
  const { now } = useTimes();
  const toast = useToast();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [sending, setSending] = useState(false);
  const [friends, setFriends] = useState<FriendDoc[] | null>(null);
  const [requests, setRequests] = useState<RequestDoc[]>([]);
  const [friendDays, setFriendDays] = useState<Record<string, DayLog | null>>({});
  const [detail, setDetail] = useState<FriendDoc | null>(null);
  const [nudging, setNudging] = useState<string | null>(null);

  // Davet kodu
  useEffect(() => {
    if (!user) return;
    void ensureInviteCode(user.uid, user.displayName).then(setInviteCode);
  }, [user]);

  // Arkadaşlar ve gelen istekler (canlı)
  useEffect(() => {
    if (!user) return;
    const unsubFriends = onSnapshot(collection(db, "users", user.uid, "friends"), (snap) => {
      setFriends(
        snap.docs.map((d) => ({
          id: d.id,
          name: (d.data().name as string | null) ?? null,
          photoURL: (d.data().photoURL as string | null) ?? null,
        })),
      );
    });
    const unsubReqs = onSnapshot(collection(db, "users", user.uid, "friendRequests"), (snap) => {
      setRequests(
        snap.docs.map((d) => ({
          id: d.id,
          name: (d.data().name as string | null) ?? null,
          photoURL: (d.data().photoURL as string | null) ?? null,
        })),
      );
    });
    return () => {
      unsubFriends();
      unsubReqs();
    };
  }, [user]);

  // Arkadaşların bugünkü kayıtları
  useEffect(() => {
    if (!user || !friends?.length) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        friends.map(async (f) => {
          try {
            const snap = await getDoc(doc(db, "users", f.id, "days", now.dateKey));
            return [f.id, (snap.data()?.prayers as DayLog | undefined) ?? null] as const;
          } catch {
            return [f.id, null] as const;
          }
        }),
      );
      if (!cancelled) setFriendDays(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [user, friends, now.dateKey]);

  const addByCode = useCallback(async () => {
    if (!user) return;
    const code = codeInput.trim().toUpperCase();
    if (code.length < 4) return;
    setSending(true);
    try {
      const codeSnap = await getDoc(doc(db, "inviteCodes", code));
      const data = codeSnap.data() as { uid: string } | undefined;
      if (!codeSnap.exists() || !data) {
        toast("Bu koda ait bir kullanıcı bulunamadı.");
        return;
      }
      if (data.uid === user.uid) {
        toast("Bu senin kendi kodun.");
        return;
      }
      if (friends?.some((f) => f.id === data.uid)) {
        toast("Bu kişi zaten arkadaşın.");
        return;
      }
      await setDoc(doc(db, "users", data.uid, "friendRequests", user.uid), {
        name: user.displayName,
        photoURL: user.photoURL,
        at: Date.now(),
      });
      setCodeInput("");
      toast("Arkadaşlık isteği gönderildi.");
    } catch (err) {
      console.error(err);
      toast("İstek gönderilemedi. Kodu kontrol edip tekrar dene.");
    } finally {
      setSending(false);
    }
  }, [user, codeInput, friends, toast]);

  const acceptRequest = useCallback(
    async (req: RequestDoc) => {
      if (!user) return;
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, "users", user.uid, "friends", req.id), {
          name: req.name,
          photoURL: req.photoURL,
          since: Date.now(),
        });
        batch.set(doc(db, "users", req.id, "friends", user.uid), {
          name: user.displayName,
          photoURL: user.photoURL,
          since: Date.now(),
        });
        batch.delete(doc(db, "users", user.uid, "friendRequests", req.id));
        await batch.commit();
        toast(`${req.name ?? "Arkadaşın"} ile artık arkadaşsınız.`);
      } catch (err) {
        console.error(err);
        toast("İstek kabul edilemedi. Lütfen tekrar dene.");
      }
    },
    [user, toast],
  );

  const rejectRequest = useCallback(
    async (req: RequestDoc) => {
      if (!user) return;
      await deleteDoc(doc(db, "users", user.uid, "friendRequests", req.id)).catch(() => {});
    },
    [user],
  );

  const removeFriend = useCallback(
    async (f: FriendDoc) => {
      if (!user) return;
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, "users", user.uid, "friends", f.id));
        batch.delete(doc(db, "users", f.id, "friends", user.uid));
        await batch.commit();
        setDetail(null);
        toast("Arkadaşlıktan çıkarıldı.");
      } catch (err) {
        console.error(err);
        toast("İşlem tamamlanamadı.");
      }
    },
    [user, toast],
  );

  const nudge = useCallback(
    async (f: FriendDoc) => {
      if (!user) return;
      setNudging(f.id);
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/nudge", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ targetUid: f.id }),
        });
        const body = (await res.json().catch(() => null)) as
          | { status?: string; prayer?: string }
          | null;
        const first = (f.name ?? "Arkadaşın").split(" ")[0];
        switch (body?.status) {
          case "sent":
            toast(`${first} için ${body.prayer} hatırlatması gönderildi.`);
            break;
          case "already_prayed":
            toast(`${first} bu vakti zaten kılmış — ne güzel.`);
            break;
          case "already_nudged":
            toast("Bu vakit için zaten hatırlatma gönderdin.");
            break;
          case "no_active":
            toast("Şu an hatırlatılacak bir vakit yok.");
            break;
          case "no_tokens":
          case "no_city":
            toast(`${first} henüz bildirimleri açmamış; hatırlatma iletilemedi.`);
            break;
          case "delivery_failed":
            toast(`${first} cihazına ulaşılamadı; bildirimleri yeniden açması gerekebilir.`);
            break;
          default:
            toast("Hatırlatma gönderilemedi. Lütfen tekrar dene.");
        }
      } catch {
        toast("Hatırlatma gönderilemedi. Bağlantını kontrol et.");
      } finally {
        setNudging(null);
      }
    },
    [user, toast],
  );

  if (!user) {
    return (
      <div className="page">
        <div className="page-title">Arkadaşlar</div>
        <StateScreen
          icon={<IconUsers size={36} />}
          title="Arkadaşlarınla birlikte takip edin"
          text="Arkadaş ekleyip günlük namaz takibinizi birlikte görmek ve birbirinize nazik hatırlatmalar göndermek için Google ile giriş yap."
          action={
            <button className="btn btn-primary" onClick={signIn}>
              <IconGoogle size={18} /> Google ile giriş yap
            </button>
          }
        />
      </div>
    );
  }

  const detailLog = detail ? (friendDays[detail.id] ?? null) : null;

  return (
    <div className="page">
      <div className="page-title">Arkadaşlar</div>

      <div className="card">
        <div style={{ fontWeight: "var(--fw-semibold)", marginBottom: 4 }}>Davet kodun</div>
        <div className="invite-row">
          <span className="invite-code">{inviteCode ?? "……"}</span>
          <button
            className="btn btn-subtle btn-sm"
            disabled={!inviteCode}
            onClick={() => {
              if (!inviteCode) return;
              navigator.clipboard?.writeText(inviteCode).then(
                () => toast("Kod kopyalandı."),
                () => toast("Kopyalanamadı."),
              );
            }}
          >
            Kopyala
          </button>
        </div>
        <div className="caption" style={{ textAlign: "left", marginBottom: "var(--sp-3)" }}>
          Bu kodu arkadaşınla paylaş; o da aşağıdaki alana girerek sana istek göndersin.
        </div>
        <div className="invite-row">
          <input
            className="invite-input"
            placeholder="Arkadaşının kodu"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            maxLength={6}
            aria-label="Arkadaş davet kodu"
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={addByCode}
            disabled={sending || codeInput.trim().length < 4}
          >
            {sending ? "Gönderiliyor…" : "İstek gönder"}
          </button>
        </div>
      </div>

      {requests.length > 0 && (
        <div className="card settings-list">
          <div className="settings-row" style={{ fontWeight: "var(--fw-semibold)" }}>
            Gelen istekler
          </div>
          {requests.map((r) => (
            <div key={r.id} className="settings-row">
              <Avatar photoURL={r.photoURL} />
              <span className="grow">{r.name ?? "İsimsiz"}</span>
              <button
                className="mark-btn markable"
                onClick={() => acceptRequest(r)}
                aria-label="Kabul et"
                title="Kabul et"
              >
                <IconCheck size={18} />
              </button>
              <button
                className="mark-btn"
                onClick={() => rejectRequest(r)}
                aria-label="Reddet"
                title="Reddet"
              >
                <IconClose size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {friends === null ? (
        <StateScreen icon={<Spinner />} title="Arkadaşlar yükleniyor…" />
      ) : friends.length === 0 ? (
        <div className="caption">
          Henüz arkadaşın yok. Kodunu paylaşarak başlayabilirsin.
        </div>
      ) : (
        <div className="card settings-list">
          {friends.map((f) => (
            <div key={f.id} className="settings-row">
              <button className="friend-main" onClick={() => setDetail(f)}>
                <Avatar photoURL={f.photoURL} />
                <span className="friend-info">
                  <b>{f.name ?? "İsimsiz"}</b>
                  <DayDots log={friendDays[f.id] ?? null} />
                </span>
                <IconChevronRight size={16} />
              </button>
              <button
                className="mark-btn qada-action"
                onClick={() => nudge(f)}
                disabled={nudging === f.id}
                aria-label={`${f.name ?? "Arkadaşına"} namaz hatırlatması gönder`}
                title="Namaz hatırlatması gönder"
              >
                <IconBell size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="caption">
        Arkadaşların yalnızca günlük işaretleme durumunu görebilir; hatırlatma her
        vakit için bir kez gönderilebilir.
      </div>

      {detail && (
        <Sheet title={detail.name ?? "Arkadaş"} onClose={() => setDetail(null)}>
          <div className="prayer-list">
            {PRAYERS.map((def) => {
              const entry = detailLog?.[def.key as PrayerKey];
              return (
                <div key={def.key} className="prayer-row">
                  <span className="prayer-row-icon">
                    <span className={`friend-dot big${entry ? (entry.status === "completed" ? " done" : " qada") : ""}`} />
                  </span>
                  <div className="prayer-row-main">
                    <div className="prayer-row-name">{prayerDisplayName(def, now.dateKey)}</div>
                  </div>
                  <span className={`prayer-row-status ${entry ? "done" : ""}`}>
                    {entry ? (entry.status === "completed" ? "Kılındı" : "Kaza edildi") : "Henüz işaretlenmedi"}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "var(--sp-3)" }}>
            <button
              className="btn btn-subtle"
              style={{ flex: 1 }}
              onClick={() => nudge(detail)}
              disabled={nudging === detail.id}
            >
              <IconBell size={16} /> Hatırlat
            </button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => removeFriend(detail)}>
              Arkadaşlıktan çıkar
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
