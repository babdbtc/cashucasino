/**
 * Sweet Bonanza Buy Free Spins RTP Simulation Tool
 *
 * This script simulates buying free spins repeatedly to calculate if it's profitable.
 * Cost: 100x bet per purchase
 * Return: Whatever the free spins session pays
 *
 * Usage: npx tsx scripts/simulate-buy-freespins.ts [numPurchases] [betAmount]
 * Example: npx tsx scripts/simulate-buy-freespins.ts 10000 10
 */

import { playSpin } from "../lib/sweet-bonanza";

interface BuyFreeSpinsStats {
  totalPurchases: number;
  totalCost: number; // 100x bet per purchase
  totalWon: number;
  actualRTP: number;

  // Session statistics
  sessionWins: number[];
  averageSessionWin: number;
  biggestSessionWin: number;
  smallestSessionWin: number;

  // Profitability
  profitableSessions: number;
  profitableRate: number;
  averageProfit: number; // Per session

  // Free spins statistics
  totalFreeSpinsPlayed: number;
  averageFreeSpinsPerSession: number;
  retriggeredSessions: number;
  retriggerRate: number;
  totalRetriggers: number;

  // Bomb statistics
  totalBombs: number;
  bombMultipliers: number[];
  averageBombMultiplier: number;
  sessionsWithBombs: number;

  // Distribution analysis
  winDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

function runBuyFreeSpinsSimulation(numPurchases: number, betAmount: number): BuyFreeSpinsStats {
  const purchaseCost = betAmount * 100;

  const stats: BuyFreeSpinsStats = {
    totalPurchases: 0,
    totalCost: 0,
    totalWon: 0,
    actualRTP: 0,

    sessionWins: [],
    averageSessionWin: 0,
    biggestSessionWin: 0,
    smallestSessionWin: Infinity,

    profitableSessions: 0,
    profitableRate: 0,
    averageProfit: 0,

    totalFreeSpinsPlayed: 0,
    averageFreeSpinsPerSession: 0,
    retriggeredSessions: 0,
    retriggerRate: 0,
    totalRetriggers: 0,

    totalBombs: 0,
    bombMultipliers: [],
    averageBombMultiplier: 0,
    sessionsWithBombs: 0,

    winDistribution: [],
  };

  console.log(`🎰 Simulating ${numPurchases.toLocaleString()} Free Spins Purchases @ ${betAmount} sats/spin...`);
  console.log(`💰 Cost per purchase: ${purchaseCost.toLocaleString()} sats (100x bet)`);
  console.log(`📊 Total cost: ${(numPurchases * purchaseCost).toLocaleString()} sats\n`);

  for (let i = 0; i < numPurchases; i++) {
    stats.totalPurchases++;
    stats.totalCost += purchaseCost;

    // Buy free spins (initial spin with 4 lollipops)
    const buySpinResult = playSpin(betAmount, false, true);

    let sessionWin = buySpinResult.totalWin;
    let freeSpinsRemaining = buySpinResult.freeSpinsAwarded;
    let sessionFreeSpinsPlayed = 0;
    let sessionRetriggers = 0;
    let sessionBombs: number[] = [];

    // Play through all free spins
    while (freeSpinsRemaining > 0) {
      const freeSpinResult = playSpin(betAmount, true, false);
      sessionWin += freeSpinResult.totalWin;
      sessionFreeSpinsPlayed++;
      freeSpinsRemaining--;

      // Track bombs
      if (freeSpinResult.finalBombs.length > 0) {
        for (const bomb of freeSpinResult.finalBombs) {
          sessionBombs.push(bomb.multiplier);
        }
      }

      // Check for retrigger
      if (freeSpinResult.triggeredFreeSpins) {
        freeSpinsRemaining += freeSpinResult.freeSpinsAwarded;
        sessionRetriggers++;
      }
    }

    // Record session statistics
    stats.sessionWins.push(sessionWin);
    stats.totalWon += sessionWin;
    stats.totalFreeSpinsPlayed += sessionFreeSpinsPlayed;

    if (sessionWin > stats.biggestSessionWin) {
      stats.biggestSessionWin = sessionWin;
    }
    if (sessionWin < stats.smallestSessionWin) {
      stats.smallestSessionWin = sessionWin;
    }

    // Profitability
    if (sessionWin > purchaseCost) {
      stats.profitableSessions++;
    }

    // Retriggers
    if (sessionRetriggers > 0) {
      stats.retriggeredSessions++;
      stats.totalRetriggers += sessionRetriggers;
    }

    // Bombs
    if (sessionBombs.length > 0) {
      stats.sessionsWithBombs++;
      stats.totalBombs += sessionBombs.length;
      stats.bombMultipliers.push(...sessionBombs);
    }

    // Progress indicator
    if ((i + 1) % 1000 === 0) {
      const progress = ((i + 1) / numPurchases * 100).toFixed(1);
      const currentRTP = (stats.totalWon / stats.totalCost * 100).toFixed(2);
      process.stdout.write(`\r⏳ Progress: ${progress}% | Current RTP: ${currentRTP}%`);
    }
  }

  console.log('\n');

  // Calculate final statistics
  stats.actualRTP = (stats.totalWon / stats.totalCost) * 100;
  stats.averageSessionWin = stats.sessionWins.reduce((a, b) => a + b, 0) / stats.sessionWins.length;
  stats.profitableRate = (stats.profitableSessions / stats.totalPurchases) * 100;
  stats.averageProfit = (stats.totalWon - stats.totalCost) / stats.totalPurchases;
  stats.averageFreeSpinsPerSession = stats.totalFreeSpinsPlayed / stats.totalPurchases;
  stats.retriggerRate = (stats.retriggeredSessions / stats.totalPurchases) * 100;

  if (stats.bombMultipliers.length > 0) {
    stats.averageBombMultiplier = stats.bombMultipliers.reduce((a, b) => a + b, 0) / stats.bombMultipliers.length;
  }

  // Calculate win distribution
  const ranges = [
    { min: 0, max: purchaseCost * 0.5, label: '0-50% of cost' },
    { min: purchaseCost * 0.5, max: purchaseCost, label: '50-100% of cost' },
    { min: purchaseCost, max: purchaseCost * 2, label: '100-200% of cost (small profit)' },
    { min: purchaseCost * 2, max: purchaseCost * 5, label: '200-500% of cost (good win)' },
    { min: purchaseCost * 5, max: purchaseCost * 10, label: '500-1000% of cost (big win)' },
    { min: purchaseCost * 10, max: Infinity, label: '1000%+ of cost (massive win)' },
  ];

  for (const range of ranges) {
    const count = stats.sessionWins.filter(w => w >= range.min && w < range.max).length;
    stats.winDistribution.push({
      range: range.label,
      count,
      percentage: (count / stats.totalPurchases) * 100,
    });
  }

  return stats;
}

function displayResults(stats: BuyFreeSpinsStats, betAmount: number) {
  const purchaseCost = betAmount * 100;

  console.log("═".repeat(80));
  console.log("🎰 BUY FREE SPINS RTP SIMULATION RESULTS");
  console.log("═".repeat(80));

  console.log("\n📊 OVERALL STATISTICS:");
  console.log("─".repeat(80));
  console.log(`Total Purchases:      ${stats.totalPurchases.toLocaleString()}`);
  console.log(`Total Cost:           ${stats.totalCost.toLocaleString()} sats (${purchaseCost} sats each)`);
  console.log(`Total Won:            ${stats.totalWon.toLocaleString()} sats`);
  console.log(`Net Profit/Loss:      ${(stats.totalWon - stats.totalCost).toLocaleString()} sats`);
  console.log(`\n✨ ACTUAL RTP:         ${stats.actualRTP.toFixed(2)}%`);
  console.log(`   House Edge:        ${(100 - stats.actualRTP).toFixed(2)}%`);

  // Verdict
  if (stats.actualRTP > 100) {
    console.log(`\n🎉 VERDICT: Buying free spins is +EV (profitable!) by ${(stats.actualRTP - 100).toFixed(2)}%`);
  } else if (stats.actualRTP >= 96) {
    console.log(`\n✅ VERDICT: Buying free spins has similar RTP to regular play (~96-97%)`);
  } else {
    console.log(`\n⚠️  VERDICT: Buying free spins has lower RTP than regular play`);
  }

  console.log("\n💰 SESSION STATISTICS:");
  console.log("─".repeat(80));
  console.log(`Average Session Win:  ${stats.averageSessionWin.toFixed(2)} sats (${(stats.averageSessionWin / purchaseCost * 100).toFixed(2)}% of cost)`);
  console.log(`Biggest Session Win:  ${stats.biggestSessionWin.toLocaleString()} sats (${(stats.biggestSessionWin / purchaseCost).toFixed(2)}x cost)`);
  console.log(`Smallest Session Win: ${stats.smallestSessionWin.toLocaleString()} sats (${(stats.smallestSessionWin / purchaseCost * 100).toFixed(2)}% of cost)`);
  console.log(`Average Profit:       ${stats.averageProfit.toFixed(2)} sats/session`);

  console.log("\n📈 PROFITABILITY:");
  console.log("─".repeat(80));
  console.log(`Profitable Sessions:  ${stats.profitableSessions.toLocaleString()} (${stats.profitableRate.toFixed(2)}%)`);
  console.log(`Break-even or Loss:   ${(stats.totalPurchases - stats.profitableSessions).toLocaleString()} (${(100 - stats.profitableRate).toFixed(2)}%)`);

  console.log("\n🍭 FREE SPINS STATISTICS:");
  console.log("─".repeat(80));
  console.log(`Total Free Spins:     ${stats.totalFreeSpinsPlayed.toLocaleString()}`);
  console.log(`Avg Spins/Session:    ${stats.averageFreeSpinsPerSession.toFixed(2)}`);
  console.log(`Retriggered Sessions: ${stats.retriggeredSessions.toLocaleString()} (${stats.retriggerRate.toFixed(2)}%)`);
  console.log(`Total Retriggers:     ${stats.totalRetriggers.toLocaleString()}`);
  console.log(`Avg Retriggers/Session: ${(stats.totalRetriggers / stats.totalPurchases).toFixed(2)}`);

  console.log("\n💣 BOMB STATISTICS:");
  console.log("─".repeat(80));
  console.log(`Total Bombs:          ${stats.totalBombs.toLocaleString()}`);
  console.log(`Sessions with Bombs:  ${stats.sessionsWithBombs.toLocaleString()} (${(stats.sessionsWithBombs / stats.totalPurchases * 100).toFixed(2)}%)`);
  console.log(`Avg Bombs/Session:    ${(stats.totalBombs / stats.totalPurchases).toFixed(2)}`);
  console.log(`Avg Bomb Multiplier:  ${stats.averageBombMultiplier.toFixed(2)}x`);

  // Bomb distribution
  const bombDistribution: Record<string, number> = {};
  for (const mult of stats.bombMultipliers) {
    bombDistribution[mult] = (bombDistribution[mult] || 0) + 1;
  }
  console.log(`\nBomb Multiplier Distribution:`);
  const sortedBombs = Object.entries(bombDistribution).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  for (const [mult, count] of sortedBombs) {
    const percentage = (count / stats.bombMultipliers.length * 100).toFixed(2);
    console.log(`  ${mult}x: ${count.toLocaleString()} (${percentage}%)`);
  }

  console.log("\n📊 WIN DISTRIBUTION:");
  console.log("─".repeat(80));
  for (const dist of stats.winDistribution) {
    const bar = "█".repeat(Math.floor(dist.percentage / 2));
    console.log(`${dist.range.padEnd(35)} ${dist.count.toString().padStart(6)} (${dist.percentage.toFixed(2).padStart(5)}%) ${bar}`);
  }

  console.log("\n💡 INSIGHTS:");
  console.log("─".repeat(80));
  console.log(`Expected value per purchase: ${stats.averageSessionWin.toFixed(2)} sats`);
  console.log(`Cost per purchase:           ${purchaseCost} sats`);
  console.log(`Expected profit/loss:        ${(stats.averageSessionWin - purchaseCost).toFixed(2)} sats (${((stats.averageSessionWin / purchaseCost - 1) * 100).toFixed(2)}%)`);
  console.log(`\nBreak-even rate needed:      ${(purchaseCost / stats.averageSessionWin * 100).toFixed(2)}% win rate`);
  console.log(`Actual profitable rate:      ${stats.profitableRate.toFixed(2)}%`);

  const expectedReturn = stats.averageSessionWin;
  const variance = stats.sessionWins.reduce((sum, w) => sum + Math.pow(w - expectedReturn, 2), 0) / stats.sessionWins.length;
  const stdDev = Math.sqrt(variance);
  console.log(`\nVolatility (Std Dev):        ${stdDev.toFixed(2)} sats`);
  console.log(`Coefficient of Variation:    ${(stdDev / expectedReturn * 100).toFixed(2)}%`);

  console.log("\n" + "═".repeat(80));
}

// Main execution
const args = process.argv.slice(2);
const numPurchases = parseInt(args[0]) || 1000;
const betAmount = parseInt(args[1]) || 10;

const stats = runBuyFreeSpinsSimulation(numPurchases, betAmount);
displayResults(stats, betAmount);

// Export results to JSON
import { writeFileSync } from 'fs';
import { join } from 'path';

const resultsPath = join(process.cwd(), 'buy-freespins-simulation-results.json');
writeFileSync(resultsPath, JSON.stringify(stats, null, 2));
console.log(`\n💾 Results saved to: ${resultsPath}\n`);
