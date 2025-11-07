import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { getUserBalance, subtractFromBalance } from "@/lib/auth";
import {
  getTable,
  getSeatByUserId,
  updateSeat,
  allPlayersReady,
  dealInitialHands,
  getTableSeats,
  startBettingPhase,
} from "@/lib/blackjack-manager";

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;
    const walletMode = authResult.user.wallet_mode;
    const body = await req.json();
    const { tableId, betAmount } = body;

    // Validate bet amount
    if (!betAmount || betAmount < 1 || betAmount > 1000) {
      return NextResponse.json(
        { error: "Invalid bet amount" },
        { status: 400 }
      );
    }

    // Get table
    const table = getTable(tableId);
    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // Check if table is in betting phase
    if (table.phase === 'waiting') {
      // Auto-start betting phase
      startBettingPhase(tableId);
    } else if (table.phase !== 'betting') {
      return NextResponse.json(
        { error: "Not in betting phase" },
        { status: 400 }
      );
    }

    // Get user seat
    const seat = getSeatByUserId(tableId, userId);
    if (!seat) {
      return NextResponse.json(
        { error: "Not at this table" },
        { status: 404 }
      );
    }

    // Check if already bet
    if (seat.status !== 'betting') {
      return NextResponse.json(
        { error: "Already placed bet" },
        { status: 400 }
      );
    }

    // Check user balance
    const balance = getUserBalance(userId, walletMode);
    if (balance < betAmount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Deduct bet from balance
    subtractFromBalance(userId, betAmount, "bet", walletMode, JSON.stringify({
      game: "blackjack",
      table_id: tableId,
      seat: seat.seatNumber,
    }));

    // Update seat
    seat.totalBet = betAmount;
    seat.status = 'playing';
    updateSeat(seat);

    const newBalance = getUserBalance(userId, walletMode);

    // Check if all players ready
    if (allPlayersReady(tableId)) {
      // Deal initial cards
      dealInitialHands(tableId);
    }

    // Get updated table state
    const updatedTable = getTable(tableId);
    const allSeats = getTableSeats(tableId);

    return NextResponse.json({
      success: true,
      balance: newBalance,
      table: {
        id: updatedTable!.id,
        phase: updatedTable!.phase,
        dealerHand: updatedTable!.phase === 'betting'
          ? []
          : [updatedTable!.dealerHand[0]], // Only show first card
        currentSeat: updatedTable!.currentSeat,
      },
      seat: {
        seatNumber: seat.seatNumber,
        hands: seat.hands,
        totalBet: seat.totalBet,
        status: seat.status,
      },
      players: allSeats.map(s => ({
        seatNumber: s.seatNumber,
        userId: s.userId,
        hands: s.hands,
        totalBet: s.totalBet,
        status: s.status,
      })),
    });
  } catch (error) {
    console.error("[Blackjack Bet Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
