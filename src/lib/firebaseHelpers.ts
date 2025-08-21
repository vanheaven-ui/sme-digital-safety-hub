// firebaseHelpers.ts
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  CollectionReference,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Safely get the Firestore collection for a signed-in user
 */
export const getUserPasswordsCollection = (
  appId: string,
  callback: (col: CollectionReference | null, user: User | null) => void
) => {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      callback(null, null);
      return;
    }

    if (!appId) {
      console.error("App ID is required");
      callback(null, user);
      return;
    }

    const colRef = collection(
      db,
      `artifacts/${appId}/users/${user.uid}/passwords`
    );
    callback(colRef, user);
  });
};

/**
 * Add a password entry safely
 */
export const addPasswordEntry = async (appId: string, data: any) => {
  return new Promise((resolve, reject) => {
    getUserPasswordsCollection(appId, async (colRef, user) => {
      if (!user) return reject("User not signed in");
      if (!colRef) return reject("Collection reference is invalid");

      try {
        const docRef = await addDoc(colRef, data);
        resolve(docRef.id);
      } catch (err: any) {
        console.error("Firestore write failed:", err);
        reject(err.message || "Unknown Firestore error");
      }
    });
  });
};
