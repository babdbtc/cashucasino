import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { getUserBalance, subtractFromBalance, addToBalance } from "@/lib/auth";
import {
  getTable,
  getSeatByUserId,
  updateSeat,
  updateTable,
  getTableSeats,
  advanceToNextPlayer,
  getCurrentPlayer,
} from "@/lib/blackjack-manager";
import {
  hit,
  doubleDown,
  split,
  surrender,
  takeInsurance,
  calculateHandValue,
  playDealerHand,
  calculatePayout,
  calculateInsurancePayout,
  isBust,
  dealerShowingAce,
} from "@/lib/blackjack";

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
    const { tableId, action, insuranceAmount } = body;

    // Get table
    const table = getTable(tableId);
    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // Check if table is in playing phase
    if (table.phase !== 'playing') {
      return NextResponse.json(
        { error: "Not in playing phase" },
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

    // Check if it's player's turn
    const currentPlayer = getCurrentPlayer(tableId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      return NextResponse.json(
        { error: "Not your turn" },
        { status: 400 }
      );
    }

    // Get current hand
    const currentHand = seat.hands[seat.currentHandIndex];
    if (!currentHand || currentHand.status !== 'active') {
      return NextResponse.json(
        { error: "No active hand" },
        { status: 400 }
      );
    }

    let newBalance = getUserBalance(userId, walletMode);

    // Execute action
    switch (action) {
      case 'hit': {
        const result = hit(currentHand, table.deck);
        seat.hands[seat.currentHandIndex] = result.updatedHand;
        table.deck = result.remainingDeck;

        // Check if hand is done (bust or 21)
        const handValue = calculateHandValue(result.updatedHand.cards).value;
        if (result.updatedHand.status === 'bust' || handValue === 21) {
          // Move to next hand or done
          if (seat.currentHandIndex < seat.hands.length - 1) {
            seat.currentHandIndex++;
          } else {
            seat.status = 'done';
          }
        }

        updateSeat(seat);
        updateTable(table);
        break;
      }

      case 'stand': {
        seat.hands[seat.currentHandIndex].status = 'stand';

        // Move to next hand or done
        if (seat.currentHandIndex < seat.hands.length - 1) {
          seat.currentHandIndex++;
        } else {
          seat.status = 'done';
        }

        updateSeat(seat);
        break;
      }

      case 'double': {
        const balance = getUserBalance(userId, walletMode);
        const result = doubleDown(currentHand, table.deck, balance);

        if (!result) {
          return NextResponse.json(
            { error: "Cannot double down" },
            { status: 400 }
          );
        }

        // Deduct additional bet
        subtractFromBalance(userId, currentHand.bet, "bet", walletMode, JSON.stringify({
          game: "blackjack",
          action: "double",
          table_id: tableId,
          seat: seat.seatNumber,
        }));

        seat.hands[seat.currentHandIndex] = result.updatedHand;
        seat.totalBet += currentHand.bet;
        table.deck = result.remainingDeck;
        newBalance = result.newBalance;

        // Auto-done after double
        if (seat.currentHandIndex < seat.hands.length - 1) {
          seat.currentHandIndex++;
        } else {
          seat.status = 'done';
        }

        updateSeat(seat);
        updateTable(table);
        break;
      }

      case 'split': {
        const balance = getUserBalance(userId, walletMode);
        const result = split(currentHand, table.deck, balance);

        if (!result) {
          return NextResponse.json(
            { error: "Cannot split" },
            { status: 400 }
          );
        }

        // Deduct bet for second hand
        subtractFromBalance(userId, currentHand.bet, "bet", walletMode, JSON.stringify({
          game: "blackjack",
          action: "split",
          table_id: tableId,
          seat: seat.seatNumber,
        }));

        // Replace current hand with two new hands
        seat.hands[seat.currentHandIndex] = result.hand1;
        seat.hands.splice(seat.currentHandIndex + 1, 0, result.hand2);
        seat.totalBet += currentHand.bet;
        table.deck = result.remainingDeck;
        newBalance = result.newBalance;

        updateSeat(seat);
        updateTable(table);
        break;
      }

      case 'surrender': {
        seat.hands[seat.currentHandIndex] = surrender(currentHand);

        // Move to next hand or done
        if (seat.currentHandIndex < seat.hands.length - 1) {
          seat.currentHandIndex++;
        } else {
          seat.status = 'done';
        }

        updateSeat(seat);
        break;
      }

      case 'insurance': {
        // Check if dealer showing Ace
        if (!dealerShowingAce(table.dealerHand[0])) {
          return NextResponse.json(
            { error: "Dealer not showing Ace" },
            { status: 400 }
          );
        }

        const balance = getUserBalance(userId, walletMode);
        const result = takeInsurance(currentHand, insuranceAmount, balance);

        if (!result) {
          return NextResponse.json(
            { error: "Cannot take insurance" },
            { status: 400 }
          );
        }

        // Deduct insurance bet
        subtractFromBalance(userId, insuranceAmount, "bet", walletMode, JSON.stringify({
          game: "blackjack",
          action: "insurance",
          table_id: tableId,
          seat: seat.seatNumber,
        }));

        seat.hands[seat.currentHandIndex] = result.updatedHand;
        newBalance = result.newBalance;

        updateSeat(seat);
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Check if need to advance to next player or dealer
    const nextPhase = advanceToNextPlayer(tableId);

    let dealerFinalHand = table.dealerHand;
    let payouts: any[] = [];

    if (nextPhase === 'dealer') {
      // Play dealer hand
      const dealerResult = playDealerHand(table.dealerHand, table.deck);
      dealerFinalHand = dealerResult.finalHand;
      table.dealerHand = dealerFinalHand;
      table.deck = dealerResult.remainingDeck;
      table.phase = 'payout';
      updateTable(table);

      // Calculate payouts for all players
      const allSeats = getTableSeats(tableId);
      payouts = [];

      for (const playerSeat of allSeats) {
        let totalPayout = 0;

        for (const hand of playerSeat.hands) {
          const payout = calculatePayout(hand, dealerFinalHand);
          totalPayout += payout;

          // Handle insurance
          if (hand.insurance) {
            totalPayout += calculateInsurancePayout(hand.insurance, dealerFinalHand);
          }
        }

        if (totalPayout > 0) {
          addToBalance(playerSeat.userId, totalPayout, "win", walletMode, JSON.stringify({
            game: "blackjack",
            table_id: tableId,
            seat: playerSeat.seatNumber,
          }));
        }

        payouts.push({
          seatNumber: playerSeat.seatNumber,
          userId: playerSeat.userId,
          payout: totalPayout,
        });

        // Reset seat for next round - set to betting immediately
        playerSeat.hands = [];
        playerSeat.currentHandIndex = 0;
        playerSeat.totalBet = 0;
        playerSeat.status = 'betting'; // Set to betting for next round
        updateSeat(playerSeat);
      }

      // Reset table to betting phase immediately
      table.phase = 'betting';
      table.dealerHand = [];
      table.currentSeat = 0;
      updateTable(table);
    }

    // Get final balance
    newBalance = getUserBalance(userId, walletMode);

    // Get updated state - re-fetch seat to get updated status
    const updatedTable = getTable(tableId);
    const updatedSeat = getSeatByUserId(tableId, userId);
    const allSeats = getTableSeats(tableId);

    return NextResponse.json({
      success: true,
      balance: newBalance,
      table: {
        id: updatedTable!.id,
        phase: updatedTable!.phase,
        dealerHand: updatedTable!.phase === 'payout'
          ? dealerFinalHand // Show full hand
          : [updatedTable!.dealerHand[0]], // Only show first card
        currentSeat: updatedTable!.currentSeat,
      },
      seat: updatedSeat ? {
        seatNumber: updatedSeat.seatNumber,
        hands: updatedSeat.hands,
        currentHandIndex: updatedSeat.currentHandIndex,
        totalBet: updatedSeat.totalBet,
        status: updatedSeat.status,
      } : null,
      players: allSeats.map(s => ({
        seatNumber: s.seatNumber,
        userId: s.userId,
        hands: s.hands,
        totalBet: s.totalBet,
        status: s.status,
      })),
      payouts: nextPhase === 'dealer' ? payouts : undefined,
      dealerFinalValue: nextPhase === 'dealer'
        ? calculateHandValue(dealerFinalHand).value
        : undefined,
    });
  } catch (error) {
    console.error("[Blackjack Action Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
