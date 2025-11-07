import { NextRequest, NextResponse } from "next/server";
import { loginOrCreateNostrUser, createSession } from "@/lib/auth";
import { verifyNostrAuth, npubToHex } from "@/lib/nostr";
import { isRateLimited } from "@/lib/rate-limiter";

/**
 * Nostr Login API - NIP-98 HTTP Auth
 *
 * User signs a Nostr event with their extension, we verify it, then log them in
 */

const SESSION_COOKIE_NAME = "casino_session";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (isRateLimited(ip, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { event, pubkey } = body;

    if (!event || !pubkey) {
      return NextResponse.json(
        { error: "Missing event or pubkey" },
        { status: 400 }
      );
    }

    // Generate challenge from IP + timestamp (in production, store challenges in Redis)
    const challenge = Buffer.from(ip + Math.floor(Date.now() / 1000)).toString("base64");

    // Verify the Nostr auth event
    if (!verifyNostrAuth(event, challenge)) {
      return NextResponse.json(
        { error: "Invalid Nostr authentication" },
        { status: 401 }
      );
    }

    // Verify pubkey matches event
    if (event.pubkey !== pubkey) {
      return NextResponse.json(
        { error: "Pubkey mismatch" },
        { status: 401 }
      );
    }

    // Login or create user
    const user = loginOrCreateNostrUser(pubkey);

    // Create session
    const sessionId = createSession(user.id, user.wallet_mode);

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        accountId: user.account_id,
        nostrPubkey: user.nostr_pubkey,
        balance: user.balance,
        walletMode: user.wallet_mode,
        createdAt: user.created_at,
        lastLogin: user.last_login,
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
    console.error("[Nostr Login] Error:", error);
    return NextResponse.json(
      { error: "An error occurred during Nostr login" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to generate challenge for Nostr auth
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const challenge = Buffer.from(ip + Math.floor(Date.now() / 1000)).toString("base64");

  return NextResponse.json({
    challenge,
  });
}
