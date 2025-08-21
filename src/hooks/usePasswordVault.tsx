"use client";

import { useState, useEffect } from "react";
import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  Auth,
  User,
} from "firebase/auth";
import {
  getFirestore,
  Firestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export interface PasswordEntry {
  id: string;
  name: string;
  encryptedPassword: string;
  hashedPassword: string;
}

export function usePasswordVault() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const app: FirebaseApp = initializeApp(firebaseConfig);
    setDb(getFirestore(app));
    const firebaseAuth: Auth = getAuth(app);
    setAuth(firebaseAuth);

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user: User | null) => {
        if (user) {
          setUserId(user.uid);
          setIsLoggedIn(true);
        } else {
          setUserId(null);
          setIsLoggedIn(false);
        }
        setIsAuthReady(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // Listen for password entries
  useEffect(() => {
    if (!db || !userId) return;

    const passwordsCollection = collection(db, `users/${userId}/passwords`);
    const q = query(passwordsCollection);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedEntries: PasswordEntry[] = [];
        snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data() as {
            name?: string;
            encryptedPassword?: string;
            hashedPassword?: string;
          };
          fetchedEntries.push({
            id: doc.id,
            name: data.name || "",
            encryptedPassword: data.encryptedPassword || "",
            hashedPassword: data.hashedPassword || "",
          });
        });
        setEntries(fetchedEntries);
      },
      (err: unknown) => {
        console.error(err);
        setError("Failed to load passwords.");
      }
    );

    return () => unsubscribe();
  }, [db, userId]);

  // Auth actions
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Auth not initialized");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Sign in failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Auth not initialized");
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Sign up failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    if (auth) {
      await signOut(auth);
      setEntries([]);
    }
  };

  // Password actions
  const savePassword = async (
    name: string,
    passwordValue: string, // Unused
    encryptedPassword: string,
    hashedPassword: string
  ) => {
    if (!db || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const collectionPath = `users/${userId}/passwords`;
      await addDoc(collection(db, collectionPath), {
        name,
        encryptedPassword,
        hashedPassword,
      });
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to save password");
    } finally {
      setLoading(false);
    }
  };

  const deletePassword = async (id: string) => {
    if (!db || !userId) return;
    setLoading(true);
    try {
      const docPath = `users/${userId}/passwords/${id}`;
      await deleteDoc(doc(db, docPath));
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to delete password");
    } finally {
      setLoading(false);
    }
  };

  return {
    entries,
    loading,
    error,
    isLoggedIn,
    isAuthReady,
    userId,
    signIn,
    signUp,
    signOutUser,
    savePassword,
    deletePassword,
  };
}
