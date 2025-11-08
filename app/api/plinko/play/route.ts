import { NextRequest, NextResponse } from "next/server";
import { playPlinko, RiskLevel } from "@/lib/plinko";
import { isRateLimited } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { subtractFromBalance, addToBalance, getUserBalance } from "@/lib/auth";

const MAX_BET = 1000;
const MIN_BET = 1;

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

    // Rate limiting: 500 requests per minute per IP (~8 per second average)
    const ip = request.headers.get("x-forwarded-for") ||
                request.headers.get("x-real-ip") ||
                "unknown";

    if (isRateLimited(ip, 500, 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before playing again." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { betAmount, risk } = body;

    // Comprehensive bet validation
    if (typeof betAmount !== "number" ||
        !Number.isFinite(betAmount) ||
        !Number.isInteger(betAmount) ||
        betAmount < MIN_BET ||
        betAmount > MAX_BET) {
      return NextResponse.json({
        error: `Bet must be a positive integer between ${MIN_BET} and ${MAX_BET} sats`
      }, { status: 400 });
    }

    if (!["low", "medium", "high"].includes(risk)) {
      return NextResponse.json({ error: "Invalid risk level" }, { status: 400 });
    }

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Check user balance
    const userBalance = getUserBalance(user.id, walletMode);
    if (userBalance < betAmount) {
      return NextResponse.json(
        { error: `Insufficient balance. You have ${userBalance} sats, need ${betAmount} sats` },
        { status: 400 }
      );
    }

    // Deduct bet from user's balance
    const balanceAfterBet = subtractFromBalance(user.id, betAmount, "bet", walletMode, `Plinko bet`);
    if (balanceAfterBet === null) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    console.log(`[Plinko ${walletMode.toUpperCase()}] User ${user.id} bet ${betAmount} sats (risk: ${risk})`);

    const result = playPlinko(risk as RiskLevel);
    const winAmount = Math.floor(betAmount * result.multiplier);

    // Add winnings to balance
    let newBalance = balanceAfterBet;
    if (winAmount > 0) {
      newBalance = addToBalance(user.id, winAmount, "win", walletMode, `Plinko win`);
      console.log(`[Plinko] User ${user.id} won ${winAmount} sats`);
    } else {
      console.log(`[Plinko] User ${user.id} lost ${betAmount} sats`);
    }

    return NextResponse.json({ ...result, winAmount, newBalance });
  } catch (error) {
    console.error("[PLINKO_PLAY_ERROR]", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
