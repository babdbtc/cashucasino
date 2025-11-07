/**
 * Calculate actual RTP for Sweet Bonanza through simulation
 */

import { playSpin } from "../lib/sweet-bonanza.js";

interface RTpResult {
  totalSpins: number;
  totalWagered: number;
  totalWon: number;
  actualRTP: number;
  avgWinPerSpin: number;
  winRate: number;
}

/**
 * Run simulated spins to calculate RTP
 */
function calculateSweetBonanzaRTP(numSpins: number = 10000): RTpResult {
  const betAmount = 100; // Standard bet
  let totalWon = 0;
  let winsCount = 0;

  console.log(`Simulating ${numSpins} spins of Sweet Bonanza...`);

  for (let i = 0; i < numSpins; i++) {
    const result = playSpin(betAmount, false, false);
    totalWon += result.totalWin;
    if (result.totalWin > 0) {
      winsCount++;
    }

    // Progress indicator
    if ((i + 1) % 1000 === 0) {
      console.log(`Completed ${i + 1}/${numSpins} spins...`);
    }
  }

  const totalWagered = numSpins * betAmount;
  const actualRTP = (totalWon / totalWagered) * 100;
  const avgWinPerSpin = totalWon / numSpins;
  const winRate = (winsCount / numSpins) * 100;

  return {
    totalSpins: numSpins,
    totalWagered,
    totalWon,
    actualRTP,
    avgWinPerSpin,
    winRate,
  };
}

/**
 * Calculate Plinko expected value
 */
function calculatePlinkoRTP() {
  const MULTIPLIERS_BY_RISK = {
    low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  };

  console.log("\n=== PLINKO RTP ANALYSIS ===\n");

  for (const [risk, multipliers] of Object.entries(MULTIPLIERS_BY_RISK)) {
    // Calculate probability for each slot (binomial distribution)
    // With 16 rows, the probability of landing in slot k is C(16,k) * (0.5)^16
    const probabilities: number[] = [];
    const n = 16; // number of rows

    // Calculate binomial coefficients
    function binomial(n: number, k: number): number {
      if (k > n) return 0;
      if (k === 0 || k === n) return 1;
      let result = 1;
      for (let i = 1; i <= k; i++) {
        result = result * (n - i + 1) / i;
      }
      return result;
    }

    // Calculate probability for each slot
    for (let k = 0; k <= 16; k++) {
      const prob = binomial(n, k) * Math.pow(0.5, n);
      probabilities.push(prob);
    }

    // Calculate expected value
    let expectedValue = 0;
    for (let i = 0; i < multipliers.length; i++) {
      expectedValue += multipliers[i] * probabilities[i];
    }

    const rtp = expectedValue * 100;

    console.log(`${risk.toUpperCase()} Risk:`);
    console.log(`  Expected Multiplier: ${expectedValue.toFixed(4)}x`);
    console.log(`  RTP: ${rtp.toFixed(2)}%`);
    console.log(`  House Edge: ${(100 - rtp).toFixed(2)}%`);

    // Show most likely outcomes
    const sortedProbs = probabilities.map((p, i) => ({ slot: i, prob: p, mult: multipliers[i] }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 5);

    console.log(`  Most likely outcomes:`);
    sortedProbs.forEach(({ slot, prob, mult }) => {
      console.log(`    Slot ${slot}: ${(prob * 100).toFixed(2)}% chance, ${mult}x multiplier`);
    });
    console.log("");
  }
}

// Run simulations
console.log("=== SWEET BONANZA RTP ANALYSIS ===\n");

const result = calculateSweetBonanzaRTP(10000);

console.log("\n=== RESULTS ===");
console.log(`Total Spins: ${result.totalSpins.toLocaleString()}`);
console.log(`Total Wagered: ${result.totalWagered.toLocaleString()} sats`);
console.log(`Total Won: ${result.totalWon.toLocaleString()} sats`);
console.log(`\nActual RTP: ${result.actualRTP.toFixed(2)}%`);
console.log(`Average Win Per Spin: ${result.avgWinPerSpin.toFixed(2)} sats`);
console.log(`Win Rate: ${result.winRate.toFixed(2)}% of spins`);
console.log(`House Edge: ${(100 - result.actualRTP).toFixed(2)}%`);

// Check if within target range
const targetRTP = 96;
const tolerance = 2; // +/- 2%
if (result.actualRTP >= targetRTP - tolerance && result.actualRTP <= targetRTP + tolerance) {
  console.log(`\n✅ RTP is within acceptable range (${targetRTP - tolerance}% - ${targetRTP + tolerance}%)`);
} else if (result.actualRTP < targetRTP - tolerance) {
  console.log(`\n⚠️  RTP is TOO LOW! Need to increase payouts or win frequency.`);
  console.log(`   Difference: ${(targetRTP - result.actualRTP).toFixed(2)}% below target`);
} else {
  console.log(`\n⚠️  RTP is TOO HIGH! Need to decrease payouts or win frequency.`);
  console.log(`   Difference: ${(result.actualRTP - targetRTP).toFixed(2)}% above target`);
}

console.log("\n");
calculatePlinkoRTP();
