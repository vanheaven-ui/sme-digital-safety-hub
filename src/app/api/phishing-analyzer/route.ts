// app/api/phishing-analyzer/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Best Practice: Use environment variables for sensitive data
// We will set this in a .env.local file
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

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // This is the core of our AI logic: the prompt.
    // The quality of the response depends on a good prompt.
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponseText = response.text();

    // The AI response might contain the score and reasoning.
    // We can parse it here to make it a structured JSON response.
    const scoreMatch = aiResponseText.match(/Suspicion Score: (\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

    // We can also extract the reasoning here to make the data more structured.
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
