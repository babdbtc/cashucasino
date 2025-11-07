import { NextResponse } from "next/server";
import { createUser } from "@/lib/auth";

/**
 * POST /api/auth/register
 * Create a new user account
 * Returns the 16-digit account ID
 */
export async function POST() {
  try {
    const accountId = createUser();

    return NextResponse.json({
      success: true,
      accountId,
      message: "Account created successfully. Please save your account ID - you'll need it to log in.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
