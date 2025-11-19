/**
 * Calculate RTP and analyze Mines game through simulation
 */

import { calculateMultiplier, MINES_PRESETS } from "../lib/mines.js";

interface MinesSimResult {
  difficulty: string;
  minesCount: number;
  totalGames: number;
  totalWagered: number;
  totalWon: number;
  actualRTP: number;
  avgWinPerGame: number;
  winRate: number;
  avgTilesRevealed: number;
  gameOverByMineRate: number;
}

/**
 * Simulate a single Mines game with a simple strategy:
 * Reveal tiles until either hitting a mine or reaching a target multiplier
 */
function simulateMinesGame(
  minesCount: number,
  targetMultiplier: number = 2.0,
  betAmount: number = 100
): { won: number; tilesRevealed: number; hitMine: boolean } {
  const totalTiles = 25;
  const safeTiles = totalTiles - minesCount;

  // Generate random mine positions
  const minePositions = new Set<number>();
  while (minePositions.size < minesCount) {
    minePositions.add(Math.floor(Math.random() * totalTiles));
  }

  let tilesRevealed = 0;
  const revealedPositions = new Set<number>();

  // Keep revealing tiles until we hit target multiplier or a mine
  while (tilesRevealed < safeTiles) {
    // Pick a random unrevealed tile
    let position: number;
    do {
      position = Math.floor(Math.random() * totalTiles);
    } while (revealedPositions.has(position));

    revealedPositions.add(position);

    // Check if it's a mine
    if (minePositions.has(position)) {
      return { won: 0, tilesRevealed: tilesRevealed + 1, hitMine: true };
    }

    tilesRevealed++;

    // Calculate current multiplier
    const currentMultiplier = calculateMultiplier(tilesRevealed, minesCount);

    // Cash out if we've reached target multiplier
    if (currentMultiplier >= targetMultiplier) {
      const winAmount = Math.floor(betAmount * currentMultiplier);
      return { won: winAmount, tilesRevealed, hitMine: false };
    }
  }

  // Revealed all safe tiles without hitting a mine
  const finalMultiplier = calculateMultiplier(tilesRevealed, minesCount);
  const winAmount = Math.floor(betAmount * finalMultiplier);
  return { won: winAmount, tilesRevealed, hitMine: false };
}

/**
 * Run simulations for a specific mine count
 */
function runMinesSimulation(
  minesCount: number,
  difficulty: string,
  numGames: number = 10000,
  targetMultiplier: number = 2.0
): MinesSimResult {
  const betAmount = 100;
  let totalWon = 0;
  let winsCount = 0;
  let totalTilesRevealed = 0;
  let mineHitCount = 0;

  console.log(`\nSimulating ${numGames} games with ${minesCount} mines (${difficulty})...`);

  for (let i = 0; i < numGames; i++) {
    const result = simulateMinesGame(minesCount, targetMultiplier, betAmount);
    totalWon += result.won;
    totalTilesRevealed += result.tilesRevealed;

    if (result.won > 0) {
      winsCount++;
    }

    if (result.hitMine) {
      mineHitCount++;
    }

    // Progress indicator
    if ((i + 1) % 2000 === 0) {
      console.log(`Completed ${i + 1}/${numGames} games...`);
    }
  }

  const totalWagered = numGames * betAmount;
  const actualRTP = (totalWon / totalWagered) * 100;
  const avgWinPerGame = totalWon / numGames;
  const winRate = (winsCount / numGames) * 100;
  const avgTilesRevealed = totalTilesRevealed / numGames;
  const gameOverByMineRate = (mineHitCount / numGames) * 100;

  return {
    difficulty,
    minesCount,
    totalGames: numGames,
    totalWagered,
    totalWon,
    actualRTP,
    avgWinPerGame,
    winRate,
    avgTilesRevealed,
    gameOverByMineRate,
  };
}

/**
 * Analyze theoretical RTP for perfect play (revealing all safe tiles)
 */
function analyzeTheoreticalRTP(minesCount: number): number {
  const totalTiles = 25;
  const safeTiles = totalTiles - minesCount;

  // Calculate probability of successfully revealing N tiles
  function probabilityOfRevealingNTiles(n: number): number {
    let prob = 1.0;
    for (let i = 0; i < n; i++) {
      const remainingTiles = totalTiles - i;
      const remainingSafeTiles = safeTiles - i;
      prob *= remainingSafeTiles / remainingTiles;
    }
    return prob;
  }

  // For theoretical max RTP, assume player reveals all safe tiles
  const maxMultiplier = calculateMultiplier(safeTiles, minesCount);
  const probabilityOfSuccess = probabilityOfRevealingNTiles(safeTiles);
  const expectedValue = maxMultiplier * probabilityOfSuccess;

  return expectedValue * 100;
}

/**
 * Display multiplier progression table
 */
function displayMultiplierTable(minesCount: number) {
  console.log(`\n=== MULTIPLIER PROGRESSION (${minesCount} mines) ===`);
  console.log("Tiles | Multiplier | Cumulative Probability");
  console.log("------|------------|----------------------");

  const totalTiles = 25;
  const safeTiles = totalTiles - minesCount;

  for (let tiles = 1; tiles <= Math.min(15, safeTiles); tiles++) {
    const multiplier = calculateMultiplier(tiles, minesCount);

    // Calculate probability of reaching this many tiles
    let prob = 1.0;
    for (let i = 0; i < tiles; i++) {
      const remainingTiles = totalTiles - i;
      const remainingSafeTiles = safeTiles - i;
      prob *= remainingSafeTiles / remainingTiles;
    }

    console.log(
      `${tiles.toString().padStart(5)} | ${multiplier.toFixed(2).padStart(10)}x | ${(prob * 100).toFixed(4)}%`
    );
  }
}

/**
 * Main simulation function
 */
function main() {
  console.log("=".repeat(60));
  console.log("MINES GAME RTP SIMULATION");
  console.log("=".repeat(60));

  const numGames = 50000; // Number of games to simulate per difficulty
  const targetMultiplier = 2.0; // Cash out at 2x multiplier (simple strategy)

  console.log(`\nSimulation Parameters:`);
  console.log(`  Games per difficulty: ${numGames}`);
  console.log(`  Target multiplier: ${targetMultiplier}x`);
  console.log(`  Bet amount: 100 sats`);

  const results: MinesSimResult[] = [];

  // Simulate preset difficulties
  for (const [difficulty, minesCount] of Object.entries(MINES_PRESETS)) {
    const result = runMinesSimulation(minesCount, difficulty, numGames, targetMultiplier);
    results.push(result);
    displayMultiplierTable(minesCount);
  }

  // Also simulate some custom mine counts
  const customCounts = [7, 12, 20];
  for (const minesCount of customCounts) {
    const result = runMinesSimulation(minesCount, "custom", numGames, targetMultiplier);
    results.push(result);
  }

  // Display results summary
  console.log("\n" + "=".repeat(60));
  console.log("SIMULATION RESULTS SUMMARY");
  console.log("=".repeat(60));

  for (const result of results) {
    console.log(`\n${result.difficulty.toUpperCase()} (${result.minesCount} mines):`);
    console.log(`  Total Games: ${result.totalGames.toLocaleString()}`);
    console.log(`  Total Wagered: ${result.totalWagered.toLocaleString()} sats`);
    console.log(`  Total Won: ${result.totalWon.toLocaleString()} sats`);
    console.log(`  Actual RTP: ${result.actualRTP.toFixed(2)}%`);
    console.log(`  House Edge: ${(100 - result.actualRTP).toFixed(2)}%`);
    console.log(`  Win Rate: ${result.winRate.toFixed(2)}%`);
    console.log(`  Avg Win Per Game: ${result.avgWinPerGame.toFixed(2)} sats`);
    console.log(`  Avg Tiles Revealed: ${result.avgTilesRevealed.toFixed(2)}`);
    console.log(`  Mine Hit Rate: ${result.gameOverByMineRate.toFixed(2)}%`);

    // Calculate theoretical max RTP
    const theoreticalRTP = analyzeTheoreticalRTP(result.minesCount);
    console.log(`  Theoretical Max RTP: ${theoreticalRTP.toFixed(2)}%`);
  }

  // Overall statistics
  console.log("\n" + "=".repeat(60));
  console.log("OVERALL ANALYSIS");
  console.log("=".repeat(60));

  const totalWagered = results.reduce((sum, r) => sum + r.totalWagered, 0);
  const totalWon = results.reduce((sum, r) => sum + r.totalWon, 0);
  const overallRTP = (totalWon / totalWagered) * 100;

  console.log(`\nTotal Simulated Games: ${results.reduce((sum, r) => sum + r.totalGames, 0).toLocaleString()}`);
  console.log(`Overall RTP: ${overallRTP.toFixed(2)}%`);
  console.log(`Overall House Edge: ${(100 - overallRTP).toFixed(2)}%`);

  console.log("\nNOTE: RTP varies based on player strategy.");
  console.log("This simulation uses a simple '${targetMultiplier}x and cash out' strategy.");
  console.log("Different strategies will yield different RTPs.");
  console.log("House edge is built into the multiplier calculation (~3%).");
}

// Run the simulation
main();
