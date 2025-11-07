import { randomBytes } from "crypto";

export type Symbol = "🍒" | "🍋" | "🍊" | "🔔" | "💎" | "7️⃣";

export interface SpinResult {
  reels: Symbol[][];
  winAmount: number;
  winLine: number | null;
  totalBet: number;
}

// Symbol weights for RNG (higher = more common)
const SYMBOL_WEIGHTS: Record<Symbol, number> = {
  "🍒": 35,  // Cherry - most common
  "🍋": 30,  // Lemon
  "🍊": 20,  // Orange
  "🔔": 10,  // Bell
  "💎": 4,   // Diamond
  "7️⃣": 1,   // Seven - rarest
};

// Payout multipliers for 3 matching symbols on middle row
// Designed to achieve ~90% RTP (verified: 90.4% RTP, 9.6% house edge)
const PAYOUT_MULTIPLIERS: Record<Symbol, number> = {
  "🍒": 8,    // 8x bet (most common)
  "🍋": 13,   // 13x bet
  "🍊": 20,   // 20x bet
  "🔔": 40,   // 40x bet
  "💎": 150,  // 150x bet
  "7️⃣": 777,  // 777x bet (JACKPOT!)
};

const MAX_BET = 1000;
const MIN_BET = 1;

/**
 * Generate a cryptographically secure random number between 0 and max (exclusive)
 */
function secureRandom(max: number): number {
  const bytes = randomBytes(4);
  const value = bytes.readUInt32BE(0);
  return value % max;
}

/**
 * Select a random symbol based on weighted probabilities
 */
function getRandomSymbol(): Symbol {
  const symbols = Object.keys(SYMBOL_WEIGHTS) as Symbol[];
  const totalWeight = Object.values(SYMBOL_WEIGHTS).reduce((a, b) => a + b, 0);

  let random = secureRandom(totalWeight);

  for (const symbol of symbols) {
    random -= SYMBOL_WEIGHTS[symbol];
    if (random < 0) {
      return symbol;
    }
  }

  return symbols[0]; // Fallback
}

/**
 * Generate a 3x3 reel grid
 */
function generateReels(): Symbol[][] {
  const reels: Symbol[][] = [];

  for (let i = 0; i < 3; i++) {
    const reel: Symbol[] = [];
    for (let j = 0; j < 3; j++) {
      reel.push(getRandomSymbol());
    }
    reels.push(reel);
  }

  return reels;
}

/**
 * Check if the middle row (payline) has a win
 */
function checkWin(reels: Symbol[][]): { won: boolean; symbol: Symbol | null } {
  // Check middle row (index 1)
  const middleRow = [reels[0][1], reels[1][1], reels[2][1]];

  // All three must match
  if (middleRow[0] === middleRow[1] && middleRow[1] === middleRow[2]) {
    return { won: true, symbol: middleRow[0] };
  }

  return { won: false, symbol: null };
}

/**
 * Play a spin on the slot machine
 * @param betAmount - Amount to bet in sats
 * @returns SpinResult with reel positions and win amount
 */
export function playSpin(betAmount: number): SpinResult {
  // Validate bet amount
  if (betAmount < MIN_BET || betAmount > MAX_BET) {
    throw new Error(`Bet must be between ${MIN_BET} and ${MAX_BET} sats`);
  }

  // Generate reels
  const reels = generateReels();

  // Check for wins
  const { won, symbol } = checkWin(reels);

  let winAmount = 0;
  let winLine: number | null = null;

  if (won && symbol) {
    // Calculate win amount based on payout multiplier
    const multiplier = PAYOUT_MULTIPLIERS[symbol];
    winAmount = betAmount * multiplier;
    winLine = 1; // Middle row is line 1
  }

  return {
    reels,
    winAmount,
    winLine,
    totalBet: betAmount,
  };
}

/**
 * Calculate theoretical RTP based on symbol weights and payouts
 * This is for testing/verification purposes
 */
export function calculateTheoreticalRTP(): number {
  const symbols = Object.keys(SYMBOL_WEIGHTS) as Symbol[];
  const totalWeight = Object.values(SYMBOL_WEIGHTS).reduce((a, b) => a + b, 0);

  let expectedReturn = 0;

  for (const symbol of symbols) {
    // Probability of getting this symbol on one position
    const symbolProb = SYMBOL_WEIGHTS[symbol] / totalWeight;

    // Probability of getting 3 of this symbol on the middle row
    const threeInRowProb = symbolProb * symbolProb * symbolProb;

    // Expected return for this combination
    const payout = PAYOUT_MULTIPLIERS[symbol];
    expectedReturn += threeInRowProb * payout;
  }

  return expectedReturn;
}

// Log theoretical RTP on module load (for debugging)
if (typeof window === "undefined") {
  const rtp = calculateTheoreticalRTP();
  console.log(`Theoretical RTP: ${(rtp * 100).toFixed(2)}%`);
}
