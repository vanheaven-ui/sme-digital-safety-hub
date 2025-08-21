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

const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID!;

interface PasswordEntry {
  id: string;
  name: string;
  encryptedPassword: string;
  hashedPassword: string;
}

export default function PasswordVault() {
  const [password, setPassword] = useState<string>("");
  const [passwordName, setPasswordName] = useState<string>("");
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [db, setDb] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Firebase setup
  useEffect(() => {
    async function setupFirebase() {
      if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
        console.error("Firebase config is not defined.");
        setError("Firebase configuration is missing.");
        return;
      }
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      setDb(firestore);
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
    }
    setupFirebase();
  }, []);

  // Listen for password entries
  useEffect(() => {
    if (!db || !isAuthReady || !userId) {
      setEntries([]);
      return;
    }

    const collectionPath = `/artifacts/${appId}/users/${userId}/passwords`;
    const passwordsCollection = collection(db, collectionPath);
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
        console.error("Failed to listen for password updates:", err);
        setError("Failed to load saved passwords.");
      }
    );

    return () => unsubscribe();
  }, [db, isAuthReady, userId]);

  // Auth handlers
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth is not initialized.");
      await signInWithEmailAndPassword(auth, email, authPassword);
      setEmail("");
      setAuthPassword("");
    } catch (err: any) {
      console.error("Sign in failed:", err);
      setError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Firebase Auth is not initialized.");
      await createUserWithEmailAndPassword(auth, email, authPassword);
      setEmail("");
      setAuthPassword("");
    } catch (err: any) {
      console.error("Sign up failed:", err);
      setError(err.message || "Failed to sign up.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      setEntries([]);
    }
  };

  // Generate password
  const handleGeneratePassword = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/password-generator", { method: "GET" });
      if (!response.ok) throw new Error("Failed to generate password.");
      const data = await response.json();
      setPassword(data.password);
    } catch (err) {
      console.error(err);
      setError("An error occurred while generating the password.");
    } finally {
      setLoading(false);
    }
  };

  // Save password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !passwordName) {
      setError("Please enter a name and a password.");
      return;
    }
    if (!db || !userId) {
      setError("Not logged in or database not ready.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/password-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error("Failed to save password.");
      const data = await response.json();
      const { hashedPassword, encryptedPassword } = data;

      const collectionPath = `/artifacts/${appId}/users/${userId}/passwords`;
      const passwordsCollection = collection(db, collectionPath);
      await addDoc(passwordsCollection, {
        name: passwordName,
        encryptedPassword,
        hashedPassword,
      });

      // Clear form and reset loading
      setPassword("");
      setPasswordName("");
    } catch (err) {
      console.error(err);
      setError("An error occurred while saving the password.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePassword = async (id: string) => {
    if (!db || !userId) {
      setError("Database not ready or not logged in.");
      return;
    }
    setLoading(true);
    try {
      const docPath = `/artifacts/${appId}/users/${userId}/passwords/${id}`;
      await deleteDoc(doc(db, docPath));
    } catch (err) {
      console.error("Error deleting password:", err);
      setError("Failed to delete password.");
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = (id: string) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyPassword = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Password Vault</h2>
      <p className="text-center text-gray-600 mb-8">Securely store your passwords here.</p>

      {!isLoggedIn ? (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Sign In or Sign Up</h3>
          <form className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleSignIn}
                className="flex-grow bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                disabled={loading}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={handleSignUp}
                className="flex-grow bg-gray-200 text-gray-800 font-semibold py-3 rounded-md hover:bg-gray-300 transition-colors disabled:bg-gray-200 disabled:text-gray-500"
                disabled={loading}
              >
                Sign Up
              </button>
            </div>
          </form>
          {error && <div className="mt-4 p-3 text-sm bg-red-100 border border-red-400 text-red-700 rounded-md"><p>{error}</p></div>}
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">
              You are logged in as: <span className="font-semibold">{userId}</span>
            </p>
            <button
              onClick={handleSignOut}
              className="text-red-600 hover:text-red-800 font-semibold text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>

          <form onSubmit={handleSavePassword} className="w-full">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <input
                type="text"
                placeholder="Name (e.g., Google login)"
                value={passwordName}
                onChange={(e) => setPasswordName(e.target.value)}
                disabled={loading}
                className="flex-grow p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <input
                type="text"
                placeholder="Enter a password or generate one"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="flex-grow p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleGeneratePassword}
                disabled={loading}
                className="sm:w-auto bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-md hover:bg-gray-300 transition-colors disabled:bg-gray-200 disabled:text-gray-500"
              >
                Generate
              </button>
            </div>
            <button
              type="submit"
              disabled={loading || !password || !passwordName}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {loading ? "Saving..." : "Save Password"}
            </button>
          </form>

          {error && <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md"><p>{error}</p></div>}

          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Saved Passwords ({entries.length})</h3>
            {entries.length === 0 ? (
              <p className="text-center text-gray-500">No passwords saved yet.</p>
            ) : (
              <ul className="space-y-4">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="p-4 bg-gray-50 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center"
                  >
                    <div className="flex-grow mb-2 sm:mb-0">
                      <p className="font-semibold text-gray-800">{entry.name}</p>
                      <div className="flex items-center mt-1">
                        <span className="font-mono text-sm text-gray-600 break-all">
                          {showPassword[entry.id] ? entry.encryptedPassword : "••••••••••••••••"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(entry.id, entry.encryptedPassword)}
                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                        title="Copy Password"
                      >
                        {copiedId === entry.id ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6m6-4.5H9.375c-.621 0-1.125.504-1.125 1.125v4.375a2.25 2.25 0 0 1-2.25 2.25H6.75m6-4.5H9.375A1.125 1.125 0 0 0 8.25 6.75v-.75a1.5 1.5 0 0 1 1.5-1.5h1.5a1.5 1.5 0 0 1 1.5 1.5v.75m-6-1.5H6.75m6-1.5H9.375A1.125 1.125 0 0 0 8.25 6.75v-.75a1.5 1.5 0 0 1 1.5-1.5h1.5a1.5 1.5 0 0 1 1.5 1.5v.75m-6-1.5H6.75m1.5 10.5H6.75m6-4.5h-.75" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleShowPassword(entry.id)}
                        className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Show/Hide Password"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                          <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.027 3.75 12.001 3.75c4.975 0 9.191 3.226 10.678 7.697A11.998 11.998 0 0112 12.001a11.998 11.998 0 01-10.678-5.554zM12 17.25a5.25 5.25 0 100-10.5 5.25 5.25 0 000 10.5z" clipRule="evenodd"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeletePassword(entry.id)}
                        className="p-2 text-red-600 hover:text-red-800 transition-colors"
                        disabled={loading}
                        title="Delete Password"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
