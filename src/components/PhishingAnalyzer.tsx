"use client";

import { useState, useRef, ReactNode } from "react";

interface AnalysisResult {
  score: number;
  reasoning: string;
}

export default function PhishingAnalyzer() {
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) throw new Error("Failed to analyze text.");

      const data: AnalysisResult = await response.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          }),
        100
      );
    }
  };

  // Parse markdown-like bold/italic and lists into React elements
  const parseReasoning = (text: string): ReactNode[] => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const elements: ReactNode[] = [];
    let listItems: ReactNode[] = [];

    const parseInlineStyles = (line: string): ReactNode[] => {
      const nodes: ReactNode[] = [];
      let lastIndex = 0;
      const regex = /(\*\*(.*?)\*\*|\*(.*?)\*)/g;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex)
          nodes.push(line.slice(lastIndex, match.index));
        if (match[2]) nodes.push(<strong key={match.index}>{match[2]}</strong>);
        else if (match[3]) nodes.push(<em key={match.index}>{match[3]}</em>);
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < line.length) nodes.push(line.slice(lastIndex));
      return nodes;
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        listItems.push(
          <li key={index}>{parseInlineStyles(trimmed.substring(2))}</li>
        );
      } else {
        if (listItems.length > 0) {
          elements.push(<ul key={"ul-" + index}>{listItems}</ul>);
          listItems = [];
        }
        elements.push(<p key={index}>{parseInlineStyles(trimmed)}</p>);
      }
    });

    if (listItems.length > 0) elements.push(<ul key="last-ul">{listItems}</ul>);

    return elements;
  };

  const getScoreStyle = (score: number) => {
    if (score >= 80)
      return { color: "text-red-600", bg: "bg-red-100", emoji: "🚫" };
    if (score >= 40)
      return { color: "text-yellow-600", bg: "bg-yellow-100", emoji: "⚠️" };
    return { color: "text-green-600", bg: "bg-green-100", emoji: "✅" };
  };

  const scoreStyle = analysisResult
    ? getScoreStyle(analysisResult.score)
    : null;

  return (
    <div>
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
        />
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
            Analysis Result <span className="ml-2">{scoreStyle?.emoji}</span>
          </h2>
          <p className="text-gray-700 mb-2">
            <strong>Suspicion Score:</strong>{" "}
            <span className={`font-bold ${scoreStyle?.color}`}>
              {analysisResult.score}/100
            </span>
          </p>
          <p className="text-gray-700">
            <strong>Reasoning:</strong>
          </p>
          <div className="prose text-gray-600 mt-2">
            {parseReasoning(analysisResult.reasoning)}
          </div>
        </div>
      )}
    </div>
  );
}
