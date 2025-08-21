// app/api/phishing-analyzer/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Best Practice: Use environment variables for sensitive data
const apiKey = process.env.GEMINI_API_KEY;

// Check if the API key is available
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim() === "") {
      return NextResponse.json(
        { error: "Text input is required" },
        { status: 400 }
      );
    }

    // Correctly define the model name in a constant variable
    const MODEL_NAME = "gemini-2.5-flash";

    // This is the core of our AI logic: the prompt.
    const prompt = `
      You are an expert cybersecurity analyst for a small business.
      Your task is to analyze the following text from an email or a message and determine if it is a phishing attempt or a scam.
      Provide a clear "Suspicion Score" from 0-100.
      Then, provide a brief, easy-to-understand explanation of your reasoning.
      Use bullet points for the key indicators you found.
      
      Example:
      Suspicion Score: 95
      Reasoning:
      - Urgency and threats ("your account will be suspended").
      - Asks for personal information or credentials.
      - Poor grammar or unusual phrasing.
      
      Analyze the following text:
      "${text}"
    `;

    // --- Start of Retry and Caching Implementation ---
    const maxRetries = 3;
    let delay = 1000; // 1 second initial delay
    let result = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey as string,
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
            }),
            next: { tags: ["gemini-analysis"] },
          }
        );

        if (response.status === 429) {
          console.log(`Rate limit exceeded. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue; // Go to the next loop iteration
        }

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(`API error: ${JSON.stringify(errorBody)}`);
        }

        result = await response.json();
        break; // Success! Exit the retry loop.
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw error;
        }
      }
    }

    if (!result) {
      throw new Error(
        "Failed to get a response from the Gemini API after multiple retries."
      );
    }

    // --- End of Retry and Caching Implementation ---

    // The AI response might contain the score and reasoning.
    const aiResponseText = result.candidates[0].content.parts[0].text;
    const scoreMatch = aiResponseText.match(/Suspicion Score: (\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

    const reasoning = aiResponseText
      .replace(/Suspicion Score: \d+\n+Reasoning:\n+/, "")
      .trim();

    return NextResponse.json({
      score,
      reasoning,
      fullResponse: aiResponseText,
    });
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}
