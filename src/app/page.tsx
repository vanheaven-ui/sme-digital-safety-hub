"use client";

import { useState, useRef, useEffect } from "react";

// Define the expected API response type
interface AnalysisResult {
  score: number;
  reasoning: string;
  // fullResponse is also returned but not used in the UI
}

export default function Home() {
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Create a ref for the result section
  const resultRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAnalysisResult(null);
    setError(null);

    if (inputText.trim() === "") {
      setError("Please enter some text to analyze.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/phishing-analyzer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze text.");
      }

      const data: AnalysisResult = await response.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error(err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
      // Scroll to the result section after the result is set
      if (resultRef.current) {
        resultRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  };

  // Helper function to determine the color and emoji based on the score
  const getScoreStyle = (score: number) => {
    if (score >= 80) {
      return {
        color: "text-red-600",
        bg: "bg-red-100",
        emoji: "🚨",
      };
    } else if (score >= 40) {
      return {
        color: "text-yellow-600",
        bg: "bg-yellow-100",
        emoji: "⚠️",
      };
    } else {
      return {
        color: "text-green-600",
        bg: "bg-green-100",
        emoji: "✅",
      };
    }
  };

  const scoreStyle = analysisResult
    ? getScoreStyle(analysisResult.score)
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-100">
      <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          SME Digital Safety Hub
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Analyze suspicious emails and messages to detect phishing attempts.
        </p>

        <form onSubmit={handleAnalyze} className="w-full">
          <textarea
            className="w-full p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            rows={6}
            placeholder="Paste your suspicious text here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          ></textarea>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Analyze Text"}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p>{error}</p>
          </div>
        )}

        {analysisResult && (
          <div
            // Attach the ref here
            ref={resultRef}
            className={`mt-6 p-6 rounded-md border ${
              scoreStyle ? scoreStyle.bg : "bg-gray-50"
            } ${
              scoreStyle
                ? "border-" + scoreStyle.bg.split("-")[1] + "-400"
                : "border-gray-200"
            }`}
          >
            <h2 className="text-2xl font-semibold mb-3 flex items-center">
              Analysis Result
              <span className="ml-2">{scoreStyle?.emoji}</span>
            </h2>
            <p className="text-gray-700 mb-2">
              <strong>Suspicion Score:</strong>{" "}
              <span
                className={`font-bold ${scoreStyle ? scoreStyle.color : ""}`}
              >
                {analysisResult.score}/100
              </span>
            </p>
            <p className="text-gray-700">
              <strong>Reasoning:</strong>
            </p>
            <div
              className="prose text-gray-600 mt-2"
              dangerouslySetInnerHTML={{
                __html: analysisResult.reasoning.replace(/\n/g, "<br/>"),
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
