import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../auth/AuthContext";

/** Kullanıcının en az bir arkadaşı var mı? (Alt menüde Arkadaşlar sekmesi için) */
export function useHasFriends(): boolean {
  const { user } = useAuth();
  const [hasFriends, setHasFriends] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasFriends(false);
      return;
    }
    return onSnapshot(
      query(collection(db, "users", user.uid, "friends"), limit(1)),
      (snap) => setHasFriends(!snap.empty),
      () => setHasFriends(false),
    );
  }, [user]);

  return hasFriends;
}
