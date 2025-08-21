import { NextRequest, NextResponse } from "next/server";

// Types for the Gemini API request
interface ChatPart {
  text: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  parts: ChatPart[];
}

interface GeminiRequestPayload {
  contents: ChatMessage[];
}

// Types for the Gemini API response
interface GeminiResponseCandidate {
  content: {
    parts: ChatPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiResponseCandidate[];
  [key: string]: any; // For any extra fields we don't care about
}

export async function POST(req: NextRequest) {
  try {
    const prompt =
      "Generate a list of 5 concise and actionable digital security tips for small business owners. Format the response as a simple markdown list.";

    const chatHistory: ChatMessage[] = [
      { role: "user", parts: [{ text: prompt }] },
    ];

    const payload: GeminiRequestPayload = { contents: chatHistory };
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let response: Response | undefined;
    const maxRetries = 3;
    const baseDelay = 1000;
    let retries = 0;

    while (retries < maxRetries) {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) break;

      retries++;
      await new Promise((res) =>
        setTimeout(res, baseDelay * Math.pow(2, retries))
      );
    }

    if (!response || !response.ok) {
      throw new Error("Failed to generate tips after multiple retries.");
    }

    const result: GeminiResponse = await response.json();

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No content received from API.");
    }

    return NextResponse.json({ tips: text });
  } catch (error: unknown) {
    console.error("Error generating tips:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
