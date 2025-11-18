import { NextRequest, NextResponse } from "next/server";
import { createCrashGame, MIN_BET, MAX_BET, isValidBet, isValidAutoCashout, getGameStatus } from "@/lib/crash";
import { isRateLimitedByMode } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { subtractFromBalance, getUserBalance } from "@/lib/auth";
import { saveCrashGame, getCrashGame, addCrashHistory, deleteCrashGame } from "@/lib/crash-db";

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
        { error: `Too many requests. Please wait a moment. (${walletMode} mode)` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { betAmount, clientSeed, autoCashout } = body;

    // Validate bet amount
    if (!isValidBet(betAmount)) {
      return NextResponse.json({
        error: `Bet must be an integer between ${MIN_BET} and ${MAX_BET} sats`
      }, { status: 400 });
    }

    // Validate auto cashout if provided
    if (autoCashout !== undefined && autoCashout !== null && !isValidAutoCashout(autoCashout)) {
      return NextResponse.json({
        error: "Auto cashout must be between 1.01x and 1000x"
      }, { status: 400 });
    }

    // Check if user already has an active game
    const existingGame = getCrashGame(user.id, walletMode);
    if (existingGame) {
      const status = getGameStatus(existingGame);

      // If the game has crashed or they cashed out, clean it up and allow new game
      if (status.crashed || existingGame.cashedOut) {
        // Add to history if not already added
        if (status.crashed) {
          addCrashHistory(existingGame.crashPoint, existingGame.hashedServerSeed, walletMode);
        }
        deleteCrashGame(user.id, walletMode);
        console.log(`[Crash ${walletMode.toUpperCase()}] User ${user.id} cleaned up finished game before starting new one`);
      } else {
        // Game is still running and they haven't cashed out
        return NextResponse.json({
          error: "You already have an active Crash game. Please finish it first."
        }, { status: 400 });
      }
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
    const balanceAfterBet = subtractFromBalance(
      user.id,
      betAmount,
      "bet",
      walletMode,
      `Crash bet${autoCashout ? ` (auto @ ${autoCashout}x)` : ''}`
    );
    if (balanceAfterBet === null) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    console.log(`[Crash ${walletMode.toUpperCase()}] User ${user.id} started game, bet ${betAmount} sats${autoCashout ? `, auto cashout @ ${autoCashout}x` : ''}`);

    // Create new game
    const gameState = createCrashGame(betAmount, clientSeed, autoCashout);

    // Save game to database
    saveCrashGame(user.id, gameState, walletMode);

    // Return game info (reveal hashed server seed for provably fair, but not actual seed)
    return NextResponse.json({
      gameId: gameState.gameId,
      hashedServerSeed: gameState.hashedServerSeed,
      clientSeed: gameState.clientSeed,
      gameStartTime: gameState.gameStartTime,
      bettingPhaseEnd: gameState.bettingPhaseEnd,
      betAmount: gameState.betAmount,
      autoCashout: gameState.autoCashout,
      newBalance: balanceAfterBet,
    });
  } catch (error) {
    console.error("[CRASH_START_ERROR]", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
