/**
 * Sweet Bonanza RTP Simulation Tool
 *
 * This script runs thousands of spins to calculate actual RTP and game statistics.
 *
 * Usage: npx tsx scripts/simulate-bonanza.ts [numSpins] [betAmount]
 * Example: npx tsx scripts/simulate-bonanza.ts 100000 10
 */

import { playSpin } from "../lib/sweet-bonanza";

interface SimulationStats {
  totalSpins: number;
  totalBet: number;
  totalWon: number;
  actualRTP: number;

  // Win statistics
  totalWins: number;
  hitFrequency: number;
  averageWin: number;
  biggestWin: number;

  // Free spins statistics
  freeSpinsTriggered: number;
  freeSpinsTriggerRate: number;
  totalFreeSpinsPlayed: number;
  freeSpinsRetriggered: number;

  // Free spins session statistics
  freeSpinsSessionWins: number[];
  averageFreeSpinsWin: number;
  biggestFreeSpinsWin: number;

  // Cluster statistics
  totalClusters: number;
  averageClustersPerWin: number;

  // Bomb statistics (free spins only)
  totalBombs: number;
  bombMultipliers: number[];
  averageBombMultiplier: number;
  totalBombWins: number;
  averageBombWinMultiplier: number;

  // Symbol cluster distribution
  symbolClusterCounts: Record<string, number>;
}

function runSimulation(numSpins: number, betAmount: number): SimulationStats {
  const stats: SimulationStats = {
    totalSpins: 0,
    totalBet: 0,
    totalWon: 0,
    actualRTP: 0,

    totalWins: 0,
    hitFrequency: 0,
    averageWin: 0,
    biggestWin: 0,

    freeSpinsTriggered: 0,
    freeSpinsTriggerRate: 0,
    totalFreeSpinsPlayed: 0,
    freeSpinsRetriggered: 0,

    freeSpinsSessionWins: [],
    averageFreeSpinsWin: 0,
    biggestFreeSpinsWin: 0,

    totalClusters: 0,
    averageClustersPerWin: 0,

    totalBombs: 0,
    bombMultipliers: [],
    averageBombMultiplier: 0,
    totalBombWins: 0,
    averageBombWinMultiplier: 0,

    symbolClusterCounts: {},
  };

  console.log(`🎰 Running ${numSpins.toLocaleString()} spins @ ${betAmount} sats/spin...`);
  console.log(`📊 Total bet: ${(numSpins * betAmount).toLocaleString()} sats\n`);

  let freeSpinsRemaining = 0;
  let currentFreeSpinsSessionWin = 0;

  for (let i = 0; i < numSpins; i++) {
    const isFreeSpins = freeSpinsRemaining > 0;

    // Play the spin
    const result = playSpin(betAmount, isFreeSpins, false);

    // Update basic stats
    stats.totalSpins++;
    stats.totalBet += betAmount;
    stats.totalWon += result.totalWin;

    if (result.totalWin > 0) {
      stats.totalWins++;
      if (result.totalWin > stats.biggestWin) {
        stats.biggestWin = result.totalWin;
      }
    }

    // Track clusters
    for (const tumble of result.tumbles) {
      stats.totalClusters += tumble.clusters.length;

      // Track symbol distribution
      for (const cluster of tumble.clusters) {
        const symbol = cluster.symbol;
        stats.symbolClusterCounts[symbol] = (stats.symbolClusterCounts[symbol] || 0) + 1;
      }
    }

    // Track bombs (free spins only)
    if (isFreeSpins && result.finalBombs.length > 0) {
      stats.totalBombs += result.finalBombs.length;
      for (const bomb of result.finalBombs) {
        stats.bombMultipliers.push(bomb.multiplier);
      }

      if (result.bombMultiplierTotal) {
        stats.totalBombWins++;
        stats.averageBombWinMultiplier += result.bombMultiplierTotal;
      }
    }

    // Handle free spins tracking
    if (result.triggeredFreeSpins) {
      if (!isFreeSpins) {
        // Fresh free spins triggered
        stats.freeSpinsTriggered++;
        freeSpinsRemaining = result.freeSpinsAwarded;
        currentFreeSpinsSessionWin = 0;
      } else {
        // Retriggered during free spins
        stats.freeSpinsRetriggered++;
        freeSpinsRemaining += result.freeSpinsAwarded;
      }
    }

    // Track free spins session
    if (isFreeSpins) {
      stats.totalFreeSpinsPlayed++;
      currentFreeSpinsSessionWin += result.totalWin;
      freeSpinsRemaining--;

      // Session ended
      if (freeSpinsRemaining === 0) {
        stats.freeSpinsSessionWins.push(currentFreeSpinsSessionWin);
        if (currentFreeSpinsSessionWin > stats.biggestFreeSpinsWin) {
          stats.biggestFreeSpinsWin = currentFreeSpinsSessionWin;
        }
        currentFreeSpinsSessionWin = 0;
      }
    }

    // Progress indicator
    if ((i + 1) % 10000 === 0) {
      const progress = ((i + 1) / numSpins * 100).toFixed(1);
      const currentRTP = (stats.totalWon / stats.totalBet * 100).toFixed(2);
      process.stdout.write(`\r⏳ Progress: ${progress}% | Current RTP: ${currentRTP}%`);
    }
  }

  console.log('\n');

  // Calculate final statistics
  stats.actualRTP = (stats.totalWon / stats.totalBet) * 100;
  stats.hitFrequency = (stats.totalWins / stats.totalSpins) * 100;
  stats.averageWin = stats.totalWins > 0 ? stats.totalWon / stats.totalWins : 0;
  stats.freeSpinsTriggerRate = (stats.freeSpinsTriggered / stats.totalSpins) * 100;
  stats.averageClustersPerWin = stats.totalWins > 0 ? stats.totalClusters / stats.totalWins : 0;

  if (stats.bombMultipliers.length > 0) {
    stats.averageBombMultiplier = stats.bombMultipliers.reduce((a, b) => a + b, 0) / stats.bombMultipliers.length;
  }

  if (stats.totalBombWins > 0) {
    stats.averageBombWinMultiplier = stats.averageBombWinMultiplier / stats.totalBombWins;
  }

  if (stats.freeSpinsSessionWins.length > 0) {
    stats.averageFreeSpinsWin = stats.freeSpinsSessionWins.reduce((a, b) => a + b, 0) / stats.freeSpinsSessionWins.length;
  }

  return stats;
}

function displayResults(stats: SimulationStats, betAmount: number) {
  console.log("═".repeat(80));
  console.log("🎰 SWEET BONANZA RTP SIMULATION RESULTS");
  console.log("═".repeat(80));

  console.log("\n📊 OVERALL STATISTICS:");
  console.log("─".repeat(80));
  console.log(`Total Spins:          ${stats.totalSpins.toLocaleString()}`);
  console.log(`Total Bet:            ${stats.totalBet.toLocaleString()} sats`);
  console.log(`Total Won:            ${stats.totalWon.toLocaleString()} sats`);
  console.log(`Net Profit/Loss:      ${(stats.totalWon - stats.totalBet).toLocaleString()} sats`);
  console.log(`\n✨ ACTUAL RTP:         ${stats.actualRTP.toFixed(2)}%`);
  console.log(`   House Edge:        ${(100 - stats.actualRTP).toFixed(2)}%`);

  console.log("\n💰 WIN STATISTICS:");
  console.log("─".repeat(80));
  console.log(`Total Wins:           ${stats.totalWins.toLocaleString()}`);
  console.log(`Hit Frequency:        ${stats.hitFrequency.toFixed(2)}% (1 in ${(100 / stats.hitFrequency).toFixed(1)} spins)`);
  console.log(`Average Win:          ${stats.averageWin.toFixed(2)} sats (${(stats.averageWin / betAmount).toFixed(2)}x bet)`);
  console.log(`Biggest Win:          ${stats.biggestWin.toLocaleString()} sats (${(stats.biggestWin / betAmount).toFixed(2)}x bet)`);

  console.log("\n🍭 FREE SPINS STATISTICS:");
  console.log("─".repeat(80));
  console.log(`Free Spins Triggered: ${stats.freeSpinsTriggered.toLocaleString()}`);
  console.log(`Trigger Rate:         ${stats.freeSpinsTriggerRate.toFixed(4)}% (1 in ${(100 / stats.freeSpinsTriggerRate).toFixed(0)} spins)`);
  console.log(`Total Free Spins:     ${stats.totalFreeSpinsPlayed.toLocaleString()}`);
  console.log(`Retriggered:          ${stats.freeSpinsRetriggered.toLocaleString()} times`);
  console.log(`Avg Retrigger/Session: ${(stats.freeSpinsRetriggered / stats.freeSpinsTriggered).toFixed(2)}`);
  console.log(`\nFree Spins Session Win Stats:`);
  console.log(`  Average:            ${stats.averageFreeSpinsWin.toFixed(2)} sats (${(stats.averageFreeSpinsWin / betAmount).toFixed(2)}x bet)`);
  console.log(`  Biggest:            ${stats.biggestFreeSpinsWin.toLocaleString()} sats (${(stats.biggestFreeSpinsWin / betAmount).toFixed(2)}x bet)`);

  console.log("\n💣 BOMB STATISTICS (Free Spins Only):");
  console.log("─".repeat(80));
  console.log(`Total Bombs:          ${stats.totalBombs.toLocaleString()}`);
  console.log(`Avg Bombs/Free Spin:  ${(stats.totalBombs / stats.totalFreeSpinsPlayed).toFixed(2)}`);
  console.log(`Avg Bomb Multiplier:  ${stats.averageBombMultiplier.toFixed(2)}x`);
  console.log(`Bomb Wins:            ${stats.totalBombWins.toLocaleString()}`);
  console.log(`Avg Bomb Win Multi:   ${stats.averageBombWinMultiplier.toFixed(2)}x (sum of all bombs)`);

  // Bomb multiplier distribution
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

  console.log("\n🎯 CLUSTER STATISTICS:");
  console.log("─".repeat(80));
  console.log(`Total Clusters:       ${stats.totalClusters.toLocaleString()}`);
  console.log(`Avg Clusters/Win:     ${stats.averageClustersPerWin.toFixed(2)}`);

  console.log(`\nSymbol Cluster Distribution:`);
  const sortedSymbols = Object.entries(stats.symbolClusterCounts).sort((a, b) => b[1] - a[1]);
  for (const [symbol, count] of sortedSymbols) {
    const percentage = (count / stats.totalClusters * 100).toFixed(2);
    console.log(`  ${symbol}: ${count.toLocaleString()} (${percentage}%)`);
  }

  console.log("\n" + "═".repeat(80));
}

// Main execution
const args = process.argv.slice(2);
const numSpins = parseInt(args[0]) || 10000;
const betAmount = parseInt(args[1]) || 10;

const stats = runSimulation(numSpins, betAmount);
displayResults(stats, betAmount);

// Export results to JSON
import { writeFileSync } from 'fs';
import { join } from 'path';

const resultsPath = join(process.cwd(), 'simulation-results.json');
writeFileSync(resultsPath, JSON.stringify(stats, null, 2));
console.log(`\n💾 Results saved to: ${resultsPath}\n`);
