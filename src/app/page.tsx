"use client";

import { useState } from "react";
import PasswordVault from "../components/PasswordVault";
import PhishingAnalyzer from "../components/PhishingAnalyzer";
import SecurityTips from "../components/SecurityTips";

// Define the view types to control which component is visible
type ViewType = "analyzer" | "vault";

export default function Home() {
  // State to manage the active view, defaulting to the analyzer
  const [activeView, setActiveView] = useState<ViewType>("analyzer");

  return (
    <div className="flex min-h-screen flex-col items-center p-6 bg-gray-100">
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-8">
        {/* Main Content Area */}
        <div className="w-full md:w-2/3 bg-white p-8 rounded-lg shadow-lg mb-8 md:mb-0">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            SME Digital Safety Hub
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Your centralized suite for digital security.
          </p>

          {/* Navigation buttons to switch views */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setActiveView("analyzer")}
              className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                activeView === "analyzer"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Phishing Analyzer
            </button>
            <button
              onClick={() => setActiveView("vault")}
              className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                activeView === "vault"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Password Vault
            </button>
          </div>

          {/* Conditionally render the selected view */}
          {activeView === "analyzer" && <PhishingAnalyzer />}
          {activeView === "vault" && <PasswordVault />}
        </div>

        {/* Security Tips Aside */}
        <div className="w-full md:w-1/3 bg-white p-8 rounded-lg shadow-lg overflow-y-auto h-[80vh] sticky top-8">
          <SecurityTips />
        </div>
      </div>
    </div>
  );
}
