import { NextRequest, NextResponse } from "next/server";
import { playPlinko, RiskLevel } from "@/lib/plinko";
import { isRateLimitedByMode } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { subtractFromBalance, addToBalance, getUserBalance } from "@/lib/auth";

const MAX_BET = 500;
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

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Rate limiting with different limits for demo vs real play
    // Demo: 100 requests/minute (restrictive to encourage real play)
    // Real: 500 requests/minute (generous for paying users)
    const ip = request.headers.get("x-forwarded-for") ||
                request.headers.get("x-real-ip") ||
                "unknown";

    if (isRateLimitedByMode(ip, walletMode, user.account_id, {
      demoMaxRequests: 30,     // Very restrictive for demo
      demoWindowMs: 60 * 1000,
      realMaxRequests: 10000,  // Anti-DDoS only, normal players never hit this
      realWindowMs: 60 * 1000,
    })) {
      return NextResponse.json(
        { error: `Too many requests. Please wait a moment before playing again. (${walletMode} mode)` },
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

    if (!["low", "medium"].includes(risk)) {
      return NextResponse.json({ error: "Invalid risk level. Only 'low' and 'medium' are allowed." }, { status: 400 });
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
