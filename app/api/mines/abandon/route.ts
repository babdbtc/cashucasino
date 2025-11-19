import { NextRequest, NextResponse } from "next/server";
import { isRateLimitedByMode } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
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

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Rate limiting with different limits for demo vs real play
    const ip = request.headers.get("x-forwarded-for") ||
                request.headers.get("x-real-ip") ||
                "unknown";

    if (isRateLimitedByMode(ip, walletMode, user.account_id, {
      demoMaxRequests: 20,     // Very restrictive for demo
      demoWindowMs: 60 * 1000,
      realMaxRequests: 10000,  // Anti-DDoS only
      realWindowMs: 60 * 1000,
    })) {
      return NextResponse.json(
        { error: `Too many requests. Please wait a moment. (${walletMode} mode)` },
        { status: 429 }
      );
    }

    // Check if there's an active game
    const gameData = getMinesGame(user.id, walletMode);
    if (!gameData) {
      return NextResponse.json({
        error: "No active game found."
      }, { status: 400 });
    }

    const { betAmount, gameState } = gameData;

    // Delete the game (player forfeits their bet)
    deleteMinesGame(user.id, walletMode);

    console.log(`[Mines ${walletMode.toUpperCase()}] User ${user.id} abandoned game (forfeited ${betAmount} sats)`);

    return NextResponse.json({
      success: true,
      message: `Game abandoned. You forfeited ${betAmount} sats.`,
      betAmount,
    });
  } catch (error) {
    console.error("[MINES_ABANDON_ERROR]", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
