import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { findOrCreateTable, joinTable, getTableSeats, getTable } from "@/lib/blackjack-manager";

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

    // Find or create table
    const table = findOrCreateTable();

    // Join the table
    const seat = joinTable(table.id, userId);

    if (!seat) {
      return NextResponse.json(
        { error: "Table is full" },
        { status: 400 }
      );
    }

    // Get updated table state (phase may have changed)
    const updatedTable = getTable(table.id);
    if (!updatedTable) {
      return NextResponse.json(
        { error: "Table state error" },
        { status: 500 }
      );
    }

    // Get all seats for context
    const allSeats = getTableSeats(table.id);

    return NextResponse.json({
      success: true,
      table: {
        id: updatedTable.id,
        phase: updatedTable.phase,
        minBet: updatedTable.minBet,
        maxBet: updatedTable.maxBet,
        dealerHand: updatedTable.phase === 'betting' || updatedTable.phase === 'waiting'
          ? []
          : [updatedTable.dealerHand[0]], // Only show first card during play
        currentSeat: updatedTable.currentSeat,
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
    console.error("[Blackjack Join Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
