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
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  DocumentData,
  CollectionReference,
  DocumentReference,
  QuerySnapshot,
} from "firebase/firestore";

// Map Firebase auth error codes to user-friendly messages
const getFriendlyErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "auth/invalid-email":
      return "The email address is not valid.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "The email address is already in use by another account.";
    case "auth/weak-password":
      return "The password is too weak. Please choose a stronger one.";
    default:
      return "An unknown error occurred. Please try again.";
  }
};

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export interface PasswordEntry {
  id: string;
  name: string;
  encryptedPassword: string;
  createdAt: Date;
}

interface UsePasswordVaultReturn {
  entries: PasswordEntry[];
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  isAuthReady: boolean;
  userId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  savePassword: (name: string, password: string) => Promise<void>;
  deletePassword: (id: string) => Promise<void>;
}

export const usePasswordVault = (): UsePasswordVaultReturn => {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userSecretKey, setUserSecretKey] = useState<string | null>(null);

  // Authenticate user with Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setIsLoggedIn(true);
        setUserId(user.uid);
        setUserSecretKey(user.uid);
      } else {
        setIsLoggedIn(false);
        setUserId(null);
        setUserSecretKey(null);
        setEntries([]);
      }
      setIsAuthReady(true);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Fetch passwords from Firestore
  useEffect(() => {
    if (!isLoggedIn || !userId) return;

    setLoading(true);
    const userVaultRef: CollectionReference<DocumentData> = collection(
      db,
      "vaults",
      userId,
      "passwords"
    );

    const unsubscribe = onSnapshot(
      userVaultRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const vaultEntries: PasswordEntry[] = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<PasswordEntry, "id">;
          return {
            id: doc.id,
            name: data.name,
            encryptedPassword: data.encryptedPassword,
            createdAt:
              data.createdAt instanceof Date
                ? data.createdAt
                : new Date(data.createdAt),
          };
        });
        setEntries(vaultEntries);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [isLoggedIn, userId]);

  // Mock encryption (used in savePassword)
  const encryptPassword = (password: string, secretKey: string): string => {
    return btoa(password + secretKey);
  };

  // Handle user sign-in
  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError(null);
    } catch (e: unknown) {
      const errorCode = (e as { code?: string }).code || "";
      setError(getFriendlyErrorMessage(errorCode));
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Handle user sign-up
  const signUp = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setError(null);
    } catch (e: unknown) {
      const errorCode = (e as { code?: string }).code || "";
      setError(getFriendlyErrorMessage(errorCode));
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Handle user sign-out
  const signOutUser = async (): Promise<void> => {
    setLoading(true);
    try {
      await signOut(auth);
      setError(null);
    } catch (e: unknown) {
      const errorCode = (e as { code?: string }).code || "";
      setError(getFriendlyErrorMessage(errorCode));
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Save password
  const savePassword = async (
    name: string,
    password: string
  ): Promise<void> => {
    if (!isLoggedIn || !userId || !userSecretKey) {
      setError("Please sign in to save passwords.");
      return;
    }
    setLoading(true);
    try {
      const encryptedPassword = encryptPassword(password, userSecretKey);
      const docRef: DocumentReference<DocumentData> = doc(
        collection(db, "vaults", userId, "passwords")
      );
      await setDoc(docRef, {
        name,
        encryptedPassword,
        createdAt: new Date(),
      });
      setError(null);
    } catch (e: unknown) {
      setError("Failed to save password. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Delete password
  const deletePassword = async (id: string): Promise<void> => {
    if (!isLoggedIn || !userId) {
      setError("Please sign in to delete passwords.");
      return;
    }
    setLoading(true);
    try {
      const docRef: DocumentReference<DocumentData> = doc(
        db,
        "vaults",
        userId,
        "passwords",
        id
      );
      await deleteDoc(docRef);
      setError(null);
    } catch (e: unknown) {
      setError("Failed to delete password. Please try again.");
      console.error(e);
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
};
