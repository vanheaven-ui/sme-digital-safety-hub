// hooks/usePasswordVault.ts
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
} from "firebase/firestore";

// Helper function to generate a random 32-byte key
const generateKey = (): string => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...Array.from(arr)));
};

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

// Define Firebase configuration based on environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App outside the hook to avoid re-initialization on every render
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export interface PasswordEntry {
  id: string;
  name: string;
  encryptedPassword: string;
  createdAt: any;
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

  // Use a ref for the encryption key to persist across re-renders
  // This is a simple mock, a real application would use a secure server-side method
  // to handle encryption and decryption.
  const encryptionKey = "my-secret-key-for-now";

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

    return () => unsubscribe();
  }, [auth]);

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
    const unsubscribe = onSnapshot(userVaultRef, (snapshot) => {
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
    });

    return () => unsubscribe();
  }, [isLoggedIn, userId]);

  // Encryption function mock
  const encryptPassword = async (
    password: string,
    secretKey: string
  ): Promise<string> => {
    return btoa(password + secretKey);
  };

  // Decryption function mock
  const decryptPassword = async (
    encryptedText: string,
    secretKey: string
  ): Promise<string> => {
    const decoded = atob(encryptedText);
    return decoded.replace(secretKey, "");
  };

  // Handle user sign-in
  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError(null);
    } catch (e: any) {
      const errorCode = e.code;
      const friendlyMessage = getFriendlyErrorMessage(errorCode);
      setError(friendlyMessage);
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
    } catch (e: any) {
      const errorCode = e.code;
      const friendlyMessage = getFriendlyErrorMessage(errorCode);
      setError(friendlyMessage);
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
    } catch (e: any) {
      const errorCode = e.code;
      const friendlyMessage = getFriendlyErrorMessage(errorCode);
      setError(friendlyMessage);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Save a password to Firestore
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
      const encryptedPassword: string = await encryptPassword(
        password,
        userSecretKey
      );
      const docRef: DocumentReference<DocumentData> = doc(
        collection(db, "vaults", userId, "passwords")
      );
      await setDoc(docRef, {
        name,
        encryptedPassword,
        createdAt: new Date(),
      });
      setError(null);
    } catch (e: any) {
      setError("Failed to save password. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Delete a password from Firestore
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
    } catch (e: any) {
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
