import crypto from 'crypto';

export interface CrashGameState {
  gameId: string;
  crashPoint: number;
  serverSeed: string;
  clientSeed: string;
  hashedServerSeed: string;
  gameStartTime: number;
  bettingPhaseEnd: number;
  betAmount: number;
  autoCashout: number | null;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
  gameActive: boolean;
  bettingPhase: boolean;
}

export interface CrashResult {
  crashed: boolean;
  crashPoint: number;
  finalMultiplier: number;
  winAmount: number;
  serverSeed: string;
}

// Constants
export const MIN_BET = 1;
export const MAX_BET = 500;
export const MAX_MULTIPLIER = 1000;
export const HOUSE_EDGE = 0.05; // 5% house edge
export const BETTING_PHASE_DURATION = 1000; // 1 second
export const GAME_SPEED = 100; // milliseconds per tick
export const MULTIPLIER_GROWTH_RATE = 0.0015; // Exponential growth rate

/**
 * Helper function to check if hash is divisible by mod
 * Used for instant crash probability
 */
function isDivisible(hash: string, mod: number): boolean {
  let val = 0;
  const o = hash.length % 4;

  for (let i = o > 0 ? o - 4 : 0; i < hash.length; i += 4) {
    val = ((val << 16) + parseInt(hash.substring(i, i + 4), 16)) % mod;
  }

  return val === 0;
}

/**
 * Generates a provably fair crash point using server and client seeds
 * Bustabit-style algorithm modified for 5% house edge
 */
export function generateCrashPoint(serverSeed: string, clientSeed: string): number {
  // Combine seeds and hash
  const combined = `${serverSeed}-${clientSeed}`;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');

  // Convert first 13 hex chars (52 bits) to integer for precision
  const h = parseInt(hash.slice(0, 13), 16);
  const e = Math.pow(2, 52);

  // Bustabit formula adapted for 5% house edge:
  // crashPoint = (houseEdgePercent * e) / (e - h) / 100
  // For 5% edge: (95 * e) / (e - h) / 100
  // This ensures E[1/crashPoint] ≈ 0.95
  const houseEdgePercent = 100 - (HOUSE_EDGE * 100); // 95 for 5% edge
  const result = (houseEdgePercent * e) / (e - h) / 100;

  // Round down to 2 decimal places (floor for house advantage)
  const rounded = Math.floor(result * 100) / 100;

  // Ensure minimum 1.00x and cap at max multiplier
  return Math.min(Math.max(1.00, rounded), MAX_MULTIPLIER);
}

/**
 * Generates a cryptographically secure random seed
 */
export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes the server seed for provably fair verification
 */
export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Calculates the current multiplier based on elapsed time
 * Uses exponential growth for fast-paced gameplay
 */
export function calculateCurrentMultiplier(elapsedMs: number): number {
  if (elapsedMs < 0) return 1.0;

  // Exponential growth: multiplier = e^(rate * time)
  const seconds = elapsedMs / 1000;
  const multiplier = Math.pow(Math.E, MULTIPLIER_GROWTH_RATE * seconds * 100);

  // Round to 2 decimal places
  return Math.round(multiplier * 100) / 100;
}

/**
 * Calculates win amount based on bet and multiplier
 */
export function calculateWinAmount(betAmount: number, multiplier: number): number {
  return Math.round(betAmount * multiplier * 100) / 100;
}

/**
 * Verifies that a crash point was generated fairly using the seeds
 */
export function verifyCrashPoint(
  serverSeed: string,
  clientSeed: string,
  crashPoint: number
): boolean {
  const calculatedCrashPoint = generateCrashPoint(serverSeed, clientSeed);
  // Allow small floating point difference
  return Math.abs(calculatedCrashPoint - crashPoint) < 0.01;
}

/**
 * Creates a new crash game instance
 */
export function createCrashGame(
  betAmount: number,
  clientSeed?: string,
  autoCashout?: number
): CrashGameState {
  // Generate server seed and hash it
  const serverSeed = generateServerSeed();
  const hashedServerSeed = hashServerSeed(serverSeed);

  // Use provided client seed or generate one
  const finalClientSeed = clientSeed || crypto.randomBytes(16).toString('hex');

  // Generate crash point
  const crashPoint = generateCrashPoint(serverSeed, finalClientSeed);

  const now = Date.now();
  const gameId = crypto.randomBytes(16).toString('hex');

  return {
    gameId,
    crashPoint,
    serverSeed,
    clientSeed: finalClientSeed,
    hashedServerSeed,
    gameStartTime: now + BETTING_PHASE_DURATION,
    bettingPhaseEnd: now + BETTING_PHASE_DURATION,
    betAmount,
    autoCashout: autoCashout || null,
    cashedOut: false,
    cashoutMultiplier: null,
    gameActive: true,
    bettingPhase: true,
  };
}

/**
 * Processes a cashout attempt
 */
export function processCashout(
  game: CrashGameState,
  currentTime: number = Date.now()
): CrashResult {
  // Calculate elapsed time since game started
  const elapsedMs = currentTime - game.gameStartTime;

  // Game hasn't started yet
  if (elapsedMs < 0) {
    return {
      crashed: false,
      crashPoint: game.crashPoint,
      finalMultiplier: 1.0,
      winAmount: 0,
      serverSeed: '', // Don't reveal seed yet
    };
  }

  const currentMultiplier = calculateCurrentMultiplier(elapsedMs);

  // Check if already crashed
  if (currentMultiplier >= game.crashPoint) {
    return {
      crashed: true,
      crashPoint: game.crashPoint,
      finalMultiplier: game.crashPoint,
      winAmount: 0,
      serverSeed: game.serverSeed,
    };
  }

  // Successful cashout
  const winAmount = calculateWinAmount(game.betAmount, currentMultiplier);

  return {
    crashed: false,
    crashPoint: game.crashPoint,
    finalMultiplier: currentMultiplier,
    winAmount,
    serverSeed: game.serverSeed,
  };
}

/**
 * Checks if game has crashed
 */
export function hasGameCrashed(game: CrashGameState, currentTime: number = Date.now()): boolean {
  const elapsedMs = currentTime - game.gameStartTime;
  if (elapsedMs < 0) return false;

  const currentMultiplier = calculateCurrentMultiplier(elapsedMs);
  return currentMultiplier >= game.crashPoint;
}

/**
 * Checks if auto cashout should trigger
 */
export function shouldAutoCashout(
  game: CrashGameState,
  currentTime: number = Date.now()
): boolean {
  if (!game.autoCashout || game.cashedOut) return false;

  const elapsedMs = currentTime - game.gameStartTime;
  if (elapsedMs < 0) return false;

  const currentMultiplier = calculateCurrentMultiplier(elapsedMs);

  // Auto cashout if current multiplier >= target and game hasn't crashed
  return currentMultiplier >= game.autoCashout && currentMultiplier < game.crashPoint;
}

/**
 * Gets the current game status
 */
export function getGameStatus(game: CrashGameState, currentTime: number = Date.now()): {
  phase: 'betting' | 'running' | 'crashed';
  currentMultiplier: number;
  crashed: boolean;
  canCashout: boolean;
} {
  const now = currentTime;

  // Still in betting phase
  if (now < game.bettingPhaseEnd) {
    return {
      phase: 'betting',
      currentMultiplier: 1.0,
      crashed: false,
      canCashout: false,
    };
  }

  const elapsedMs = now - game.gameStartTime;
  const currentMultiplier = calculateCurrentMultiplier(elapsedMs);
  const crashed = currentMultiplier >= game.crashPoint;

  return {
    phase: crashed ? 'crashed' : 'running',
    currentMultiplier: crashed ? game.crashPoint : currentMultiplier,
    crashed,
    canCashout: !crashed && !game.cashedOut,
  };
}

/**
 * Validates bet amount
 */
export function isValidBet(betAmount: number): boolean {
  return Number.isInteger(betAmount) && betAmount >= MIN_BET && betAmount <= MAX_BET;
}

/**
 * Validates auto cashout multiplier
 */
export function isValidAutoCashout(autoCashout: number | null): boolean {
  if (autoCashout === null) return true;
  return autoCashout >= 1.01 && autoCashout <= MAX_MULTIPLIER;
}
