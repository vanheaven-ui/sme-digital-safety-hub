"use client";

import { useState } from "react";
import { PasswordEntry, usePasswordVault } from "../hooks/usePasswordVault";

export default function PasswordVault() {
  const [password, setPassword] = useState<string>("");
  const [passwordName, setPasswordName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const {
    entries,
    loading,
    error,
    isLoggedIn,
    isAuthReady,
    signIn,
    signUp,
    signOutUser,
    savePassword,
    deletePassword,
  } = usePasswordVault();

  const handleGeneratePassword = async () => {
    try {
      const response = await fetch("/api/password-generator", {
        method: "GET",
      });
      if (!response.ok) throw new Error("Failed to generate password.");
      const data: { password: string } = await response.json();
      setPassword(data.password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error("An unknown error occurred:", err);
      }
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !passwordName) {
      return;
    }
    await savePassword(passwordName, password, email, "");
    setPassword("");
    setPasswordName("");
    setEmail("");
  };

  const handleDeletePassword = async (id: string) => {
    await deletePassword(id);
  };

  const handleCopyPassword = (id: string, text: string) => {
    // Note: The navigator.clipboard API might not work in all environments (e.g., iframes without user gesture).
    // For a production app, you might want to use a fallback method.
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    } else {
      // Fallback for environments where clipboard API is not available
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const toggleShowPassword = (id: string) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
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
      {!isLoggedIn ? (
        <div>
          <h2 className="text-2xl font-bold mb-4">Password Vault Login</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signIn(email, authPassword);
            }}
            className="space-y-4"
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border p-2 w-full rounded"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="border p-2 w-full rounded"
              required
            />
            <div className="flex justify-between">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => signUp(email, authPassword)}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Sign Up
              </button>
            </div>
            {error && <p className="text-red-600 text-center mt-2">{error}</p>}
          </form>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Password Vault</h2>
            <button
              onClick={signOutUser}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              Sign Out
            </button>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-4 mb-6">
            <input
              type="text"
              placeholder="Password Name (e.g., Gmail)"
              value={passwordName}
              onChange={(e) => setPasswordName(e.target.value)}
              className="border p-2 w-full rounded"
              required
            />
            <input
              type="text"
              placeholder="Generated Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border p-2 w-full rounded"
              required
            />
            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="bg-purple-600 text-white px-4 py-2 rounded"
              >
                Generate Password
              </button>
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Save Password
              </button>
            </div>
          </form>

          {loading && <p>Loading...</p>}
          {error && <p className="text-red-600">{error}</p>}

          <ul className="space-y-4">
            {entries.map((entry: PasswordEntry) => (
              <li
                key={entry.id}
                className="border p-4 rounded flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{entry.name}</p>
                  <p className="text-gray-600">
                    {showPassword[entry.id] ? entry.hashedPassword : "••••••••"}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => toggleShowPassword(entry.id)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded"
                  >
                    {showPassword[entry.id] ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() =>
                      handleCopyPassword(entry.id, entry.hashedPassword)
                    }
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    {copiedId === entry.id ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => handleDeletePassword(entry.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
