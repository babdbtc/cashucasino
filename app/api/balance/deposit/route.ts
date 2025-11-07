import { NextRequest, NextResponse } from "next/server";
import { receiveToHouse } from "@/lib/wallet-manager";
import { isRateLimited } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { addToBalance } from "@/lib/auth";

/**
 * Deposit API - Convert Cashu token to server-side balance
 *
 * User sends Cashu token → Server verifies with mint → Adds to user's balance
 * Balance is stored server-side and tied to authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Rate limiting based on IP
    const ip = req.headers.get("x-forwarded-for") ||
                req.headers.get("x-real-ip") ||
                "unknown";

    // Allow 10 deposits per minute per IP
    if (isRateLimited(ip, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many deposit requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { token } = body;

    // Validate input
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      );
    }

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Receive the full token into house wallet (using the appropriate mode)
    let receivedAmount: number;
    try {
      receivedAmount = await receiveToHouse(token, walletMode);
      console.log(`[Deposit ${walletMode.toUpperCase()}] User ${user.id} deposited ${receivedAmount} sats`);
    } catch (error) {
      console.error("Token receive error:", error);
      return NextResponse.json(
        { error: "Failed to verify token. Token may be invalid or already spent." },
        { status: 400 }
      );
    }

    // Add to user's balance (in the appropriate database)
    const newBalance = addToBalance(user.id, receivedAmount, "deposit", walletMode, `Cashu token deposit`);

    // Return the new balance
    return NextResponse.json({
      success: true,
      amount: receivedAmount,
      newBalance,
      message: `Successfully deposited ${receivedAmount} sats to your balance`,
    });

  } catch (error) {
    console.error("Deposit error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your deposit" },
      { status: 500 }
    );
  }
}
