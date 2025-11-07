import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { getTable, getSeatByUserId, getTableSeats } from "@/lib/blackjack-manager";

export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get('tableId');

    if (!tableId) {
      return NextResponse.json(
        { error: "Table ID required" },
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

    // Get user seat
    const seat = getSeatByUserId(tableId, userId);
    if (!seat) {
      return NextResponse.json(
        { error: "Not at this table" },
        { status: 404 }
      );
    }

    // Get all seats
    const allSeats = getTableSeats(tableId);

    return NextResponse.json({
      success: true,
      table: {
        id: table.id,
        phase: table.phase,
        dealerHand: table.phase === 'betting' || table.phase === 'waiting'
          ? []
          : table.phase === 'payout'
          ? table.dealerHand // Show full hand after payout
          : [table.dealerHand[0]], // Only show first card during play
        currentSeat: table.currentSeat,
        minBet: table.minBet,
        maxBet: table.maxBet,
      },
      seat: {
        seatNumber: seat.seatNumber,
        hands: seat.hands,
        currentHandIndex: seat.currentHandIndex,
        totalBet: seat.totalBet,
        status: seat.status,
      },
      players: allSeats.map(s => ({
        seatNumber: s.seatNumber,
        userId: s.userId,
        hands: s.hands,
        currentHandIndex: s.currentHandIndex,
        totalBet: s.totalBet,
        status: s.status,
      })),
    });
  } catch (error) {
    console.error("[Blackjack State Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
