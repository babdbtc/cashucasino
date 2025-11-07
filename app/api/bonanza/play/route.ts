import { NextRequest, NextResponse } from "next/server";
import { playSpin } from "@/lib/sweet-bonanza";
import { isRateLimited } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { subtractFromBalance, addToBalance, getUserBalance, getGameState, updateGameState } from "@/lib/auth";

const MAX_BET = parseInt(process.env.MAX_BET_SATS || "1000");
const MIN_BET = parseInt(process.env.MIN_BET_SATS || "1");

/**
 * Play Sweet Bonanza with server-side authenticated balance
 *
 * Balance is managed server-side and verified on each spin
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

    // Rate limiting based on IP - more generous since no mint calls
    const ip = req.headers.get("x-forwarded-for") ||
                req.headers.get("x-real-ip") ||
                "unknown";

    // Allow 120 requests per minute per IP (accommodates turbo mode and autoplay)
    if (isRateLimited(ip, 120, 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before playing again." },
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

    // Get server-side game state (prevents client manipulation)
    const gameState = getGameState(user.id, 'bonanza', walletMode);
    const isFreeSpins = gameState.freeSpinsRemaining > 0;

    // SECURITY: During free spins, use the stored bet amount to prevent exploitation
    // Users cannot change bet amount during free spins
    let actualBetAmount = betAmount;
    if (isFreeSpins) {
      // Use the stored bet amount from when free spins were triggered
      actualBetAmount = gameState.currentMultiplier; // Repurposed to store bet amount

      if (actualBetAmount <= 0) {
        // Fallback in case of corrupt data
        console.error(`[Bonanza ${walletMode.toUpperCase()}] SECURITY: Invalid stored bet amount for user ${user.id}. Resetting free spins.`);
        updateGameState(user.id, 'bonanza', walletMode, {
          freeSpinsRemaining: 0,
          currentMultiplier: 0,
          freeSpinsTotalWin: 0
        });
        return NextResponse.json(
          { error: "Free spins session expired. Please start a new game." },
          { status: 400 }
        );
      }

      console.log(`[Bonanza ${walletMode.toUpperCase()}] SECURITY: User ${user.id} in free spins - using stored bet amount ${actualBetAmount} sats (requested: ${betAmount})`);
    } else {
      // Check user balance (only for regular spins)
      const userBalance = getUserBalance(user.id, walletMode);
      if (userBalance < betAmount) {
        return NextResponse.json(
          { error: `Insufficient balance. You have ${userBalance} sats, need ${betAmount} sats` },
          { status: 400 }
        );
      }

      // Deduct bet from user's balance
      const balanceAfterBet = subtractFromBalance(user.id, betAmount, "bet", walletMode, `Bonanza bet`);
      if (balanceAfterBet === null) {
        return NextResponse.json(
          { error: "Insufficient balance" },
          { status: 400 }
        );
      }
    }

    console.log(`[Bonanza ${walletMode.toUpperCase()}] User ${user.id} bet ${actualBetAmount} sats (free spins: ${isFreeSpins})`);

    // Play the spin with the actual bet amount (stored amount during free spins)
    const spinResult = playSpin(actualBetAmount, isFreeSpins, false);

    // Update game state based on spin result
    if (spinResult.triggeredFreeSpins) {
      if (!isFreeSpins) {
        // Base game: 4+ scatters triggered free spins (10 spins)
        // SECURITY: Store the bet amount to lock it for free spins
        updateGameState(user.id, 'bonanza', walletMode, {
          freeSpinsRemaining: spinResult.freeSpinsAwarded,
          currentMultiplier: actualBetAmount, // Store bet amount for security
          freeSpinsTotalWin: 0
        });

        console.log(`[Bonanza ${walletMode.toUpperCase()}] User ${user.id} triggered ${spinResult.freeSpinsAwarded} free spins with locked bet: ${actualBetAmount} sats`);
      } else {
        // Free spins: 3+ scatters retriggered (+5 spins)
        const newFreeSpinsRemaining = gameState.freeSpinsRemaining - 1 + spinResult.freeSpinsAwarded;
        const newTotalWin = gameState.freeSpinsTotalWin + spinResult.totalWin;

        updateGameState(user.id, 'bonanza', walletMode, {
          freeSpinsRemaining: newFreeSpinsRemaining,
          currentMultiplier: actualBetAmount, // Keep bet amount locked
          freeSpinsTotalWin: newTotalWin
        });

        console.log(`[Bonanza ${walletMode.toUpperCase()}] User ${user.id} retriggered +${spinResult.freeSpinsAwarded} free spins!`);
      }
    } else if (isFreeSpins) {
      // In free spins, update state
      const newFreeSpinsRemaining = gameState.freeSpinsRemaining - 1;
      const newTotalWin = gameState.freeSpinsTotalWin + spinResult.totalWin;

      if (newFreeSpinsRemaining > 0) {
        // Continue free spins
        updateGameState(user.id, 'bonanza', walletMode, {
          freeSpinsRemaining: newFreeSpinsRemaining,
          currentMultiplier: actualBetAmount, // Keep bet amount locked
          freeSpinsTotalWin: newTotalWin
        });
      } else {
        // Free spins ended, reset state and unlock bet amount
        updateGameState(user.id, 'bonanza', walletMode, {
          freeSpinsRemaining: 0,
          currentMultiplier: 0, // Clear stored bet amount
          freeSpinsTotalWin: 0
        });

        console.log(`[Bonanza ${walletMode.toUpperCase()}] User ${user.id} free spins ended. Total free spins win: ${newTotalWin} sats`);
      }
    }

    // If player won, add winnings to balance
    let newBalance = getUserBalance(user.id, walletMode);

    if (spinResult.totalWin > 0) {
      newBalance = addToBalance(user.id, spinResult.totalWin, "win", walletMode, `Bonanza win`);
      console.log(`[Bonanza ${walletMode.toUpperCase()}] User ${user.id} won ${spinResult.totalWin} sats`);
    } else {
      console.log(`[Bonanza ${walletMode.toUpperCase()}] User ${user.id} lost ${betAmount} sats`);
    }

    // Get updated game state for response
    const updatedGameState = getGameState(user.id, 'bonanza', walletMode);

    // Return result with updated balance and game state
    return NextResponse.json({
      ...spinResult,
      newBalance,
      freeSpinsRemaining: updatedGameState.freeSpinsRemaining,
      freeSpinsTotalWin: updatedGameState.freeSpinsTotalWin,
      message: spinResult.totalWin > 0
        ? `YOU WON ${spinResult.totalWin} SAT! 🎉`
        : "Better luck next time!",
    });

  } catch (error) {
    console.error("Error processing spin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
