import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto-js";

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "a-secret-key-that-should-be-in-env";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || typeof password !== "string" || password.trim() === "") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const encryptedPassword = crypto.AES.encrypt(
      password,
      ENCRYPTION_KEY
    ).toString();

    return NextResponse.json({
      message: "Password encrypted and hashed successfully.",
      hashedPassword: hashedPassword,
      encryptedPassword: encryptedPassword,
    });
  } catch (error) {
    console.error("Error in password vault API:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}
