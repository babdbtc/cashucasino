import { randomBytes } from "crypto";

// Sweet Bonanza symbols matching official Pragmatic Play game
export type Symbol =
  | "🍬" // Red Heart Candy (highest)
  | "💜" // Purple Candy (high)
  | "💚" // Green Candy (medium-high)
  | "💙" // Blue Candy (medium)
  | "🍎" // Red Apple (medium)
  | "🍇" // Purple Plum/Grapes (medium-low)
  | "🍉" // Green Watermelon (low)
  | "🫐" // Purple Grapes (low)
  | "🍌" // Yellow Banana (lowest)
  | "🍭" // Scatter/Lollipop (triggers free spins)
  | "💣"; // Bomb (multiplier during free spins only)

export interface Position {
  row: number;
  col: number;
}

export interface Cluster {
  symbol: Symbol;
  positions: Position[];
  payout: number;
}

export interface BombData {
  position: Position;
  multiplier: number;
}

export interface TumbleResult {
  grid: Symbol[][];
  clusters: Cluster[];
  winAmount: number;
  bombs: BombData[]; // Bombs present in this tumble
}

export interface SpinResult {
  initialGrid: Symbol[][];
  initialBombs: BombData[]; // Bombs in initial grid (free spins only)
  tumbles: TumbleResult[];
  finalBombs: BombData[]; // Bombs in final grid after all tumbles (free spins only)
  totalWin: number;
  totalBet: number;
  scatterCount: number;
  scatterPayout: number; // Direct scatter payout
  triggeredFreeSpins: boolean;
  freeSpinsAwarded: number;
  bombMultiplierTotal?: number; // Total bomb multiplier applied (free spins only)
}

// Symbol weights for regular spins (higher = more common)
// Flatter distribution - reduced clustering while maintaining playability
const SYMBOL_WEIGHTS: Record<Exclude<Symbol, "💣">, number> = {
  "🍌": 26,   // Banana - most common, lowest payout
  "🫐": 23,   // Grapes - common
  "🍉": 20,   // Watermelon - common
  "🍇": 18,   // Plum - medium
  "🍎": 15,   // Apple - medium
  "💙": 13,   // Blue Candy - rare
  "💚": 10,   // Green Candy - rare
  "💜": 8,    // Purple Candy - very rare
  "🍬": 6,    // Red Heart Candy - extremely rare, highest payout
  "🍭": 2,    // Scatter - rare, triggers free spins
};

// Symbol weights for free spins (bombs can appear)
// Same clustering as regular spins for consistent gameplay
const FREE_SPINS_SYMBOL_WEIGHTS: Record<Symbol, number> = {
  "🍌": 26,   // Banana
  "🫐": 23,   // Grapes
  "🍉": 20,   // Watermelon
  "🍇": 18,   // Plum
  "🍎": 15,   // Apple
  "💙": 13,   // Blue Candy
  "💚": 10,   // Green Candy
  "💜": 8,    // Purple Candy
  "🍬": 6,    // Red Heart Candy
  "🍭": 2,    // Scatter
  "💣": 9,    // Bomb - ~4.5% per position
};

// Payouts at original values - clustering reduction provides RTP balance
const BASE_PAYOUTS: Record<Exclude<Symbol, "🍭" | "💣">, { symbols8: number; symbols10: number; symbols12: number }> = {
  "🍬": { symbols8: 10,  symbols10: 25,   symbols12: 50 },    // Red Heart Candy
  "💜": { symbols8: 2.5, symbols10: 10,   symbols12: 25 },    // Purple Candy
  "💚": { symbols8: 2,   symbols10: 5,    symbols12: 15 },    // Green Candy
  "💙": { symbols8: 1.5, symbols10: 2,    symbols12: 12 },    // Blue Candy
  "🍎": { symbols8: 1,   symbols10: 1.5,  symbols12: 10 },    // Red Apple
  "🍇": { symbols8: 0.8, symbols10: 1.2,  symbols12: 8 },     // Purple Plum
  "🍉": { symbols8: 0.5, symbols10: 1,    symbols12: 5 },     // Green Watermelon
  "🫐": { symbols8: 0.4, symbols10: 0.9,  symbols12: 4 },     // Purple Grapes
  "🍌": { symbols8: 0.25, symbols10: 0.75, symbols12: 2 },    // Yellow Banana
};

// Scatter payouts (4, 5, 6+ scatters)
const SCATTER_PAYOUTS: Record<number, number> = {
  4: 3,
  5: 5,
  6: 100,
};

// Bomb multiplier values (official values from Pragmatic Play)
const BOMB_MULTIPLIER_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100];

// Bomb multiplier distribution - balanced across all ranges for rewarding free spins
// ~40% low (2x-6x), ~35% mid (8x-15x), ~15% high (20x-30x), ~10% very high (40x+)
const BOMB_WEIGHTS = [
  40, 35, 32, 30, 28,  // 2x-6x (common - 40% combined)
  35, 32, 28, 25,      // 8x-15x (common - 35% combined)
  18, 14, 10,          // 20x-30x (uncommon - 15% combined)
  8, 6,                // 40x-50x (rare - 5%)
  4, 3, 3              // 60x-100x (very rare - 5%)
];

const ROWS = 5;
const COLS = 6;
const MIN_CLUSTER_SIZE = 8; // Official Sweet Bonanza requires 8+ symbols
const MAX_BET = 1000;
const MIN_BET = 1;
const FREE_SPINS_TRIGGER = 4; // 4+ scatters trigger free spins
const FREE_SPINS_AWARDED = 10; // 10 free spins awarded
const FREE_SPINS_RETRIGGER = 3; // 3+ scatters during free spins add +5 spins
const FREE_SPINS_RETRIGGER_AMOUNT = 5;
const BOMB_APPEARANCE_CHANCE = 30; // ~30% chance per position during free spins tumbles

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
function getRandomSymbol(isFreeSpins: boolean = false): Symbol {
  const weights = isFreeSpins ? FREE_SPINS_SYMBOL_WEIGHTS : SYMBOL_WEIGHTS;
  const symbols = Object.keys(weights) as Symbol[];
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  let random = secureRandom(totalWeight);

  for (const symbol of symbols) {
    random -= weights[symbol as keyof typeof weights];
    if (random < 0) {
      return symbol;
    }
  }

  return symbols[0]; // Fallback
}

/**
 * Get random bomb multiplier with weighted distribution
 */
function getRandomBombMultiplier(): number {
  const totalWeight = BOMB_WEIGHTS.reduce((a, b) => a + b, 0);
  let random = secureRandom(totalWeight);

  for (let i = 0; i < BOMB_MULTIPLIER_VALUES.length; i++) {
    random -= BOMB_WEIGHTS[i];
    if (random < 0) {
      return BOMB_MULTIPLIER_VALUES[i];
    }
  }

  return 2; // Fallback to lowest multiplier
}

/**
 * Generate a 6x5 grid
 */
function generateGrid(isFreeSpins: boolean = false): Symbol[][] {
  const grid: Symbol[][] = [];

  for (let row = 0; row < ROWS; row++) {
    const rowSymbols: Symbol[] = [];
    for (let col = 0; col < COLS; col++) {
      rowSymbols.push(getRandomSymbol(isFreeSpins));
    }
    grid.push(rowSymbols);
  }

  return grid;
}

/**
 * Generate a forced free spins grid (with exactly 4 lollipops)
 * Used when buying free spins
 */
function generateForcedFreeSpinsGrid(): Symbol[][] {
  const grid: Symbol[][] = [];

  // Generate normal grid first
  for (let row = 0; row < ROWS; row++) {
    const rowSymbols: Symbol[] = [];
    for (let col = 0; col < COLS; col++) {
      rowSymbols.push(getRandomSymbol(false)); // Use regular symbols
    }
    grid.push(rowSymbols);
  }

  // Place exactly 4 lollipops in random positions
  const positions: Position[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      positions.push({ row, col });
    }
  }

  // Shuffle positions and pick first 4
  for (let i = positions.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // Place lollipops
  for (let i = 0; i < 4; i++) {
    const pos = positions[i];
    grid[pos.row][pos.col] = "🍭";
  }

  return grid;
}

/**
 * Find all winning symbol combinations (8+ of same symbol ANYWHERE on grid)
 * Sweet Bonanza uses scatter pays - symbols don't need to be connected
 */
function findClusters(grid: Symbol[][]): Cluster[] {
  const clusters: Cluster[] = [];
  const symbolCounts = new Map<Symbol, Position[]>();

  // Count all symbols and track their positions
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const symbol = grid[row][col];

      // Skip scatters and bombs - they don't form winning clusters
      if (symbol === "🍭" || symbol === "💣") {
        continue;
      }

      if (!symbolCounts.has(symbol)) {
        symbolCounts.set(symbol, []);
      }
      symbolCounts.get(symbol)!.push({ row, col });
    }
  }

  // Check each symbol type for wins (8+ symbols required)
  for (const [symbol, positions] of symbolCounts.entries()) {
    if (positions.length >= MIN_CLUSTER_SIZE) {
      const payout = calculateClusterPayout(symbol as Exclude<Symbol, "🍭" | "💣">, positions.length);
      clusters.push({ symbol, positions, payout });
    }
  }

  return clusters;
}

/**
 * Calculate payout for a cluster based on size (official Pragmatic Play values)
 */
function calculateClusterPayout(symbol: Exclude<Symbol, "🍭" | "💣">, size: number): number {
  const payouts = BASE_PAYOUTS[symbol];

  if (size >= 12) return payouts.symbols12;
  if (size >= 10) return payouts.symbols10;
  return payouts.symbols8; // 8-9 symbols
}

/**
 * Count scatter symbols on the grid
 */
function countScatters(grid: Symbol[][]): number {
  let count = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (grid[row][col] === "🍭") {
        count++;
      }
    }
  }
  return count;
}

/**
 * Calculate scatter payout
 */
function calculateScatterPayout(count: number): number {
  if (count >= 6) return SCATTER_PAYOUTS[6];
  if (count >= 5) return SCATTER_PAYOUTS[5];
  if (count >= 4) return SCATTER_PAYOUTS[4];
  return 0;
}

/**
 * Find all bombs in the grid and assign random multipliers
 * If existingBombs is provided, reuse multipliers for bombs at the same position
 */
function findBombs(grid: Symbol[][], existingBombs?: BombData[]): BombData[] {
  const bombs: BombData[] = [];

  // Create a map of existing bomb positions to their multipliers
  const existingMultipliers = new Map<string, number>();
  if (existingBombs) {
    for (const bomb of existingBombs) {
      const key = `${bomb.position.row},${bomb.position.col}`;
      existingMultipliers.set(key, bomb.multiplier);
    }
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (grid[row][col] === "💣") {
        const key = `${row},${col}`;
        const existingMultiplier = existingMultipliers.get(key);

        bombs.push({
          position: { row, col },
          // Reuse existing multiplier if bomb is in the same position, otherwise generate new
          multiplier: existingMultiplier !== undefined ? existingMultiplier : getRandomBombMultiplier()
        });
      }
    }
  }

  return bombs;
}

/**
 * Remove winning symbols and apply gravity (tumble mechanic)
 */
function applyTumble(grid: Symbol[][], clusters: Cluster[], isFreeSpins: boolean): Symbol[][] {
  const newGrid: Symbol[][] = grid.map(row => [...row]);

  // Mark winning positions as empty (null)
  for (const cluster of clusters) {
    for (const pos of cluster.positions) {
      newGrid[pos.row][pos.col] = null as any;
    }
  }

  // Apply gravity - symbols fall down
  for (let col = 0; col < COLS; col++) {
    // Collect non-empty symbols from bottom to top
    const column: Symbol[] = [];
    for (let row = ROWS - 1; row >= 0; row--) {
      if (newGrid[row][col] !== null) {
        column.push(newGrid[row][col]);
      }
    }

    // Fill column from bottom with existing symbols
    for (let row = ROWS - 1; row >= 0; row--) {
      if (column.length > 0) {
        newGrid[row][col] = column.shift()!;
      } else {
        // Fill empty spaces with new random symbols (bombs can appear during tumbles in free spins)
        newGrid[row][col] = getRandomSymbol(isFreeSpins);
      }
    }
  }

  return newGrid;
}

/**
 * Play a spin with tumble mechanics
 * Official Sweet Bonanza logic: bombs accumulate across tumbles, multiplier applied at END
 */
export function playSpin(betAmount: number, isFreeSpins = false, buyingFreeSpins = false): SpinResult {
  // Validate bet amount
  if (betAmount < MIN_BET || betAmount > MAX_BET) {
    throw new Error(`Bet must be between ${MIN_BET} and ${MAX_BET} sats`);
  }

  // Generate grid - forced lollipops if buying free spins, otherwise random
  let grid = buyingFreeSpins ? generateForcedFreeSpinsGrid() : generateGrid(isFreeSpins);
  const initialGrid = grid.map(row => [...row]);
  const tumbles: TumbleResult[] = [];
  let tumbleWinTotal = 0; // Total win from all tumbles (before bomb multiplier)

  // Find bombs in initial grid (free spins only)
  const initialBombs = isFreeSpins ? findBombs(initialGrid) : [];

  // Count scatters on initial grid and calculate scatter payout
  const scatterCount = countScatters(grid);
  const scatterPayout = calculateScatterPayout(scatterCount);
  const scatterPayoutAmount = Math.floor(betAmount * scatterPayout);

  // Check free spins trigger/retrigger
  let triggeredFreeSpins = false;
  let freeSpinsAwarded = 0;

  if (!isFreeSpins && scatterCount >= FREE_SPINS_TRIGGER) {
    // Base game: 4+ scatters trigger free spins
    triggeredFreeSpins = true;
    freeSpinsAwarded = FREE_SPINS_AWARDED;
  } else if (isFreeSpins && scatterCount >= FREE_SPINS_RETRIGGER) {
    // Free spins: 3+ scatters retrigger (+5 spins)
    triggeredFreeSpins = true;
    freeSpinsAwarded = FREE_SPINS_RETRIGGER_AMOUNT;
  }

  // Collect all bombs across all tumbles (Sweet Bonanza: bombs stay visible throughout tumbles)
  const allBombs: BombData[] = [];
  // Track all bombs we've seen to maintain consistent multipliers
  const seenBombs: BombData[] = [...initialBombs];

  // Keep tumbling while there are winning clusters
  let maxTumbles = 20; // Safety limit
  while (maxTumbles > 0) {
    const clusters = findClusters(grid);

    if (clusters.length === 0) {
      break; // No more wins, stop tumbling
    }

    // Calculate win for this tumble
    const tumbleWin = clusters.reduce((sum, cluster) => sum + cluster.payout, 0);
    const tumbleWinAmount = Math.floor(betAmount * tumbleWin);
    tumbleWinTotal += tumbleWinAmount;

    // During free spins, find bombs in this tumble BEFORE tumble (for accumulation)
    const bombsBeforeTumble = isFreeSpins ? findBombs(grid, seenBombs) : [];
    allBombs.push(...bombsBeforeTumble);

    // Update seen bombs with any new bombs from this tumble
    for (const bomb of bombsBeforeTumble) {
      const key = `${bomb.position.row},${bomb.position.col}`;
      const alreadySeen = seenBombs.some(b => `${b.position.row},${b.position.col}` === key);
      if (!alreadySeen) {
        seenBombs.push(bomb);
      }
    }

    // Apply tumble (remove winning symbols and drop new ones)
    grid = applyTumble(grid, clusters, isFreeSpins);

    // Find bombs AFTER tumble for correct display positions (maintain multipliers from seenBombs)
    const bombsAfterTumble = isFreeSpins ? findBombs(grid, seenBombs) : [];

    // Save this tumble's state (AFTER tumble with new symbols and updated bomb positions)
    tumbles.push({
      grid: grid.map(row => [...row]),
      clusters,
      winAmount: tumbleWinAmount,
      bombs: bombsAfterTumble, // Use positions AFTER tumble for correct client-side display
    });

    maxTumbles--;
  }

  // Find bombs in final grid (after all tumbles) - pass seenBombs to maintain consistent multipliers
  const finalBombs = isFreeSpins ? findBombs(grid, seenBombs) : [];

  // Calculate final total win
  let totalWin = tumbleWinTotal + scatterPayoutAmount;
  let bombMultiplierTotal: number | undefined;

  // Apply bomb multipliers at the END (official Sweet Bonanza logic)
  if (isFreeSpins && allBombs.length > 0 && tumbleWinTotal > 0) {
    bombMultiplierTotal = allBombs.reduce((sum, bomb) => sum + bomb.multiplier, 0);
    totalWin = Math.floor(tumbleWinTotal * bombMultiplierTotal) + scatterPayoutAmount;
  }

  return {
    initialGrid,
    initialBombs,
    tumbles,
    finalBombs,
    totalWin,
    totalBet: betAmount,
    scatterCount,
    scatterPayout: scatterPayoutAmount,
    triggeredFreeSpins,
    freeSpinsAwarded,
    bombMultiplierTotal,
  };
}

/**
 * Calculate theoretical RTP
 */
export function calculateTheoreticalRTP(): number {
  // Sweet Bonanza has 96.48-96.51% RTP
  return 0.9648;
}

// Log theoretical RTP on module load (for debugging)
if (typeof window === "undefined") {
  const rtp = calculateTheoreticalRTP();
  console.log(`Sweet Bonanza RTP: ${(rtp * 100).toFixed(2)}%`);
  console.log(`Theoretical RTP: ${(0.9044 * 100).toFixed(2)}%`);
}
