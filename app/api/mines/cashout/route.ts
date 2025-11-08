import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { addToBalance, getUserBalance } from "@/lib/auth";
import { getMinesGame, deleteMinesGame } from "@/lib/mines-db";

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

    // Rate limiting: 200 requests per minute per IP (~3 per second average)
    const ip = request.headers.get("x-forwarded-for") ||
                request.headers.get("x-real-ip") ||
                "unknown";

    if (isRateLimited(ip, 200, 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Get active game
    const gameData = getMinesGame(user.id, walletMode);
    if (!gameData) {
      return NextResponse.json({
        error: "No active game found."
      }, { status: 400 });
    }

    const { gameState, betAmount } = gameData;

    // Check if any tiles have been revealed
    if (gameState.revealedTiles.length === 0) {
      return NextResponse.json({
        error: "You must reveal at least one tile before cashing out."
      }, { status: 400 });
    }

    // Calculate winnings
    const winAmount = Math.floor(betAmount * gameState.currentMultiplier);

    // Add winnings to balance
    const newBalance = addToBalance(user.id, winAmount, "win", walletMode, `Mines cashout (${gameState.revealedTiles.length} tiles, ${gameState.currentMultiplier.toFixed(2)}x)`);

    // Delete game from database
    deleteMinesGame(user.id, walletMode);

    console.log(`[Mines ${walletMode.toUpperCase()}] User ${user.id} cashed out ${winAmount} sats (bet: ${betAmount}, multiplier: ${gameState.currentMultiplier.toFixed(2)}x, tiles: ${gameState.revealedTiles.length})`);

    // Return mine positions for display (game is over)
    return NextResponse.json({
      success: true,
      winAmount,
      newBalance,
      multiplier: gameState.currentMultiplier,
      tilesRevealed: gameState.revealedTiles.length,
      minePositions: gameState.minePositions,
    });
  } catch (error) {
    console.error("[MINES_CASHOUT_ERROR]", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
