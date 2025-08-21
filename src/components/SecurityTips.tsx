"use client";

import { useState, useEffect } from "react";

interface SecurityTipsResponse {
  tips: string;
}

export default function SecurityTips() {
  const [tips, setTips] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTips = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/security-tips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to fetch security tips.");

        const data: SecurityTipsResponse = await response.json();
        if (!data.tips) throw new Error("No tips returned from the server.");

        setTips(data.tips);
      } catch (err: unknown) {
        console.error("Error fetching tips:", err);
        setError(err instanceof Error ? err.message : "Failed to load tips.");
      } finally {
        setLoading(false);
      }
    };

    fetchTips();
  }, []);

  //   const formatTips = (text: string) => {
  //     const lines = text
  //       .split("\n")
  //       .filter((line) => line.trim().startsWith("- "));

  //     return (
  //       <ul className="space-y-4 text-gray-700">
  //         {lines.map((line, index) => {
  //           const content = line.substring(2).trim();

  //           // Split bold markdown **bold** into React <strong> elements
  //           const parts = content
  //             .split(/\*\*(.*?)\*\*/g)
  //             .map((part, i) =>
  //               i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  //             );

  //           return <li key={index}>{parts}</li>;
  //         })}
  //       </ul>
  //     );
  //   };

  const formatTips = (text: string) => {
    // Split text into lines
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    // Parse lines into JSX
    return (
      <ul className="space-y-4 text-gray-700 list-disc list-inside">
        {lines.map((line, index) => {
          // Detect if it's a list item (unordered or numbered)
          const unorderedMatch = line.match(/^[-*]\s+(.*)/);
          const orderedMatch = line.match(/^\d+\.\s+(.*)/);

          if (!unorderedMatch && !orderedMatch) return null; // skip non-list lines

          const content = unorderedMatch ? unorderedMatch[1] : orderedMatch![1];

          // Split markdown bold **bold** and italic *italic* into JSX
          const parts = content
            .split(/(\*\*.*?\*\*|\*.*?\*)/g)
            .map((part, i) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith("*") && part.endsWith("*")) {
                return <em key={i}>{part.slice(1, -1)}</em>;
              }
              return part;
            });

          return <li key={index}>{parts}</li>;
        })}
      </ul>
    );
  };
  
  return (
    <div className="pt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
        Quick Security Tips
      </h2>

      {loading && (
        <div className="text-center text-gray-500">
          Generating fresh tips...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      )}

      {tips && formatTips(tips)}
    </div>
  );
}
