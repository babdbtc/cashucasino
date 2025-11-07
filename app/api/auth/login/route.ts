import { NextRequest, NextResponse } from "next/server";
import { getUserByAccountId, createSession, updateLastLogin } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth-middleware";

/**
 * POST /api/auth/login
 * Login with account ID
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId } = body;

    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Verify account ID exists
    const user = getUserByAccountId(accountId);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid account ID" },
        { status: 401 }
      );
    }

    // Create session in the user's wallet mode database
    const sessionId = createSession(user.id, user.wallet_mode);

    // Update last login in the user's wallet mode database
    updateLastLogin(user.id, user.wallet_mode);

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully",
      user: {
        balance: user.balance,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Failed to log in" },
      { status: 500 }
    );
  }
}
