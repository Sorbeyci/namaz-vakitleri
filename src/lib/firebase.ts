import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase web yapılandırması gizli değildir; asıl koruma Firestore güvenlik
// kurallarıdır (firestore.rules). Gizli olan tek anahtar (DIYANET_API_KEY)
// yalnızca sunucu tarafında kullanılır.
const firebaseConfig = {
  apiKey: "AIzaSyCfiWVqta5VDcBYCCGHwGwvuX-S152U548",
  authDomain: "cash-flow-tracker-8e627.firebaseapp.com",
  databaseURL: "https://cash-flow-tracker-8e627-default-rtdb.firebaseio.com",
  projectId: "cash-flow-tracker-8e627",
  storageBucket: "cash-flow-tracker-8e627.firebasestorage.app",
  messagingSenderId: "520990571782",
  appId: "1:520990571782:web:29a47b3e85cfbf50f7b287",
  measurementId: "G-2EMGG73GPG",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
