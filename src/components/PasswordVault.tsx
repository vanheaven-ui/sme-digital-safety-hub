"use client";

import { useState } from "react";

export default function PasswordVault() {
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    if (password.trim() === "") {
      setError("Please enter a password.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/password-vault", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error("Failed to process password.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePassword = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Call the new password generator API route
      const response = await fetch("/api/password-generator", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to generate password.");
      }

      const data = await response.json();
      setPassword(data.password);
    } catch (err) {
      console.error(err);
      setError("An error occurred while generating the password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Password Vault
      </h2>
      <p className="text-center text-gray-600 mb-8">
        Enter a password to see it securely hashed and encrypted, or generate a
        new one.
      </p>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input
            type="text"
            className="flex-grow p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter a password or generate one"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="sm:w-auto bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-md hover:bg-gray-300 transition-colors disabled:bg-gray-200 disabled:text-gray-500"
            disabled={loading}
          >
            Generate
          </button>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          disabled={loading}
        >
          {loading ? "Processing..." : "Process Password"}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 p-6 rounded-md border border-gray-200 bg-gray-50 break-words">
          <h3 className="text-xl font-semibold mb-2">Results</h3>
          <div className="mb-4">
            <p className="font-bold text-gray-700">Hashed Password (bcrypt):</p>
            <p className="font-mono text-sm text-gray-600 mt-1">
              {result.hashedPassword}
            </p>
          </div>
          <div>
            <p className="font-bold text-gray-700">
              Encrypted Password (crypto-js):
            </p>
            <p className="font-mono text-sm text-gray-600 mt-1">
              {result.encryptedPassword}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
