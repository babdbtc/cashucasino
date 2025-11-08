import { NextRequest, NextResponse } from "next/server";
import { createMinesGame, MINES_PRESETS, MinesDifficulty } from "@/lib/mines";
import { isRateLimited } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { subtractFromBalance, getUserBalance } from "@/lib/auth";
import { saveMinesGame, getMinesGame, deleteMinesGame } from "@/lib/mines-db";

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

    const body = await request.json();
    const { betAmount, minesCount, difficulty } = body;

    // Validate bet amount
    if (typeof betAmount !== "number" ||
        !Number.isFinite(betAmount) ||
        !Number.isInteger(betAmount) ||
        betAmount < MIN_BET ||
        betAmount > MAX_BET) {
      return NextResponse.json({
        error: `Bet must be an integer between ${MIN_BET} and ${MAX_BET} sats`
      }, { status: 400 });
    }

    // Determine mines count from difficulty or custom value
    let finalMinesCount: number;
    if (difficulty && typeof difficulty === "string" && difficulty in MINES_PRESETS) {
      finalMinesCount = MINES_PRESETS[difficulty as MinesDifficulty];
    } else if (typeof minesCount === "number") {
      finalMinesCount = minesCount;
    } else {
      return NextResponse.json({
        error: "Must provide either difficulty or minesCount"
      }, { status: 400 });
    }

    // Validate mines count
    if (finalMinesCount < 1 || finalMinesCount > 24) {
      return NextResponse.json({
        error: "Mines count must be between 1 and 24"
      }, { status: 400 });
    }

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Check if user already has an active game
    const existingGame = getMinesGame(user.id, walletMode);
    if (existingGame) {
      return NextResponse.json({
        error: "You already have an active Mines game. Please finish or cash out first."
      }, { status: 400 });
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
    const balanceAfterBet = subtractFromBalance(user.id, betAmount, "bet", walletMode, `Mines bet (${finalMinesCount} mines)`);
    if (balanceAfterBet === null) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    console.log(`[Mines ${walletMode.toUpperCase()}] User ${user.id} started game with ${finalMinesCount} mines, bet ${betAmount} sats`);

    // Create new game
    const gameState = createMinesGame(finalMinesCount);

    // Save game to database (without revealing mine positions to client)
    saveMinesGame(user.id, gameState, betAmount, walletMode);

    // Return game info (without mine positions!)
    return NextResponse.json({
      gameId: gameState.gameId,
      minesCount: gameState.minesCount,
      currentMultiplier: gameState.currentMultiplier,
      revealedTiles: gameState.revealedTiles,
      betAmount,
      newBalance: balanceAfterBet,
    });
  } catch (error) {
    console.error("[MINES_START_ERROR]", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
