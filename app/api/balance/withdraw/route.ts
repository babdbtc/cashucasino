import { NextRequest, NextResponse } from "next/server";
import { sendFromHouse, getHouseBalance } from "@/lib/wallet-manager";
import { isRateLimited } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { subtractFromBalance, getUserBalance, addToBalance } from "@/lib/auth";

/**
 * Withdraw API - Convert server-side balance to Cashu token
 *
 * User requests withdrawal → Server deducts from balance → Creates Cashu token
 * Returns the token for the user to claim
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

    // Allow 10 withdrawals per minute per IP
    if (isRateLimited(ip, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many withdrawal requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { amount } = body;

    // Validate input
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid withdrawal amount" },
        { status: 400 }
      );
    }

    // Check minimum withdrawal (1 sat)
    if (amount < 1) {
      return NextResponse.json(
        { error: "Minimum withdrawal is 1 sat" },
        { status: 400 }
      );
    }

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Check user balance (from the appropriate database)
    const userBalance = getUserBalance(user.id, walletMode);
    if (userBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient balance. You have ${userBalance} sats, need ${amount} sats` },
        { status: 400 }
      );
    }

    // Check house wallet balance (for the appropriate mode)
    const houseBalance = await getHouseBalance(walletMode);
    if (houseBalance < amount) {
      console.error(`[Withdraw ${walletMode.toUpperCase()}] Insufficient house balance. Requested: ${amount}, Available: ${houseBalance}`);
      return NextResponse.json(
        { error: "Casino cannot process withdrawal at this time. Please contact support." },
        { status: 503 }
      );
    }

    // CRITICAL: Deduct from user's balance FIRST before creating token
    // This prevents the race condition where token is created but balance isn't deducted
    const newBalance = subtractFromBalance(user.id, amount, "withdraw", walletMode, `Cashu token withdrawal`);

    if (newBalance === null) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Now create withdrawal token from house wallet (using the appropriate mode)
    // If this fails, we need to refund the user's balance
    let token: string;
    try {
      token = await sendFromHouse(amount, walletMode);
      console.log(`[Withdraw ${walletMode.toUpperCase()}] User ${user.id} withdrew ${amount} sats`);
    } catch (error) {
      console.error("Withdrawal token creation error:", error);

      // CRITICAL: Refund the balance since token creation failed
      addToBalance(user.id, amount, "refund", walletMode, "Withdrawal token creation failed - refund");

      return NextResponse.json(
        { error: "Failed to create withdrawal token. Your balance has been refunded." },
        { status: 500 }
      );
    }

    // Return the token
    return NextResponse.json({
      success: true,
      amount,
      token,
      newBalance,
      message: `Successfully withdrew ${amount} sats`,
    });

  } catch (error) {
    console.error("Withdrawal error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your withdrawal" },
      { status: 500 }
    );
  }
}
