import { NextRequest, NextResponse } from "next/server";
import { playSpin } from "@/lib/sweet-bonanza";
import { isRateLimitedByMode } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { subtractFromBalance, addToBalance, getUserBalance, updateGameState } from "@/lib/auth";

const MAX_BET = parseInt(process.env.MAX_BET_SATS || "500");
const MIN_BET = parseInt(process.env.MIN_BET_SATS || "1");

/**
 * Buy 10 free spins for 100x the bet amount
 * This creates a spin with 4 lollipops that triggers free spins
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

    const walletMode = user.wallet_mode;

    // Rate limiting with different limits for demo vs real play
    const ip = req.headers.get("x-forwarded-for") ||
                req.headers.get("x-real-ip") ||
                "unknown";

    if (isRateLimitedByMode(ip, walletMode, user.account_id, {
      demoMaxRequests: 10,     // Very restrictive for demo
      demoWindowMs: 60 * 1000,
      realMaxRequests: 10000,  // Anti-DDoS only
      realWindowMs: 60 * 1000,
    })) {
      return NextResponse.json(
        { error: `Too many requests. Please wait a moment before trying again. (${walletMode} mode)` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { betAmount } = body;

    // Comprehensive bet validation
    if (typeof betAmount !== "number" ||
        !Number.isFinite(betAmount) ||
        !Number.isInteger(betAmount) ||
        betAmount < MIN_BET ||
        betAmount > MAX_BET) {
      return NextResponse.json(
        { error: `Bet must be a positive integer between ${MIN_BET} and ${MAX_BET} sats` },
        { status: 400 }
      );
    }

    // Cost is 100x the bet amount
    const cost = betAmount * 100;

    // Check user balance
    const userBalance = getUserBalance(user.id, walletMode);
    if (userBalance < cost) {
      return NextResponse.json(
        { error: `Insufficient balance. You have ${userBalance} sats, need ${cost} sats to buy free spins` },
        { status: 400 }
      );
    }

    // Deduct cost from user's balance
    const balanceAfterCost = subtractFromBalance(user.id, cost, "bet", walletMode, `Bonanza free spins purchase`);
    if (balanceAfterCost === null) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    console.log(`[Bonanza ${walletMode.toUpperCase()}] User ${user.id} bought free spins for ${cost} sats (bet: ${betAmount})`);

    // Play the spin with forced lollipops (buyingFreeSpins = true)
    const spinResult = playSpin(betAmount, false, true);

    // Free spins should be triggered (we forced 4 lollipops)
    if (spinResult.triggeredFreeSpins) {
      const freeSpinsAwarded = spinResult.freeSpinsAwarded;

      // SECURITY: Store the bet amount to lock it for free spins
      updateGameState(user.id, 'bonanza', walletMode, {
        freeSpinsRemaining: freeSpinsAwarded,
        currentMultiplier: betAmount, // Store bet amount for security
        freeSpinsTotalWin: 0
      });

      console.log(`[Bonanza ${walletMode.toUpperCase()}] User ${user.id} triggered ${freeSpinsAwarded} free spins from purchase with locked bet: ${betAmount} sats`);
    }

    // If there was a win on the purchase spin, add it to balance
    let newBalance = getUserBalance(user.id, walletMode);

    if (spinResult.totalWin > 0) {
      newBalance = addToBalance(user.id, spinResult.totalWin, "win", walletMode, `Bonanza free spins purchase win`);
      console.log(`[Bonanza ${walletMode.toUpperCase()}] User ${user.id} won ${spinResult.totalWin} sats on free spins purchase spin`);
    }

    // Return result with updated balance
    return NextResponse.json({
      ...spinResult,
      newBalance,
      freeSpinsRemaining: spinResult.freeSpinsAwarded,
      freeSpinsTotalWin: 0,
      message: `Free spins purchased! You got ${spinResult.freeSpinsAwarded} free spins!`,
    });

  } catch (error) {
    console.error("Error buying free spins:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
