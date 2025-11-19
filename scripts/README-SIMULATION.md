# Sweet Bonanza RTP Simulation Tool

This tool runs thousands of simulated spins to calculate the **actual RTP** and detailed game statistics for Sweet Bonanza.

## Quick Start

### Run a simulation:

```bash
# Run 10,000 spins with 10 sats bet (default)
npx tsx scripts/simulate-bonanza.ts

# Run 100,000 spins with 10 sats bet
npx tsx scripts/simulate-bonanza.ts 100000 10

# Run 1 million spins with 100 sats bet
npx tsx scripts/simulate-bonanza.ts 1000000 100
```

## What It Shows

The simulation provides detailed statistics:

### 📊 Overall Statistics
- **Total Spins, Bet, Won**
- **Actual RTP** (Return to Player %)
- **House Edge**
- **Net Profit/Loss**

### 💰 Win Statistics
- **Hit Frequency** - How often wins occur
- **Average Win** - Average payout when you win
- **Biggest Win** - Maximum payout seen

### 🍭 Free Spins Statistics
- **Trigger Rate** - How often free spins activate
- **Retrigger Rate** - How often +5 spins happen
- **Average Free Spins Win** - Expected payout per session
- **Biggest Free Spins Win**

### 💣 Bomb Statistics (Free Spins)
- **Bomb Frequency** - How many bombs per free spin
- **Average Bomb Multiplier**
- **Bomb Multiplier Distribution** - Breakdown of 2x, 5x, 10x, etc.

### 🎯 Cluster Statistics
- **Symbol Distribution** - Which symbols create clusters most
- **Average Clusters per Win**

## How to Use Results

### 🎯 Target RTP: 96-97%

**If RTP is too HIGH (>97%)**:
- Reduce cluster payouts in `BASE_PAYOUTS`
- Reduce bomb frequency/multipliers
- Make high-value symbols rarer

**If RTP is too LOW (<96%)**:
- Increase cluster payouts
- Increase high-value symbol weights
- Increase bomb multipliers

### 📈 Recommended Tests

1. **Quick test** (10,000 spins) - Fast feedback on major changes
2. **Standard test** (100,000 spins) - Good accuracy for balancing
3. **Final validation** (1,000,000 spins) - Production-ready verification

## Example Output

```
═══════════════════════════════════════════════════════════════════════
🎰 SWEET BONANZA RTP SIMULATION RESULTS
═══════════════════════════════════════════════════════════════════════

📊 OVERALL STATISTICS:
────────────────────────────────────────────────────────────────────────
Total Spins:          100,000
Total Bet:            1,000,000 sats
Total Won:            965,432 sats
Net Profit/Loss:      -34,568 sats

✨ ACTUAL RTP:         96.54%
   House Edge:        3.46%

💰 WIN STATISTICS:
────────────────────────────────────────────────────────────────────────
Total Wins:           42,315
Hit Frequency:        42.32% (1 in 2.4 spins)
Average Win:          22.8 sats (2.28x bet)
Biggest Win:          5,420 sats (542x bet)

🍭 FREE SPINS STATISTICS:
────────────────────────────────────────────────────────────────────────
Free Spins Triggered: 245
Trigger Rate:         0.2450% (1 in 408 spins)
Total Free Spins:     2,687
Retriggered:          37 times
Avg Retrigger/Session: 0.15

Free Spins Session Win Stats:
  Average:            1,245 sats (124.5x bet)
  Biggest:            8,930 sats (893x bet)
```

## Output Files

- **simulation-results.json** - Complete results in JSON format for further analysis

## Tips

### For Balancing:
1. Run multiple simulations (different sample sizes)
2. Check if RTP is consistent across runs
3. Look at variance (biggest wins vs average)
4. Ensure free spins are rewarding but not too frequent

### For Testing Changes:
1. Make a change to symbol weights/payouts
2. Run 100k spins
3. Check if RTP moved in expected direction
4. Iterate until you hit 96-97% RTP

## Understanding the Math

**RTP (Return to Player)**:
- 96% RTP = For every 100 sats bet, 96 sats are returned on average
- Higher RTP = Better for players, less profit for house
- Lower RTP = Worse for players, more profit for house

**Hit Frequency**:
- 40% hit frequency = Win on 4 out of 10 spins
- Higher frequency = More wins, but smaller payouts
- Lower frequency = Less wins, but bigger payouts

**Variance**:
- Low variance = Consistent small wins
- High variance = Rare big wins (like free spins)
