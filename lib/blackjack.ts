import crypto from 'crypto';

// Card suits and ranks
export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // Base value (A=11, J/Q/K=10)
}

export interface Hand {
  cards: Card[];
  bet: number;
  status: 'active' | 'stand' | 'bust' | 'blackjack' | 'surrender';
  doubled?: boolean;
  insurance?: number;
}

export interface PlayerState {
  userId: number;
  seatNumber: number;
  hands: Hand[]; // Multiple hands for splits
  currentHandIndex: number;
  balance: number;
}

export interface GameState {
  tableId: string;
  players: PlayerState[];
  dealerHand: Card[];
  deck: Card[];
  phase: 'betting' | 'dealing' | 'playing' | 'dealer' | 'payout' | 'waiting';
  currentPlayerIndex: number;
  minBet: number;
  maxBet: number;
}

// Create a shoe of multiple decks (default 6 decks = 312 cards)
export function createShoe(numDecks = 6): Card[] {
  const suits: Suit[] = ['♠', '♥', '♦', '♣'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const shoe: Card[] = [];

  for (let d = 0; d < numDecks; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        let value: number;
        if (rank === 'A') value = 11;
        else if (['J', 'Q', 'K'].includes(rank)) value = 10;
        else value = parseInt(rank);

        shoe.push({ suit, rank, value });
      }
    }
  }

  return shoe;
}

// Cryptographically secure shuffle
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate random index using crypto
    const randomBytes = crypto.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0);
    const j = randomValue % (i + 1);

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// Calculate hand value (handle Aces as 1 or 11)
export function calculateHandValue(cards: Card[]): { value: number; soft: boolean } {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else {
      value += card.value;
    }
  }

  // Convert Aces from 11 to 1 if busting
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  const soft = aces > 0; // Soft hand if any Ace counted as 11
  return { value, soft };
}

// Check if hand is blackjack (21 with 2 cards: Ace + 10-value card)
export function isBlackjack(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  const { value } = calculateHandValue(cards);
  return value === 21;
}

// Check if hand is bust
export function isBust(cards: Card[]): boolean {
  const { value } = calculateHandValue(cards);
  return value > 21;
}

// Check if hand can be split (two cards of same rank)
export function canSplit(hand: Hand): boolean {
  if (hand.cards.length !== 2) return false;
  return hand.cards[0].rank === hand.cards[1].rank;
}

// Check if hand can be doubled down (only on first two cards)
export function canDoubleDown(hand: Hand): boolean {
  return hand.cards.length === 2;
}

// Deal a card from the deck
export function dealCard(deck: Card[]): { card: Card; remainingDeck: Card[] } {
  if (deck.length === 0) {
    throw new Error('Deck is empty');
  }

  const card = deck[0];
  const remainingDeck = deck.slice(1);

  return { card, remainingDeck };
}

// Deal initial cards (2 to each player and dealer)
export function dealInitialCards(deck: Card[], numPlayers: number): {
  playerHands: Card[][];
  dealerHand: Card[];
  remainingDeck: Card[];
} {
  let currentDeck = [...deck];
  const playerHands: Card[][] = Array(numPlayers).fill(null).map(() => []);
  const dealerHand: Card[] = [];

  // Deal 2 cards to each player and dealer (alternating)
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < numPlayers; i++) {
      const { card, remainingDeck } = dealCard(currentDeck);
      playerHands[i].push(card);
      currentDeck = remainingDeck;
    }

    const { card, remainingDeck } = dealCard(currentDeck);
    dealerHand.push(card);
    currentDeck = remainingDeck;
  }

  return { playerHands, dealerHand, remainingDeck: currentDeck };
}

// Dealer AI: hit until 17+ (standard rules: stand on soft 17)
export function playDealerHand(dealerHand: Card[], deck: Card[]): {
  finalHand: Card[];
  remainingDeck: Card[];
} {
  let currentHand = [...dealerHand];
  let currentDeck = [...deck];

  while (true) {
    const { value } = calculateHandValue(currentHand);

    // Dealer stands on 17 or higher
    if (value >= 17) {
      break;
    }

    // Dealer hits
    const { card, remainingDeck } = dealCard(currentDeck);
    currentHand.push(card);
    currentDeck = remainingDeck;

    // Check for bust
    if (isBust(currentHand)) {
      break;
    }
  }

  return { finalHand: currentHand, remainingDeck: currentDeck };
}

// Determine payout for a hand
export function calculatePayout(hand: Hand, dealerHand: Card[]): number {
  // Surrender: lose half bet
  if (hand.status === 'surrender') {
    return hand.bet * 0.5;
  }

  // Bust: lose all
  if (hand.status === 'bust') {
    return 0;
  }

  const playerValue = calculateHandValue(hand.cards).value;
  const dealerValue = calculateHandValue(dealerHand).value;
  const dealerBust = isBust(dealerHand);

  // Player blackjack: pay 3:2 (1.5x) if dealer doesn't have blackjack
  if (hand.status === 'blackjack') {
    if (isBlackjack(dealerHand)) {
      // Push (tie)
      return hand.bet;
    }
    return hand.bet + (hand.bet * 1.5);
  }

  // Dealer bust: player wins
  if (dealerBust) {
    return hand.bet * 2;
  }

  // Compare values
  if (playerValue > dealerValue) {
    // Win: get bet back + equal amount
    return hand.bet * 2;
  } else if (playerValue === dealerValue) {
    // Push: get bet back
    return hand.bet;
  } else {
    // Lose
    return 0;
  }
}

// Calculate insurance payout (pays 2:1 if dealer has blackjack)
export function calculateInsurancePayout(insuranceBet: number, dealerHand: Card[]): number {
  if (isBlackjack(dealerHand)) {
    return insuranceBet * 3; // Get insurance back + 2x payout
  }
  return 0;
}

// Execute player action: Hit
export function hit(hand: Hand, deck: Card[]): {
  updatedHand: Hand;
  remainingDeck: Card[];
} {
  const { card, remainingDeck } = dealCard(deck);
  const updatedCards = [...hand.cards, card];

  let status = hand.status;
  if (isBust(updatedCards)) {
    status = 'bust';
  }

  return {
    updatedHand: {
      ...hand,
      cards: updatedCards,
      status,
    },
    remainingDeck,
  };
}

// Execute player action: Double Down
export function doubleDown(hand: Hand, deck: Card[], playerBalance: number): {
  updatedHand: Hand;
  remainingDeck: Card[];
  newBalance: number;
} | null {
  if (!canDoubleDown(hand)) return null;
  if (playerBalance < hand.bet) return null; // Not enough balance

  const { card, remainingDeck } = dealCard(deck);
  const updatedCards = [...hand.cards, card];

  let status: Hand['status'] = 'stand'; // Auto-stand after double down
  if (isBust(updatedCards)) {
    status = 'bust';
  }

  return {
    updatedHand: {
      ...hand,
      cards: updatedCards,
      bet: hand.bet * 2,
      status,
      doubled: true,
    },
    remainingDeck,
    newBalance: playerBalance - hand.bet,
  };
}

// Execute player action: Split
export function split(hand: Hand, deck: Card[], playerBalance: number): {
  hand1: Hand;
  hand2: Hand;
  remainingDeck: Card[];
  newBalance: number;
} | null {
  if (!canSplit(hand)) return null;
  if (playerBalance < hand.bet) return null; // Not enough balance for second hand

  let currentDeck = [...deck];

  // Split into two hands
  const { card: card1, remainingDeck: deck1 } = dealCard(currentDeck);
  const { card: card2, remainingDeck: deck2 } = dealCard(deck1);

  const hand1: Hand = {
    cards: [hand.cards[0], card1],
    bet: hand.bet,
    status: 'active',
  };

  const hand2: Hand = {
    cards: [hand.cards[1], card2],
    bet: hand.bet,
    status: 'active',
  };

  return {
    hand1,
    hand2,
    remainingDeck: deck2,
    newBalance: playerBalance - hand.bet,
  };
}

// Execute player action: Surrender
export function surrender(hand: Hand): Hand {
  return {
    ...hand,
    status: 'surrender',
  };
}

// Execute player action: Insurance (side bet when dealer shows Ace)
export function takeInsurance(hand: Hand, insuranceAmount: number, playerBalance: number): {
  updatedHand: Hand;
  newBalance: number;
} | null {
  if (playerBalance < insuranceAmount) return null;

  return {
    updatedHand: {
      ...hand,
      insurance: insuranceAmount,
    },
    newBalance: playerBalance - insuranceAmount,
  };
}

// Check if dealer is showing an Ace (insurance available)
export function dealerShowingAce(dealerUpCard: Card): boolean {
  return dealerUpCard.rank === 'A';
}

// Check if deck needs reshuffling (less than 1 deck remaining)
export function needsReshuffle(deck: Card[], threshold = 52): boolean {
  return deck.length < threshold;
}

// Get optimal strategy hint (basic strategy)
export function getBasicStrategyHint(
  hand: Hand,
  dealerUpCard: Card
): 'hit' | 'stand' | 'double' | 'split' | 'surrender' {
  const { value, soft } = calculateHandValue(hand.cards);
  const dealerValue = dealerUpCard.value === 11 ? dealerUpCard.rank === 'A' ? 11 : 10 : dealerUpCard.value;

  // Check for pair (split option)
  if (canSplit(hand)) {
    const pairRank = hand.cards[0].rank;
    if (pairRank === 'A' || pairRank === '8') return 'split';
    if (pairRank === '9' && dealerValue <= 9 && dealerValue !== 7) return 'split';
    if (['2', '3', '6', '7'].includes(pairRank) && dealerValue <= 7) return 'split';
  }

  // Soft hands (with Ace)
  if (soft) {
    if (value >= 19) return 'stand';
    if (value === 18) {
      if (dealerValue >= 9) return 'hit';
      if (dealerValue >= 3 && canDoubleDown(hand)) return 'double';
      return 'stand';
    }
    // Soft 17 or less
    if (canDoubleDown(hand) && dealerValue >= 4 && dealerValue <= 6) return 'double';
    return 'hit';
  }

  // Hard hands
  if (value >= 17) return 'stand';
  if (value >= 13 && dealerValue <= 6) return 'stand';
  if (value === 12 && dealerValue >= 4 && dealerValue <= 6) return 'stand';
  if (value === 11 && canDoubleDown(hand)) return 'double';
  if (value === 10 && canDoubleDown(hand) && dealerValue <= 9) return 'double';
  if (value === 9 && canDoubleDown(hand) && dealerValue >= 3 && dealerValue <= 6) return 'double';

  return 'hit';
}

// Calculate house edge / RTP
export function getExpectedRTP(): number {
  // Standard blackjack with basic strategy: ~99.5% RTP (0.5% house edge)
  return 99.5;
}
