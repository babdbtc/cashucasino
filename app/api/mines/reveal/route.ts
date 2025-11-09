import { NextRequest, NextResponse } from "next/server";
import { revealTile } from "@/lib/mines";
import { isRateLimitedByMode } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { getMinesGame, updateMinesGame, deleteMinesGame } from "@/lib/mines-db";

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
    // Demo: Restrictive to encourage real play
    // Real: Original generous limits for paying users
    const ip = request.headers.get("x-forwarded-for") ||
                request.headers.get("x-real-ip") ||
                "unknown";

    if (isRateLimitedByMode(ip, walletMode, user.account_id, {
      demoMaxRequests: 30,     // Very restrictive for demo
      demoWindowMs: 60 * 1000,
      realMaxRequests: 10000,  // Anti-DDoS only, fast clicking never hits this
      realWindowMs: 60 * 1000,
    })) {
      return NextResponse.json(
        { error: `Too many requests. Please slow down. (${walletMode} mode)` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { position } = body;

    // Validate position
    if (typeof position !== "number" || position < 0 || position > 24) {
      return NextResponse.json({
        error: "Invalid tile position (must be 0-24)"
      }, { status: 400 });
    }

    // Get active game
    const gameData = getMinesGame(user.id, walletMode);
    if (!gameData) {
      return NextResponse.json({
        error: "No active game found. Start a new game first."
      }, { status: 400 });
    }

    const { gameState, betAmount } = gameData;

    // Reveal tile
    const result = revealTile(gameState, position);

    // Update game state in database
    updateMinesGame(user.id, result.game, walletMode);

    console.log(`[Mines ${walletMode.toUpperCase()}] User ${user.id} revealed tile ${position}: ${result.hitMine ? 'MINE!' : 'safe'} (multiplier: ${result.newMultiplier.toFixed(2)}x)`);

    if (result.hitMine) {
      // Game over - delete game from database
      deleteMinesGame(user.id, walletMode);

      // Return all mine positions for display
      return NextResponse.json({
        hitMine: true,
        position,
        minePositions: gameState.minePositions,
        revealedTiles: result.game.revealedTiles,
        currentMultiplier: 0,
        winAmount: 0,
        gameOver: true,
      });
    } else {
      // Safe tile - continue game
      const potentialWin = Math.floor(betAmount * result.newMultiplier);

      return NextResponse.json({
        hitMine: false,
        position,
        revealedTiles: result.game.revealedTiles,
        currentMultiplier: result.newMultiplier,
        potentialWin,
        gameOver: false,
      });
    }
  } catch (error: any) {
    console.error("[MINES_REVEAL_ERROR]", error);
    return NextResponse.json({
      error: error.message || "An unexpected error occurred."
    }, { status: 500 });
  }
}
