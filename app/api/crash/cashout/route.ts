import { NextRequest, NextResponse } from "next/server";
import { processCashout, getGameStatus } from "@/lib/crash";
import { isRateLimitedByMode } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { addToBalance } from "@/lib/auth";
import { getCrashGame, deleteCrashGame, updateCrashGame, addCrashHistory } from "@/lib/crash-db";

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

    // Get active game
    const gameState = getCrashGame(user.id, walletMode);
    if (!gameState) {
      return NextResponse.json({
        error: "No active game found."
      }, { status: 400 });
    }

    // Check if already cashed out
    if (gameState.cashedOut) {
      return NextResponse.json({
        error: "You have already cashed out."
      }, { status: 400 });
    }

    // Check current game status
    const status = getGameStatus(gameState);

    // Can't cash out during betting phase
    if (status.phase === 'betting') {
      return NextResponse.json({
        error: "Game hasn't started yet. Wait for the betting phase to end."
      }, { status: 400 });
    }

    // Can't cash out if already crashed
    if (status.crashed) {
      // Update game state and add to history
      gameState.gameActive = false;
      updateCrashGame(user.id, gameState, walletMode);
      addCrashHistory(gameState.crashPoint, gameState.hashedServerSeed, walletMode);
      deleteCrashGame(user.id, walletMode);

      return NextResponse.json({
        error: `Game crashed at ${gameState.crashPoint.toFixed(2)}x! Better luck next time.`,
        crashed: true,
        crashPoint: gameState.crashPoint,
        serverSeed: gameState.serverSeed,
        clientSeed: gameState.clientSeed,
      }, { status: 400 });
    }

    // Process cashout
    const result = processCashout(gameState);

    // Mark as cashed out but keep game active so it continues until crash
    gameState.cashedOut = true;
    gameState.cashoutMultiplier = result.finalMultiplier;
    // gameState.gameActive remains true - game continues running
    updateCrashGame(user.id, gameState, walletMode);

    // Add winnings to balance
    const winAmount = Math.floor(result.winAmount);
    const newBalance = addToBalance(
      user.id,
      winAmount,
      "win",
      walletMode,
      `Crash cashout (${result.finalMultiplier.toFixed(2)}x)`
    );

    // Don't add to history yet - wait for crash
    // Don't delete game yet - let it continue running until crash

    console.log(`[Crash ${walletMode.toUpperCase()}] User ${user.id} cashed out ${winAmount} sats (bet: ${gameState.betAmount}, multiplier: ${result.finalMultiplier.toFixed(2)}x, crash point: ${gameState.crashPoint.toFixed(2)}x)`);

    // Return result with server seed for verification
    return NextResponse.json({
      success: true,
      winAmount,
      newBalance,
      cashoutMultiplier: result.finalMultiplier,
      crashPoint: gameState.crashPoint,
      serverSeed: gameState.serverSeed,
      clientSeed: gameState.clientSeed,
      hashedServerSeed: gameState.hashedServerSeed,
    });
  } catch (error) {
    console.error("[CRASH_CASHOUT_ERROR]", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
