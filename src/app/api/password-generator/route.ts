import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  try {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

    const allChars = chars + numbers + symbols;

    const passwordLength = 16;
    let password = "";

    for (let i = 0; i < passwordLength; i++) {
      const randomIndex = crypto.randomInt(allChars.length);
      password += allChars[randomIndex];
    }

    return NextResponse.json({ password });
  } catch (error) {
    console.error("Error generating password:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}
