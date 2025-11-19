import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { getUserBalance, subtractFromBalance, addToBalance, type WalletMode } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import {
  createShoe,
  shuffleDeck,
  dealCard,
  calculateHandValue,
  isBlackjack,
  isBust,
  playDealerHand,
  calculatePayout,
  Card,
  Hand,
} from "@/lib/blackjack";

// Type for game state stored in database
interface GameState {
  deck: Card[];
  playerHands: Hand[];
  dealerHand: Card[];
  currentHandIndex: number;
  initialBet: number;
}

// Helper functions for database game state management
function saveGameState(userId: number, gameState: GameState, walletMode: WalletMode) {
  const db = getDatabase(walletMode);
  const now = Date.now();

  db.prepare(`
    INSERT OR REPLACE INTO blackjack_solo_games
    (user_id, deck, player_hands, dealer_hand, current_hand_index, initial_bet, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    JSON.stringify(gameState.deck),
    JSON.stringify(gameState.playerHands),
    JSON.stringify(gameState.dealerHand),
    gameState.currentHandIndex,
    gameState.initialBet,
    now,
    now
  );
}

function getGameState(userId: number, walletMode: WalletMode): GameState | null {
  const db = getDatabase(walletMode);

  const row = db.prepare(`
    SELECT deck, player_hands, dealer_hand, current_hand_index, initial_bet
    FROM blackjack_solo_games
    WHERE user_id = ?
  `).get(userId) as any;

  if (!row) return null;

  return {
    deck: JSON.parse(row.deck),
    playerHands: JSON.parse(row.player_hands),
    dealerHand: JSON.parse(row.dealer_hand),
    currentHandIndex: row.current_hand_index,
    initialBet: row.initial_bet,
  };
}

function deleteGameState(userId: number, walletMode: WalletMode) {
  const db = getDatabase(walletMode);

  db.prepare(`
    DELETE FROM blackjack_solo_games WHERE user_id = ?
  `).run(userId);
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authResult.user.id;
    const walletMode = authResult.user.wallet_mode as WalletMode;
    const body = await req.json();
    const { action, betAmount } = body;

    // START NEW GAME
    if (action === "start") {
      if (!betAmount || betAmount < 1 || betAmount > 5000) {
        return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
      }

      const balance = getUserBalance(userId, walletMode);
      if (balance < betAmount) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }

      // Deduct bet
      subtractFromBalance(userId, betAmount, "bet", walletMode, JSON.stringify({ game: "blackjack_solo" }));

      // Create and shuffle deck
      let deck = shuffleDeck(createShoe(6));

      // Deal initial cards (2 to each, but frontend only shows 1 player card initially)
      const playerCard1 = dealCard(deck);
      deck = playerCard1.remainingDeck;
      const dealerCard1 = dealCard(deck);
      deck = dealerCard1.remainingDeck;
      const playerCard2 = dealCard(deck);
      deck = playerCard2.remainingDeck;
      const dealerCard2 = dealCard(deck);
      deck = dealerCard2.remainingDeck;

      const playerHand: Hand = {
        cards: [playerCard1.card, playerCard2.card],
        bet: betAmount,
        status: "active",
      };

      const dealerHand = [dealerCard1.card, dealerCard2.card];

      // Store game state in database (blackjack check moved to end for better UX)
      const gameState: GameState = {
        deck,
        playerHands: [playerHand],
        dealerHand,
        currentHandIndex: 0,
        initialBet: betAmount,
      };
      saveGameState(userId, gameState, walletMode);

      return NextResponse.json({
        success: true,
        action: "playing",
        playerHands: [playerHand],
        dealerHand: [dealerHand[0]], // Only show first card
        currentHandIndex: 0,
        balance: getUserBalance(userId, walletMode),
      });
    }

    // PLAYER ACTIONS (hit, stand, double, split, surrender)
    const game = getGameState(userId, walletMode);
    if (!game) {
      return NextResponse.json({ error: "No active game" }, { status: 400 });
    }

    const currentHand = game.playerHands[game.currentHandIndex];

    if (action === "hit") {
      const result = dealCard(game.deck);
      currentHand.cards.push(result.card);
      game.deck = result.remainingDeck;

      const handValue = calculateHandValue(currentHand.cards).value;
      if (isBust(currentHand.cards)) {
        currentHand.status = "bust";
        // Move to next hand or finish
        if (game.currentHandIndex < game.playerHands.length - 1) {
          game.currentHandIndex++;
        } else {
          return finishGame(userId, game, walletMode);
        }
      } else if (handValue === 21) {
        currentHand.status = "stand";
        if (game.currentHandIndex < game.playerHands.length - 1) {
          game.currentHandIndex++;
        } else {
          return finishGame(userId, game, walletMode);
        }
      }

      // Save updated game state to database
      saveGameState(userId, game, walletMode);

      return NextResponse.json({
        success: true,
        action: "playing",
        playerHands: game.playerHands,
        dealerHand: [game.dealerHand[0]],
        currentHandIndex: game.currentHandIndex,
        balance: getUserBalance(userId, walletMode),
      });
    }

    if (action === "stand") {
      currentHand.status = "stand";
      if (game.currentHandIndex < game.playerHands.length - 1) {
        game.currentHandIndex++;

        // Save updated game state to database
        saveGameState(userId, game, walletMode);

        return NextResponse.json({
          success: true,
          action: "playing",
          playerHands: game.playerHands,
          dealerHand: [game.dealerHand[0]],
          currentHandIndex: game.currentHandIndex,
          balance: getUserBalance(userId, walletMode),
        });
      } else {
        return finishGame(userId, game, walletMode);
      }
    }

    if (action === "double") {
      if (currentHand.cards.length !== 2) {
        return NextResponse.json({ error: "Can only double on first two cards" }, { status: 400 });
      }

      const balance = getUserBalance(userId, walletMode);
      if (balance < currentHand.bet) {
        return NextResponse.json({ error: "Insufficient balance to double" }, { status: 400 });
      }

      // Deduct additional bet
      subtractFromBalance(userId, currentHand.bet, "bet", walletMode, JSON.stringify({ game: "blackjack_solo", action: "double" }));
      currentHand.bet *= 2;
      currentHand.doubled = true;

      // Deal one card and stand
      const result = dealCard(game.deck);
      currentHand.cards.push(result.card);
      game.deck = result.remainingDeck;

      if (isBust(currentHand.cards)) {
        currentHand.status = "bust";
      } else {
        currentHand.status = "stand";
      }

      if (game.currentHandIndex < game.playerHands.length - 1) {
        game.currentHandIndex++;

        // Save updated game state to database
        saveGameState(userId, game, walletMode);

        return NextResponse.json({
          success: true,
          action: "playing",
          playerHands: game.playerHands,
          dealerHand: [game.dealerHand[0]],
          currentHandIndex: game.currentHandIndex,
          balance: getUserBalance(userId, walletMode),
        });
      } else {
        return finishGame(userId, game, walletMode);
      }
    }

    if (action === "split") {
      if (currentHand.cards.length !== 2 || currentHand.cards[0].rank !== currentHand.cards[1].rank) {
        return NextResponse.json({ error: "Can only split matching pairs" }, { status: 400 });
      }

      const balance = getUserBalance(userId, walletMode);
      if (balance < currentHand.bet) {
        return NextResponse.json({ error: "Insufficient balance to split" }, { status: 400 });
      }

      // Deduct bet for second hand
      subtractFromBalance(userId, currentHand.bet, "bet", walletMode, JSON.stringify({ game: "blackjack_solo", action: "split" }));

      // Deal two new cards
      const card1Result = dealCard(game.deck);
      const card2Result = dealCard(card1Result.remainingDeck);
      game.deck = card2Result.remainingDeck;

      const hand1: Hand = {
        cards: [currentHand.cards[0], card1Result.card],
        bet: currentHand.bet,
        status: "active",
      };

      const hand2: Hand = {
        cards: [currentHand.cards[1], card2Result.card],
        bet: currentHand.bet,
        status: "active",
      };

      game.playerHands[game.currentHandIndex] = hand1;
      game.playerHands.splice(game.currentHandIndex + 1, 0, hand2);

      // Save updated game state to database
      saveGameState(userId, game, walletMode);

      return NextResponse.json({
        success: true,
        action: "playing",
        playerHands: game.playerHands,
        dealerHand: [game.dealerHand[0]],
        currentHandIndex: game.currentHandIndex,
        balance: getUserBalance(userId, walletMode),
      });
    }

    if (action === "surrender") {
      if (currentHand.cards.length !== 2 || game.currentHandIndex !== 0) {
        return NextResponse.json({ error: "Can only surrender on first hand with two cards" }, { status: 400 });
      }

      currentHand.status = "surrender";
      const payout = currentHand.bet * 0.5;
      addToBalance(userId, payout, "refund", walletMode, JSON.stringify({ game: "blackjack_solo" }));

      // Delete game state from database
      deleteGameState(userId, walletMode);

      return NextResponse.json({
        success: true,
        action: "complete",
        playerHands: game.playerHands,
        dealerHand: game.dealerHand,
        payout,
        message: "Surrendered - Half bet returned",
        balance: getUserBalance(userId, walletMode),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Blackjack Solo Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function finishGame(userId: number, game: any, walletMode: WalletMode) {
  // Play dealer hand
  const dealerResult = playDealerHand(game.dealerHand, game.deck);
  const finalDealerHand = dealerResult.finalHand;

  // Calculate total bet from all hands (accounts for double/split)
  const totalBet = game.playerHands.reduce((sum: number, hand: Hand) => sum + hand.bet, 0);

  // Calculate payouts
  let totalPayout = 0;
  for (const hand of game.playerHands) {
    const payout = calculatePayout(hand, finalDealerHand);
    totalPayout += payout;
  }

  if (totalPayout > 0) {
    addToBalance(userId, totalPayout, "win", walletMode, JSON.stringify({ game: "blackjack_solo" }));
  }

  // Clear game from database
  deleteGameState(userId, walletMode);

  const dealerValue = calculateHandValue(finalDealerHand).value;
  const dealerBust = isBust(finalDealerHand);

  let message = "";
  if (totalPayout > totalBet) {
    message = `You win ${totalPayout - totalBet} sat!`;
  } else if (totalPayout === totalBet) {
    message = "Push!";
  } else {
    message = "You lose!";
  }

  return NextResponse.json({
    success: true,
    action: "complete",
    playerHands: game.playerHands,
    dealerHand: finalDealerHand,
    dealerValue,
    dealerBust,
    payout: totalPayout,
    message,
    balance: getUserBalance(userId, walletMode),
  });
}
