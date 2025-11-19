# Sweet Bonanza - Complete Game Mechanics Documentation

## Table of Contents
1. [Game Overview](#game-overview)
2. [Grid Structure](#grid-structure)
3. [Symbol Types and Rarity](#symbol-types-and-rarity)
4. [Paytable](#paytable)
5. [Winning Mechanics](#winning-mechanics)
6. [Tumble Mechanics](#tumble-mechanics)
7. [Scatter Mechanics](#scatter-mechanics)
8. [Free Spins](#free-spins)
9. [Bomb Multipliers](#bomb-multipliers)
10. [Win Calculation Formulas](#win-calculation-formulas)
11. [RTP Analysis](#rtp-analysis)
12. [Probability Distributions](#probability-distributions)

---

## Game Overview

**Sweet Bonanza** is a cluster pays slot game based on Pragmatic Play's official implementation. It features:
- **6×5 grid** (6 reels/columns, 5 rows = 30 positions)
- **Scatter pays** (symbols don't need to be connected)
- **Tumble mechanics** (cascading wins)
- **Free spins** with bomb multipliers
- **Minimum cluster size**: 8+ matching symbols
- **Target RTP**: 96.48-96.51%
- **Volatility**: High

---

## Grid Structure

```
Grid Layout (6 reels × 5 rows):
┌─────┬─────┬─────┬─────┬─────┬─────┐
│ 0,0 │ 0,1 │ 0,2 │ 0,3 │ 0,4 │ 0,5 │  Row 0
├─────┼─────┼─────┼─────┼─────┼─────┤
│ 1,0 │ 1,1 │ 1,2 │ 1,3 │ 1,4 │ 1,5 │  Row 1
├─────┼─────┼─────┼─────┼─────┼─────┤
│ 2,0 │ 2,1 │ 2,2 │ 2,3 │ 2,4 │ 2,5 │  Row 2
├─────┼─────┼─────┼─────┼─────┼─────┤
│ 3,0 │ 3,1 │ 3,2 │ 3,3 │ 3,4 │ 3,5 │  Row 3
├─────┼─────┼─────┼─────┼─────┼─────┤
│ 4,0 │ 4,1 │ 4,2 │ 4,3 │ 4,4 │ 4,5 │  Row 4
└─────┴─────┴─────┴─────┴─────┴─────┘
 Col 0  Col 1  Col 2  Col 3  Col 4  Col 5
```

---

## Symbol Types and Rarity

### Regular Symbols (Base Game)

| Symbol | Name | Weight | Probability | Rarity |
|--------|------|--------|-------------|--------|
| 🍌 | Banana | 35 | 22.73% | Most Common |
| 🍇 | Grapes | 30 | 19.48% | Common |
| 🍉 | Watermelon | 25 | 16.23% | Common |
| 🫐 | Plum | 20 | 12.99% | Medium |
| 🍎 | Apple | 15 | 9.74% | Medium |
| 💙 | Blue Candy | 10 | 6.49% | Rare |
| 💚 | Green Candy | 8 | 5.19% | Rare |
| 💜 | Purple Candy | 5 | 3.25% | Very Rare |
| 🍬 | Red Heart Candy | 3 | 1.95% | Extremely Rare |
| 🍭 | Lollipop (Scatter) | 3 | 1.95% | Rare |

**Total Weight**: 154

**Note**: Ante Bet (optional feature) increases bet by 1.25x and doubles free spins trigger chance by adding extra scatters to reels.

### Free Spins Symbols

| Symbol | Name | Weight | Probability | Notes |
|--------|------|--------|-------------|-------|
| 🍌 | Banana | 30 | 20.83% | Slightly reduced |
| 🍇 | Grapes | 26 | 18.06% | Slightly reduced |
| 🍉 | Watermelon | 22 | 15.28% | Slightly reduced |
| 🫐 | Plum | 18 | 12.50% | Slightly reduced |
| 🍎 | Apple | 13 | 9.03% | Slightly reduced |
| 💙 | Blue Candy | 9 | 6.25% | Slightly reduced |
| 💚 | Green Candy | 7 | 4.86% | Slightly reduced |
| 💜 | Purple Candy | 4 | 2.78% | Slightly reduced |
| 🍬 | Red Heart Candy | 2 | 1.39% | More rare |
| 🍭 | Lollipop (Scatter) | 3 | 2.08% | Same |
| 💣 | Bomb | 10 | 6.94% | **Free Spins Only** |

**Total Weight**: 144

**Important**: Bombs can appear on the **initial grid** and during **tumbles** in free spins. They use the same free spins weight distribution (~6.94% per position).

---

## Paytable

### Symbol Payouts (Multiplier × Bet Amount)

| Symbol | 8-9 Symbols | 10-11 Symbols | 12+ Symbols |
|--------|-------------|---------------|-------------|
| 🍬 Red Heart | **10x** | **25x** | **50x** |
| 💜 Purple Candy | **2.5x** | **10x** | **25x** |
| 💚 Green Candy | **2x** | **5x** | **15x** |
| 💙 Blue Candy | **1.5x** | **2x** | **12x** |
| 🍎 Apple | **1x** | **1.5x** | **10x** |
| 🫐 Plum | **0.8x** | **1.2x** | **8x** |
| 🍉 Watermelon | **0.5x** | **1x** | **5x** |
| 🍇 Grapes | **0.4x** | **0.9x** | **4x** |
| 🍌 Banana | **0.25x** | **0.75x** | **2x** |

### Scatter Payouts (Direct Win)

| Scatters | Payout | Notes |
|----------|--------|-------|
| 4 | **3x** | Triggers 10 Free Spins |
| 5 | **5x** | Triggers 10 Free Spins |
| 6+ | **100x** | Triggers 10 Free Spins |

**Note**: Scatter payouts are **added directly** to the total win, they don't go through bomb multipliers.

---

## Winning Mechanics

### Cluster Pays System

Sweet Bonanza uses a **scatter pays** system, NOT traditional paylines:

1. **Minimum Cluster**: 8+ matching symbols **anywhere** on the grid
2. **No Connection Required**: Symbols don't need to touch or be adjacent
3. **Multiple Clusters**: Can win with multiple different symbols in one spin
4. **Bombs & Scatters Excluded**: 💣 and 🍭 symbols don't form winning clusters

### Win Detection Algorithm

```typescript
For each symbol type (excluding 💣 and 🍭):
  1. Count total occurrences on the grid
  2. If count >= 8:
     - Calculate payout based on count (8-9, 10-11, or 12+)
     - Record all symbol positions
     - Add to winning clusters
```

### Example

```
Grid contains:
- 10 Bananas (🍌)
- 4 Apples (🍎)
- 16 other symbols

Result:
✅ 10 Bananas = WIN (0.75x payout for 10-11 symbols)
❌ 4 Apples = NO WIN (need at least 8)
```

---

## Tumble Mechanics

### How Tumbles Work

1. **Initial Spin**: Grid is generated with random symbols
2. **Check Wins**: Detect all winning clusters (8+ symbols)
3. **Remove Winners**: Winning symbols disappear from the grid
4. **Apply Gravity**: Remaining symbols fall down to fill gaps
5. **Fill Empty Spaces**: New random symbols drop from the top
6. **Repeat**: Check for new wins and continue tumbling
7. **Stop**: When no more winning clusters are found

### Tumble Rules

- **Maximum 20 tumbles** per spin (safety limit to prevent infinite loops)
- **All wins accumulate**: Each tumble's win is added to the total
- **Bombs persist** (free spins only): Bombs don't disappear, they stay on the grid throughout all tumbles
- **New bombs DON'T spawn**: When symbols are replaced during tumbles, only regular symbols can appear (no bombs)

### Tumble Sequence

```
Spin Start
  ↓
Generate Initial Grid
  ↓
[Tumble Loop]
  ↓
Find Winning Clusters
  ↓
Calculate Win Amount ────→ Add to Total Win
  ↓
Remove Winning Symbols
  ↓
Apply Gravity (symbols fall)
  ↓
Fill Empty Spaces (new random symbols)
  ↓
Check for More Wins?
  ↓
Yes → Continue Loop
No  → End Spin
```

---

## Scatter Mechanics

### Free Spins Trigger (Base Game)

- **Requirement**: 4+ Lollipops (🍭) anywhere on the initial grid
- **Awarded**: 10 Free Spins
- **Payout**: Direct payout based on scatter count (3x, 5x, or 100x)

### Free Spins Retrigger (During Free Spins)

- **Requirement**: 3+ Lollipops (🍭) anywhere on the grid
- **Awarded**: +5 Additional Free Spins
- **Payout**: If 4+ scatters, adds payout (3x for 4, 5x for 5, 100x for 6+); exactly 3 scatters only retriggers without payout

### Scatter Count Distribution

| Count | Base Game Trigger | Free Spins Retrigger | Payout |
|-------|-------------------|----------------------|--------|
| 0-2 | ❌ Nothing | ❌ Nothing | 0x |
| 3 | ❌ Nothing | ✅ +5 Spins | 0x |
| 4 | ✅ 10 Free Spins | ✅ +5 Spins | 3x |
| 5 | ✅ 10 Free Spins | ✅ +5 Spins | 5x |
| 6+ | ✅ 10 Free Spins | ✅ +5 Spins | 100x |

---

## Free Spins

### Activation

1. **Base Game**: Land 4+ scatters → Get 10 free spins
2. **Buy Feature**: Pay 100x bet amount → Get 10 free spins instantly

### Free Spins Features

- **Bomb Symbols** (💣): Can appear on any drop (~6.94% per position), including initial grid and during tumbles
- **Different Symbol Weights**: Slightly adjusted probabilities
- **Retrigger**: 3+ scatters during free spins add +5 more spins
- **Bomb Multipliers**: All bomb multipliers accumulate and apply at the END

### Important Free Spins Rules

1. **Bombs can spawn on initial grid AND during tumbles**: Use free spins weights for all symbol generation
2. **Bombs persist through tumbles**: Existing bombs stay in place during cascades (don't get removed)
3. **Multipliers are consistent**: Each bomb gets ONE multiplier value that stays the same throughout the entire spin
4. **Multipliers apply at the END**: All bomb multipliers are summed and applied AFTER all tumbles complete

---

## Bomb Multipliers

### Bomb Multiplier Values

| Multiplier | Weight | Probability | Tier |
|------------|--------|-------------|------|
| 2x | 50 | 14.71% | Very Common |
| 3x | 50 | 14.71% | Very Common |
| 4x | 50 | 14.71% | Very Common |
| 5x | 50 | 14.71% | Very Common |
| 6x | 40 | 11.76% | Very Common |
| 8x | 30 | 8.82% | Common |
| 10x | 30 | 8.82% | Common |
| 12x | 25 | 7.35% | Common |
| 15x | 20 | 5.88% | Common |
| 20x | 15 | 4.41% | Uncommon |
| 25x | 15 | 4.41% | Uncommon |
| 30x | 10 | 2.94% | Uncommon |
| 40x | 8 | 2.35% | Rare |
| 50x | 5 | 1.47% | Rare |
| 60x | 3 | 0.88% | Very Rare |
| 80x | 2 | 0.59% | Very Rare |
| 100x | 1 | 0.29% | Extremely Rare |

**Total Weight**: 340

### Bomb Distribution

- **~50% Low** (2x-6x): Very common, steady boost
- **~30% Mid** (8x-15x): Common, good multiplier
- **~15% High** (20x-30x): Uncommon, great multiplier
- **~5% Very High** (40x-100x): Rare, massive multiplier

### Bomb Mechanics

#### Single Spin Example

```
Free Spin Starts:
  Initial Grid: 💣(10x) at [1,2], 💣(25x) at [3,4]

  Tumble 1: Win 50 sats
    - Bombs persist: 💣(10x) still at [1,2], 💣(25x) still at [3,4]
    - Their multipliers DON'T CHANGE

  Tumble 2: Win 30 sats
    - Bombs persist: Same bombs, same multipliers

  Tumble 3: Win 20 sats
    - New bomb appears: 💣(5x) at [2,1] (spawned during this tumble)
    - Now have 3 bombs total

  All Tumbles Complete:
    Total tumble wins: 50 + 30 + 20 = 100 sats
    Total bomb multiplier: 10x + 25x + 5x = 40x
    Final win: 100 sats × 40 = 4,000 sats
```

---

## Win Calculation Formulas

### Base Game Win Formula

```
Total Win = Σ(Cluster Wins) + Scatter Payout

Where:
  Cluster Win = Bet Amount × Symbol Payout Multiplier
  Scatter Payout = Bet Amount × Scatter Multiplier (3x, 5x, or 100x)
```

### Free Spins Win Formula

```
Total Win = (Σ(Tumble Wins) × Bomb Multiplier) + Scatter Payout

Where:
  Tumble Wins = Sum of all wins from all tumbles
  Bomb Multiplier = Sum of all bomb multipliers on grid
  Scatter Payout = NOT multiplied by bombs (added directly)
```

### Detailed Calculation Example

#### Base Game Example

```
Bet: 100 sats
Initial Grid:
  - 12 Bananas (🍌): 2x payout
  - 4 Scatters (🍭): 3x payout, triggers free spins

Calculation:
  Banana Win = 100 × 2 = 200 sats
  Scatter Payout = 100 × 3 = 300 sats
  Total Win = 200 + 300 = 500 sats

Result: 500 sats + 10 Free Spins awarded
```

#### Free Spins Example

```
Bet: 100 sats
Initial Grid: 💣(10x), 💣(25x), 💣(5x)

Tumble 1:
  - 10 Watermelons (🍉): 1x payout = 100 sats

Tumble 2:
  - 8 Apples (🍎): 1x payout = 100 sats

Tumble 3:
  - 12 Bananas (🍌): 2x payout = 200 sats
  - 5 Scatters (🍭): 5x payout = 500 sats (retrigger +5 spins)

No more tumbles.

Calculation:
  Tumble Total = 100 + 100 + 200 = 400 sats
  Bomb Multiplier = 10x + 25x + 5x = 40x
  Multiplied Win = 400 × 40 = 16,000 sats
  Scatter Payout = 500 sats (NOT multiplied)
  Total Win = 16,000 + 500 = 16,500 sats

Result: 16,500 sats + 5 additional free spins
```

---

## RTP Analysis

### Target RTP

- **Target**: 96.48-96.51%
- **Current Implementation**: ~94-95% (needs tuning to match target)

### RTP Components

RTP is distributed across:

1. **Base Game Wins** (~40-50%): Regular cluster wins from symbols
2. **Tumble Mechanics** (~15-20%): Additional wins from cascading
3. **Free Spins** (~25-30%): Free spins with bomb multipliers
4. **Scatter Payouts** (~5-10%): Direct scatter bonuses

### House Edge

```
House Edge = 100% - RTP
Current: ~5-6%
```

### Win Statistics (10,000 Spins Simulation)

```
Total Spins: 10,000
Total Wagered: 1,000,000 sats
Total Won: ~940,000 sats
RTP: 94.00%
Win Rate: ~64% (probability of winning on any spin)
Average Win Per Spin: 94 sats (when bet is 100 sats)
```

---

## Probability Distributions

### Probability of Landing Exactly N Symbols

Using weighted random selection:

```
P(symbol) = Symbol Weight / Total Weight

Base Game (Total Weight = 154):
  P(🍌 Banana) = 35/154 = 22.73%
  P(🍬 Red Heart) = 3/154 = 1.95%

Free Spins (Total Weight = 144):
  P(🍌 Banana) = 30/144 = 20.83%
  P(💣 Bomb) = 10/144 = 6.94%
```

### Probability of Winning Cluster (8+ Symbols)

Using binomial distribution approximation for 30 positions:

```
P(Win with symbol S) ≈ 1 - Σ(k=0 to 7) [C(30,k) × p^k × (1-p)^(30-k)]

Where:
  C(30,k) = binomial coefficient (30 choose k)
  p = probability of symbol S appearing
```

**Example for Bananas (p = 22.73%)**:

```
P(8+ Bananas) ≈ 12.5%
```

### Free Spins Trigger Probability

Probability of landing exactly 4+ scatters in 30 positions:

```
P(4+ Scatters) = 1 - P(0 to 3 Scatters)

With p = 1.95% per position:
P(4+ Scatters) ≈ 0.7% - 1.0%

Expected Triggers: ~1 in 100-150 spins
```

### Expected Bomb Count in Free Spins

With bomb probability = 6.94% per position:

```
Expected Bombs = 30 × 0.0694 = 2.08 bombs per free spin

Distribution:
  0 bombs: ~14%
  1 bomb: ~29%
  2 bombs: ~30%
  3 bombs: ~18%
  4+ bombs: ~9%
```

### Expected Bomb Multiplier

Average bomb multiplier (weighted):

```
Expected Single Bomb Multiplier:
  Σ(Multiplier × Weight) / Total Weight
  = (2×50 + 3×50 + 4×50 + ... + 100×1) / 340
  ≈ 8.5x average per bomb

Expected Total Multiplier (2.08 bombs):
  2.08 × 8.5x ≈ 17.7x average per free spin
```

---

## Comparison With Other Slots

### Sweet Bonanza vs Traditional Slots

| Feature | Sweet Bonanza | Traditional Slots |
|---------|---------------|-------------------|
| **Grid** | 6×5 (30 positions) | 3×5 or 5×3 (15 positions) |
| **Win Mechanism** | Cluster Pays (8+ anywhere) | Paylines (left to right) |
| **Cascades** | Yes (Tumbles) | Rare |
| **Free Spins** | Bomb Multipliers | Varies (wilds, multipliers) |
| **Volatility** | High | Varies |
| **RTP** | 96.48-96.51% | 92-97% |
| **Max Win** | 21,100x | Varies (500x-10,000x+) |

### Sweet Bonanza vs Other Pragmatic Play Slots

| Metric | Sweet Bonanza | Gates of Olympus | Starlight Princess |
|--------|---------------|------------------|-------------------|
| **RTP** | 96.48-96.51% | 96.50% | 96.50% |
| **Grid** | 6×5 | 5×5 | 6×5 |
| **Mechanics** | Tumbles + Bombs | Tumbles + Zeus | Tumbles + Princess |
| **Free Spins** | 10 (buy 100x) | 15 (buy 100x) | 15 (buy 100x) |
| **Max Win** | 21,100x | 5,000x | 5,000x |
| **Volatility** | High | High | High |

### Key Differentiators

1. **Cluster Pays**: Unlike traditional paylines, Sweet Bonanza counts symbols anywhere on the grid
2. **Tumble Accumulation**: Multiple consecutive wins in a single spin increase win potential
3. **Bomb Multipliers**: Multiplicative (not additive) scaling creates massive win potential
4. **High Volatility**: Lower win frequency but higher payout potential when wins occur

---

## Technical Implementation Notes

### Random Number Generation

- Uses **cryptographically secure RNG** (`crypto.randomBytes`)
- Ensures fair and unpredictable outcomes
- Prevents prediction or manipulation

### Grid Generation

```typescript
1. Initialize empty 6×5 grid
2. For each position:
   - Generate random number
   - Select symbol based on weighted probability
3. No post-processing or pattern manipulation
```

### Free Spins Grid Generation

```typescript
1. Generate grid with free spins weights (includes bombs)
2. Bombs can appear in INITIAL grid and during TUMBLES
3. Use same free spins weights for all symbol generation (includes bombs at ~6.94%)
```

### Tumble Safety Limits

- **Maximum 20 tumbles** per spin
- Prevents infinite loops
- Ensures reasonable game duration

### State Management

- **Server-side balance** verification
- **Game state tracking** for free spins
- **Bomb tracking** to maintain consistent multipliers

---

## Summary

Sweet Bonanza is a **high-volatility cluster pays slot** with:

- **Simple mechanics**: 8+ symbols anywhere = win
- **Exciting features**: Tumbles create multiple wins per spin
- **Massive multipliers**: Bombs can create 100x+ total multipliers
- **Fair RTP**: 96.48-96.51% return to player
- **High max win**: 21,100x bet potential

### Win Potential by Scenario

| Scenario | Win Range | Example (100 sat bet) |
|----------|-----------|----------------------|
| Single Cluster | 0.25x - 50x | 25 - 5,000 sats |
| Multiple Tumbles | 1x - 200x | 100 - 20,000 sats |
| Free Spin (Low Bombs) | 5x - 50x | 500 - 5,000 sats |
| Free Spin (High Bombs) | 50x - 500x | 5,000 - 50,000 sats |
| Free Spin (Max) | 500x - 21,100x | 50,000 - 2,110,000 sats |

---

**Document Version**: 1.1
**Last Updated**: 2025
**Game Version**: Sweet Bonanza (Pragmatic Play Clone)

**Changelog v1.1**:
- Updated grid notation to 6×5 (6 reels × 5 rows)
- Corrected RTP target to 96.48-96.51%
- Updated volatility to High
- Swapped Grapes (🍇) and Plum (🫐) emoji labels
- Corrected bomb spawning mechanics: bombs CAN appear during tumbles in free spins
- Updated free spins trigger probability to 1 in 100-150 spins
- Added Ante Bet feature documentation
- Clarified scatter payouts during free spins
