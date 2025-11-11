import { NextRequest, NextResponse } from "next/server";
import { playSpin } from "@/lib/slots";
import { isRateLimitedByMode } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { subtractFromBalance, addToBalance, getUserBalance } from "@/lib/auth";

const MAX_BET = parseInt(process.env.MAX_BET_SATS || "1000");
const MIN_BET = parseInt(process.env.MIN_BET_SATS || "1");

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Rate limiting with different limits for demo vs real play
    const ip = request.headers.get("x-forwarded-for") ||
                request.headers.get("x-real-ip") ||
                "unknown";

    if (isRateLimitedByMode(ip, walletMode, user.account_id, {
      demoMaxRequests: 60,     // Very restrictive for demo
      demoWindowMs: 60 * 1000,
      realMaxRequests: 10000,  // Anti-DDoS only
      realWindowMs: 60 * 1000,
    })) {
      return NextResponse.json(
        { error: `Too many requests. Please wait a moment before playing again. (${walletMode} mode)` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { betAmount } = body;

    // Validate input
    if (!betAmount || typeof betAmount !== "number") {
      return NextResponse.json(
        { error: "Invalid bet amount" },
        { status: 400 }
      );
    }

    if (betAmount < MIN_BET || betAmount > MAX_BET) {
      return NextResponse.json(
        { error: `Bet must be between ${MIN_BET} and ${MAX_BET} sats` },
        { status: 400 }
      );
    }

    // Check user balance
    const userBalance = getUserBalance(user.id, walletMode);
    if (userBalance < betAmount) {
      return NextResponse.json(
        { error: `Insufficient balance. You have ${userBalance} sats, need ${betAmount} sats` },
        { status: 400 }
      );
    }

    // Deduct bet from user's balance
    const balanceAfterBet = subtractFromBalance(user.id, betAmount, "bet", walletMode, `Slots bet`);
    if (balanceAfterBet === null) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    console.log(`[Slots ${walletMode.toUpperCase()}] User ${user.id} bet ${betAmount} sats`);

    // Play the spin
    const result = playSpin(betAmount);

    // If player won, add winnings to balance
    let newBalance = balanceAfterBet;
    if (result.winAmount > 0) {
      newBalance = addToBalance(user.id, result.winAmount, "win", walletMode, `Slots win`);
      console.log(`[Slots] User ${user.id} won ${result.winAmount} sats`);
    } else {
      console.log(`[Slots] User ${user.id} lost ${betAmount} sats`);
    }

    // Return result with updated balance
    return NextResponse.json({
      ...result,
      newBalance,
      message: result.winAmount > 0
        ? `You won ${result.winAmount} sat!`
        : "Better luck next time!",
    });

  } catch (error) {
    console.error("Slot play error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your spin" },
      { status: 500 }
    );
  }
}
