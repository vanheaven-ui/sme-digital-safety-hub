"use client";

import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import {
  getFirestore,
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

interface PasswordEntry {
  id: string;
  name: string;
  encryptedPassword: string;
  hashedPassword: string;
}

export function usePasswordVault(appId: string) {
  const [auth, setAuth] = useState<any>(null);
  const [db, setDb] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    setDb(getFirestore(app));
    const firebaseAuth = getAuth(app);
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

    const passwordsCollection = collection(
      db,
      `/artifacts/${appId}/users/${userId}/passwords`
    );
    const q = query(passwordsCollection);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedEntries: PasswordEntry[] = [];
        snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          fetchedEntries.push({
            id: doc.id,
            name: data.name || "",
            encryptedPassword: data.encryptedPassword || "",
            hashedPassword: data.hashedPassword || "",
          });
        });
        setEntries(fetchedEntries);
      },
      (err) => {
        console.error(err);
        setError("Failed to load passwords.");
      }
    );

    return () => unsubscribe();
  }, [db, userId, appId]);

  // Auth actions
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Auth not initialized");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Sign in failed");
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
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Sign up failed");
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
    passwordValue: string,
    encryptedPassword: string,
    hashedPassword: string
  ) => {
    if (!db || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const collectionPath = `/artifacts/${appId}/users/${userId}/passwords`;
      await addDoc(collection(db, collectionPath), {
        name,
        encryptedPassword,
        hashedPassword,
      });
    } catch (err) {
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
      const docPath = `/artifacts/${appId}/users/${userId}/passwords/${id}`;
      await deleteDoc(doc(db, docPath));
    } catch (err) {
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
