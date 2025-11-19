import crypto from "crypto";

export interface MinesGameState {
  gameId: string;
  minePositions: number[]; // Positions of mines (0-24)
  revealedTiles: number[]; // Positions of revealed tiles
  minesCount: number;
  currentMultiplier: number;
  gameActive: boolean;
}

// Preset difficulties
export const MINES_PRESETS = {
  easy: 3,
  medium: 5,
  hard: 10,
  extreme: 15,
} as const;

export type MinesDifficulty = keyof typeof MINES_PRESETS;

/**
 * Calculate multiplier based on tiles revealed and mines count
 * Formula: ∏(i=0 to n-1) [25 - i] / [25 - m - i]
 * Adjusted with house edge of ~3%
 */
export function calculateMultiplier(tilesRevealed: number, minesCount: number): number {
  if (tilesRevealed === 0) return 1.0;

  let multiplier = 1.0;
  const totalTiles = 25;
  const housEdge = 0.97; // 3% house edge

  for (let i = 0; i < tilesRevealed; i++) {
    const remainingTiles = totalTiles - i;
    const remainingSafeTiles = totalTiles - minesCount - i;

    if (remainingSafeTiles <= 0) break;

    multiplier *= remainingTiles / remainingSafeTiles;
  }

  return multiplier * housEdge;
}

/**
 * Generate random mine positions using cryptographic randomness
 */
export function generateMinePositions(minesCount: number): number[] {
  if (minesCount < 1 || minesCount > 24) {
    throw new Error("Mines count must be between 1 and 24");
  }

  const positions: number[] = [];
  const available = Array.from({ length: 25 }, (_, i) => i);

  // Fisher-Yates shuffle with crypto random
  for (let i = 0; i < minesCount; i++) {
    const remainingCount = available.length;
    const randomBytes = crypto.randomBytes(4);
    const randomIndex = randomBytes.readUInt32BE(0) % remainingCount;

    positions.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }

  return positions.sort((a, b) => a - b);
}

/**
 * Create a new mines game
 */
export function createMinesGame(minesCount: number): MinesGameState {
  const gameId = crypto.randomBytes(16).toString("hex");
  const minePositions = generateMinePositions(minesCount);

  return {
    gameId,
    minePositions,
    revealedTiles: [],
    minesCount,
    currentMultiplier: 1.0,
    gameActive: true,
  };
}

/**
 * Reveal a tile and check if it's a mine
 */
export function revealTile(
  game: MinesGameState,
  position: number
): { hitMine: boolean; newMultiplier: number; game: MinesGameState } {
  if (!game.gameActive) {
    throw new Error("Game is not active");
  }

  if (position < 0 || position > 24) {
    throw new Error("Invalid tile position");
  }

  if (game.revealedTiles.includes(position)) {
    throw new Error("Tile already revealed");
  }

  const hitMine = game.minePositions.includes(position);

  if (hitMine) {
    // Game over - hit a mine
    return {
      hitMine: true,
      newMultiplier: 0,
      game: {
        ...game,
        revealedTiles: [...game.revealedTiles, position],
        currentMultiplier: 0,
        gameActive: false,
      },
    };
  } else {
    // Safe tile - update multiplier
    const newRevealedTiles = [...game.revealedTiles, position];
    const newMultiplier = calculateMultiplier(newRevealedTiles.length, game.minesCount);

    return {
      hitMine: false,
      newMultiplier,
      game: {
        ...game,
        revealedTiles: newRevealedTiles,
        currentMultiplier: newMultiplier,
      },
    };
  }
}

/**
 * Get multiplier table for display (first 10 tiles)
 */
export function getMultiplierTable(minesCount: number): { tiles: number; multiplier: number }[] {
  const table: { tiles: number; multiplier: number }[] = [];
  const maxTiles = Math.min(10, 25 - minesCount);

  for (let i = 1; i <= maxTiles; i++) {
    table.push({
      tiles: i,
      multiplier: calculateMultiplier(i, minesCount),
    });
  }

  return table;
}
