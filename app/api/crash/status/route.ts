import { NextRequest, NextResponse } from "next/server";
import { getGameStatus, shouldAutoCashout, processCashout } from "@/lib/crash";
import { getCurrentUser } from "@/lib/auth-middleware";
import { addToBalance } from "@/lib/auth";
import { getCrashGame, deleteCrashGame, updateCrashGame, addCrashHistory } from "@/lib/crash-db";

export async function GET(request: NextRequest) {
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

    // Get active game
    const gameState = getCrashGame(user.id, walletMode);
    if (!gameState) {
      return NextResponse.json({
        hasActiveGame: false,
      });
    }

    // Get current game status
    const status = getGameStatus(gameState);

    // Check for auto cashout
    if (shouldAutoCashout(gameState)) {
      // Process auto cashout
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
        `Crash auto cashout (${result.finalMultiplier.toFixed(2)}x)`
      );

      // Don't add to history yet - wait for crash
      // Don't delete game yet - let it continue running until crash

      console.log(`[Crash ${walletMode.toUpperCase()}] User ${user.id} auto cashed out ${winAmount} sats (bet: ${gameState.betAmount}, multiplier: ${result.finalMultiplier.toFixed(2)}x, crash point: ${gameState.crashPoint.toFixed(2)}x)`);

      return NextResponse.json({
        hasActiveGame: true,
        autoCashedOut: true,
        winAmount,
        newBalance,
        cashoutMultiplier: result.finalMultiplier,
        crashPoint: gameState.crashPoint,
        serverSeed: gameState.serverSeed,
        clientSeed: gameState.clientSeed,
        hashedServerSeed: gameState.hashedServerSeed,
      });
    }

    // If crashed, update game and add to history
    if (status.crashed && gameState.gameActive) {
      gameState.gameActive = false;
      updateCrashGame(user.id, gameState, walletMode);
      addCrashHistory(gameState.crashPoint, gameState.hashedServerSeed, walletMode);
      deleteCrashGame(user.id, walletMode);

      console.log(`[Crash ${walletMode.toUpperCase()}] User ${user.id} crashed at ${gameState.crashPoint.toFixed(2)}x (bet: ${gameState.betAmount} sats)`);
    }

    // Return current status
    return NextResponse.json({
      hasActiveGame: true,
      gameId: gameState.gameId,
      phase: status.phase,
      currentMultiplier: status.currentMultiplier,
      crashed: status.crashed,
      canCashout: status.canCashout,
      cashedOut: gameState.cashedOut,
      cashoutMultiplier: gameState.cashoutMultiplier,
      betAmount: gameState.betAmount,
      autoCashout: gameState.autoCashout,
      gameStartTime: gameState.gameStartTime,
      bettingPhaseEnd: gameState.bettingPhaseEnd,
      // Only reveal crash point and server seed after game ends
      ...(status.crashed && {
        crashPoint: gameState.crashPoint,
        serverSeed: gameState.serverSeed,
        clientSeed: gameState.clientSeed,
      }),
    });
  } catch (error) {
    console.error("[CRASH_STATUS_ERROR]", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
