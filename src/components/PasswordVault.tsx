// components/PasswordVault.tsx
"use client";

import { useState } from "react";
import { usePasswordVault } from "../hooks/usePasswordVault";

// Define a type for the password strength state
type PasswordStrength = "None" | "Weak" | "Medium" | "Strong";

export default function PasswordVault() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordName, setPasswordName] = useState("");
  const {
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
  } = usePasswordVault();

  const [inputErrors, setInputErrors] = useState<{
    email?: string;
    password?: string;
    save?: string;
  }>({});

  // State to manage password strength and visibility for input fields
  const [passwordStrength, setPasswordStrength] =
    useState<PasswordStrength>("None");
  const [showInputPassword, setShowInputPassword] = useState(false);

  // State to manage visibility for saved passwords and copy feedback
  const [showSavedPasswords, setShowSavedPasswords] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New state to manage the loading state of the password generator
  const [isGenerating, setIsGenerating] = useState(false);

  // Function to check password strength and update state
  const checkPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) {
      score += 1;
    }
    if (/[A-Z]/.test(pw)) {
      score += 1;
    }
    if (/[0-9]/.test(pw)) {
      score += 1;
    }
    if (/[^A-Za-z0-9]/.test(pw)) {
      score += 1;
    }

    if (pw.length === 0) {
      setPasswordStrength("None");
    } else if (score < 2) {
      setPasswordStrength("Weak");
    } else if (score <= 3) {
      setPasswordStrength("Medium");
    } else {
      setPasswordStrength("Strong");
    }
  };

  // Dynamically update password strength on password change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
  };

  // Toggle password visibility for input fields
  const toggleInputPasswordVisibility = () => {
    setShowInputPassword(!showInputPassword);
  };

  // Toggle password visibility for saved passwords
  const toggleSavedPasswordsVisibility = () => {
    setShowSavedPasswords(!showSavedPasswords);
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text: string, id: string) => {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);

    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  // New function to handle password generation from the API route
  const handleGeneratePassword = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/password-generator");
      if (!response.ok) {
        throw new Error("Failed to generate password.");
      }
      const data = await response.json();
      const generatedPassword = data.password;
      setPassword(generatedPassword);
      checkPasswordStrength(generatedPassword);
    } catch (err) {
      console.error(err);
      // You could also show an error message to the user here
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle user sign-in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputErrors({});
    if (!email.trim()) {
      setInputErrors((prev) => ({ ...prev, email: "Email is required." }));
    }
    if (!password.trim()) {
      setInputErrors((prev) => ({
        ...prev,
        password: "Password is required.",
      }));
    }
    if (!email.trim() || !password.trim()) return;
    await signIn(email, password);
  };

  // Handle user sign-up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputErrors({});
    if (!email.trim()) {
      setInputErrors((prev) => ({ ...prev, email: "Email is required." }));
    }
    if (!password.trim()) {
      setInputErrors((prev) => ({
        ...prev,
        password: "Password is required.",
      }));
    }
    if (!email.trim() || !password.trim()) return;
    await signUp(email, password);
  };

  // Handle saving a password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputErrors({});
    if (!passwordName.trim()) {
      setInputErrors((prev) => ({
        ...prev,
        save: "Password name is required.",
      }));
      return;
    }
    if (!password.trim()) {
      setInputErrors((prev) => ({
        ...prev,
        save: "Password value is required.",
      }));
      return;
    }
    await savePassword(passwordName, password);
    setPassword("");
    setPasswordName("");
    setPasswordStrength("None");
  };

  // Handle deleting a password
  const handleDeletePassword = async (id: string) => {
    await deletePassword(id);
  };

  // Determine the color of the strength meter
  const strengthColor = () => {
    switch (passwordStrength) {
      case "Weak":
        return "bg-red-500";
      case "Medium":
        return "bg-yellow-500";
      case "Strong":
        return "bg-green-500";
      default:
        return "bg-gray-300";
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl mx-auto mt-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
        Password Vault
      </h2>
      <p className="text-center text-gray-500 mb-8">
        Securely store your passwords here.
      </p>

      {!isLoggedIn ? (
        <div className="space-y-6">
          <form onSubmit={handleSignIn} className="flex flex-col gap-4 w-full">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`p-4 border rounded-lg focus:outline-none focus:ring-2 transition ${
                inputErrors.email
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              disabled={loading}
            />
            {inputErrors.email && (
              <p className="text-red-500 text-sm mt-1">{inputErrors.email}</p>
            )}

            <div className="relative">
              <input
                type={showInputPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                className={`p-4 border rounded-lg focus:outline-none focus:ring-2 transition w-full pr-12 ${
                  inputErrors.password
                    ? "border-red-400 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                disabled={loading}
              />
              <div className="group absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={toggleInputPasswordVisibility}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showInputPassword ? (
                    // Open eye icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.575 3.01 9.963 7.172.083.33.083.66 0 .99C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.575-3.01-9.963-7.172z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  ) : (
                    // Closed eye icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.981 12c-2.43 1.026-3.981 3.253-3.981 5.768a4 4 0 0 0 4 4h16c2.21 0 4-1.79 4-4a5.21 5.21 0 0 0-3.981-5.768M12 9a6 6 0 0 0-3 10.999M12 9c2.43 1.026 3.981 3.253 3.981 5.768a4 4 0 0 1-4 4"
                      />
                    </svg>
                  )}
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-max rounded-lg bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                  {showInputPassword ? "Hide password" : "Show password"}
                </span>
              </div>
            </div>
            {/* Password strength meter and hints */}
            <div className="mt-2">
              <div className="w-full h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strengthColor()}`}
                  style={{
                    width:
                      password.length === 0
                        ? "0%"
                        : `${(password.length / 16) * 100}%`,
                  }}
                ></div>
              </div>
              <p
                className={`text-sm mt-1 font-semibold ${
                  passwordStrength === "Weak"
                    ? "text-red-500"
                    : passwordStrength === "Medium"
                    ? "text-yellow-500"
                    : passwordStrength === "Strong"
                    ? "text-green-500"
                    : "text-gray-500"
                }`}
              >
                Strength: {passwordStrength}
              </p>
              <ul className="list-disc list-inside text-xs text-gray-500 mt-2">
                <li>Password should be at least 8 characters long.</li>
                <li>Include uppercase and lowercase letters.</li>
                <li>Include at least one number and a special character.</li>
              </ul>
            </div>
            {inputErrors.password && (
              <p className="text-red-500 text-sm mt-1">
                {inputErrors.password}
              </p>
            )}

            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              disabled={loading}
            >
              Sign In
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <button
                onClick={handleSignUp}
                className="text-blue-600 hover:text-blue-800 font-semibold"
                disabled={loading}
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-500 text-sm">
              Logged in as: <span className="font-semibold">{userId}</span>
            </p>
            <button
              onClick={signOutUser}
              className="bg-gray-200 text-gray-800 text-sm font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Sign Out
            </button>
          </div>

          <form onSubmit={handleSavePassword} className="w-full mb-6 space-y-4">
            <input
              type="text"
              placeholder="Name (e.g., Google login)"
              value={passwordName}
              onChange={(e) => setPasswordName(e.target.value)}
              className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              disabled={loading}
            />
            <div className="relative">
              <input
                type={showInputPassword ? "text" : "password"}
                placeholder="Enter a password or generate one"
                value={password}
                onChange={handlePasswordChange}
                className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full pr-12"
                disabled={loading}
              />
              <div className="group absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={toggleInputPasswordVisibility}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showInputPassword ? (
                    // Open eye icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.575 3.01 9.963 7.172.083.33.083.66 0 .99C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.575-3.01-9.963-7.172z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  ) : (
                    // Closed eye icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.981 12c-2.43 1.026-3.981 3.253-3.981 5.768a4 4 0 0 0 4 4h16c2.21 0 4-1.79 4-4a5.21 5.21 0 0 0-3.981-5.768M12 9a6 6 0 0 0-3 10.999M12 9c2.43 1.026 3.981 3.253 3.981 5.768a4 4 0 0 1-4 4"
                      />
                    </svg>
                  )}
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-max rounded-lg bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                  {showInputPassword ? "Hide password" : "Show password"}
                </span>
              </div>
            </div>
            {/* Password strength meter and hints */}
            <div className="mt-2">
              <div className="w-full h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strengthColor()}`}
                  style={{
                    width:
                      password.length === 0
                        ? "0%"
                        : `${(password.length / 16) * 100}%`,
                  }}
                ></div>
              </div>
              <p
                className={`text-sm mt-1 font-semibold ${
                  passwordStrength === "Weak"
                    ? "text-red-500"
                    : passwordStrength === "Medium"
                    ? "text-yellow-500"
                    : passwordStrength === "Strong"
                    ? "text-green-500"
                    : "text-gray-500"
                }`}
              >
                Strength: {passwordStrength}
              </p>
              <ul className="list-disc list-inside text-xs text-gray-500 mt-2">
                <li>Password should be at least 8 characters long.</li>
                <li>Include uppercase and lowercase letters.</li>
                <li>Include at least one number and a special character.</li>
              </ul>
            </div>
            {inputErrors.save && (
              <p className="text-red-500 text-sm mt-1">{inputErrors.save}</p>
            )}
            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400"
                disabled={loading || isGenerating}
              >
                {loading ? "Saving..." : "Save Password"}
              </button>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="flex-1 bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-400"
                disabled={loading || isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate Password"}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <p className="font-semibold">Authentication Error:</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Saved Passwords ({entries.length})
              </h3>
              <div className="group relative flex items-center">
                <button
                  onClick={toggleSavedPasswordsVisibility}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-800 transition-colors"
                  disabled={loading}
                >
                  {showSavedPasswords ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 mr-1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.981 12c-2.43 1.026-3.981 3.253-3.981 5.768a4 4 0 0 0 4 4h16c2.21 0 4-1.79 4-4a5.21 5.21 0 0 0-3.981-5.768M12 9a6 6 0 0 0-3 10.999M12 9c2.43 1.026 3.981 3.253 3.981 5.768a4 4 0 0 1-4 4"
                        />
                      </svg>
                      Hide
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 mr-1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.575 3.01 9.963 7.172.083.33.083.66 0 .99C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.575-3.01-9.963-7.172z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Show
                    </>
                  )}
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-max rounded-lg bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                  {showSavedPasswords
                    ? "Hide all passwords"
                    : "Show all passwords"}
                </span>
              </div>
            </div>

            {loading ? (
              <p className="text-center text-gray-500">Loading entries...</p>
            ) : entries.length === 0 ? (
              <p className="text-center text-gray-500">
                No passwords saved yet.
              </p>
            ) : (
              <ul className="space-y-4">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="p-4 bg-gray-50 rounded-lg shadow-sm flex justify-between items-center"
                  >
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-800">
                        {entry.name}
                      </p>
                      <p className="font-mono text-sm text-gray-600 break-all mt-1">
                        {showSavedPasswords
                          ? entry.encryptedPassword
                          : "********"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {copiedId === entry.id && (
                        <span className="text-green-500 text-sm">Copied!</span>
                      )}

                      {/* Copy Button with Tooltip */}
                      <div className="group relative">
                        <button
                          onClick={() =>
                            copyToClipboard(entry.encryptedPassword, entry.id)
                          }
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          disabled={loading}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12h-2.25c-.214 0-.424.03-.622.083a2.75 2.75 0 0 1-2.483-2.483 2.75 2.75 0 0 1 2.483-2.483c.198.053.408.083.622.083h2.25m6.75 0h2.25c.214 0 .424-.03.622-.083a2.75 2.75 0 0 1 2.483 2.483c-.053.198-.083.408-.083.622v12.25c0 .214-.03.424-.083.622a2.75 2.75 0 0 1-2.483 2.483c-.198.053-.408.083-.622.083h-12.25m3.75-2.25h-2.25c-.214 0-.424-.03-.622-.083a2.75 2.75 0 0 1-2.483-2.483c-.053-.198-.083-.408-.083-.622v-12.25c0-.214.03-.424.083-.622a2.75 2.75 0 0 1 2.483-2.483c.198-.053.408-.083.622-.083h12.25"
                            />
                          </svg>
                        </button>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-max rounded-lg bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                          Copy password
                        </span>
                      </div>

                      {/* Delete Button with Tooltip */}
                      <div className="group relative">
                        <button
                          onClick={() => handleDeletePassword(entry.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          disabled={loading}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 1.157a2.25 2.25 0 0 0-2.244-2.007H8.962a2.25 2.25 0 0 0-2.244 2.007L4.74 5.835m14.467 0a48.567 48.567 0 0 0-1.022-.165M6.415 6.415L5.26 9h13.48M6.26 9L4.74 5.835m1.52.58a48.567 48.567 0 0 1-1.022-.165"
                            />
                          </svg>
                        </button>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-max rounded-lg bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                          Delete password
                        </span>
                      </div>
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
