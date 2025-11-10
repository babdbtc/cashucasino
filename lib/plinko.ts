import crypto from "crypto";

export type RiskLevel = "low" | "medium" | "high";

export interface PlinkoResult {
  multiplier: number;
  path: number[]; // Array of 16 moves (0=left, 1=right)
  slot: number; // Final slot (0-16)
}

// 16 rows (3 pegs at top, 18 at bottom), 17 multiplier slots
const MULTIPLIERS: Record<RiskLevel, number[]> = {
  low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  medium: [100, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 100],
  high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
};

/**
 * Generate cryptographically secure random bit (0 or 1)
 */
function randomBit(): number {
  const byte = crypto.randomBytes(1)[0];
  return byte < 128 ? 0 : 1;
}

export function playPlinko(risk: RiskLevel): PlinkoResult {
  // Generate 16 random moves (0=left, 1=right) using cryptographically secure randomness
  const path: number[] = [];
  for (let i = 0; i < 16; i++) {
    path.push(randomBit());
  }

  // Calculate final slot (0-16) based on number of right moves
  const rightMoves = path.filter(move => move === 1).length;
  const slot = rightMoves;

  // Get multiplier for that slot
  const multiplier = MULTIPLIERS[risk][slot];

  return {
    multiplier,
    path,
    slot
  };
}
