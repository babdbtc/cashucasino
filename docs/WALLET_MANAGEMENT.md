# House Wallet Management Guide

## Overview

The casino uses a **persistent house wallet** to manage all player funds. This ensures:
- ✅ **You collect 100% of player losses** - All bets go into your house wallet
- ✅ **Secure payout system** - Winnings are paid from your accumulated balance
- ✅ **No user scams** - Tokens are verified and immediately redeemed
- ✅ **Complete control** - You control the wallet and can withdraw profits anytime

## How It Works

```
Player Loses:
  Player Token → House Wallet (+sats) → Your Profit! 💰

Player Wins:
  House Wallet (-sats) → Payout Token → Player Receives
```

**Net Effect**: Due to 90% RTP (10% house edge), the house wallet grows over time with your profits.

## Initial Setup

### Step 1: Generate Admin API Key

Generate a secure random key for admin access:

```bash
# Linux/Mac
openssl rand -hex 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Add it to `.env.local`:
```bash
ADMIN_API_KEY=your-generated-key-here
```

### Step 2: Fund the House Wallet

The house wallet needs initial funding to pay out early winners. You need to add Cashu tokens to start.

**Recommended Initial Funding**: 50,000 - 100,000 sats

This ensures you can pay winners while the house edge builds up your balance.

#### Get Funding Tokens

1. Use Minibits wallet or another Cashu wallet
2. Create a token for 50,000 sats from mint.minibits.cash
3. Copy the token string

#### Initialize the Wallet

Use the admin API to fund the wallet:

```bash
curl -X POST http://localhost:3000/api/admin/wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -d '{"token": "cashuAeyJ0b2tlbiI6W3..."}'
```

**Response:**
```json
{
  "message": "Wallet funded successfully",
  "added": 50000,
  "newBalance": 50000
}
```

## Monitoring Your Wallet

### Check Balance

```bash
curl http://localhost:3000/api/admin/wallet \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

**Response:**
```json
{
  "balance": 52450,
  "proofCount": 12,
  "lastUpdated": "2025-01-10T15:30:00.000Z",
  "status": "ok"
}
```

### What to Monitor

1. **Balance**: Your current house wallet balance in sats
2. **Proof Count**: Number of Cashu proofs stored (grows as players lose)
3. **Last Updated**: When the wallet was last used

### Server Logs

Watch the console logs to see real-time activity:

```bash
pm2 logs gamble-babd
```

You'll see:
```
[Casino] Collected bet of 100 sats from player
[House Wallet] Received 100 sats. New balance: 52550
[Casino] Player lost 100 sats. House profit!
```

Or:
```
[Casino] Paid out 200 sats to player
[House Wallet] Sent 200 sats. New balance: 52350
```

## Withdrawing Your Profits

When you want to withdraw profits from the house wallet:

### Option 1: Use Admin API (Coming Soon)

We'll add a withdraw endpoint that lets you extract tokens.

### Option 2: Direct File Access

The wallet stores proofs in `.wallet/proofs.json`. You can:

1. **View the balance**:
```bash
cat .wallet/balance.json
```

2. **Extract proofs manually** from `.wallet/proofs.json`
3. **Import them into your personal Cashu wallet**

### Option 3: Automated Withdrawal Script (Coming Soon)

We'll create a script to automatically withdraw profits above a threshold.

## Security Best Practices

### 🔒 Critical Security Measures

1. **Protect the `.wallet/` directory**
   - ✅ Already excluded from git
   - Set strict file permissions: `chmod 700 .wallet`
   - Only root/admin should access this directory

2. **Protect your Admin API Key**
   - Never commit to git
   - Store securely (use environment variables)
   - Rotate regularly

3. **Protect the server**
   - Use firewall rules
   - Only allow trusted IPs to access admin endpoints
   - Use HTTPS in production

4. **Regular Backups**
   ```bash
   # Backup wallet daily
   cp -r .wallet .wallet-backup-$(date +%Y%m%d)
   ```

5. **Monitor for Anomalies**
   - Sudden balance drops
   - Unusually large payouts
   - High rate of wins (should be ~90% of bets due to RTP)

### 🚨 What Could Go Wrong & How to Prevent

| Risk | How It's Prevented | Additional Steps |
|------|-------------------|------------------|
| **User submits fake token** | Tokens verified with mint.minibits.cash before acceptance | None needed |
| **User reuses token (double spend)** | Mint rejects already-spent tokens | None needed |
| **User drains wallet with wins** | Rate limiting (20 spins/min per IP) + max bet limit | Monitor unusual win patterns |
| **Wallet file deleted** | N/A | **BACKUP REGULARLY!** |
| **Server compromised** | File permissions + firewall | Use proper server security |
| **Insufficient balance for payout** | Balance checked before every payout | Keep wallet funded |

## Rate Limiting

**Current limits:**
- 20 spins per minute per IP address
- Prevents rapid-fire spam attacks
- Users see "Too many requests" error if exceeded

**Adjust limits** in `lib/rate-limiter.ts` if needed.

## Wallet File Structure

```
.wallet/
├── proofs.json      # All Cashu proofs (your money!)
└── balance.json     # Quick balance reference
```

**proofs.json structure:**
```json
{
  "proofs": [
    {
      "id": "00ad268db798",
      "amount": 2,
      "secret": "...",
      "C": "..."
    }
  ],
  "balance": 52450,
  "lastUpdated": "2025-01-10T15:30:00.000Z"
}
```

## Troubleshooting

### "Insufficient house balance" error

**Cause**: Wallet doesn't have enough sats to pay a winner

**Solution**: Fund the wallet using the admin API

```bash
curl -X POST http://localhost:3000/api/admin/wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -d '{"token": "YOUR_FUNDING_TOKEN"}'
```

### Wallet balance seems wrong

**Check actual proofs:**
```bash
cat .wallet/proofs.json | grep '"amount"' | awk '{sum+=$2} END {print sum}'
```

### Lost wallet access

**If you have backups:**
```bash
cp -r .wallet-backup-20250110 .wallet
```

**If no backups:**
- Wallet funds are lost (this is why backups are critical!)
- Restart with new funding

## Expected Behavior

### Normal Operations

With 90% RTP and 10% house edge:

- **Short term**: Balance fluctuates (players might win big)
- **Long term**: Balance grows at ~10% of total bets

**Example:**
- 1000 spins @ 100 sats each = 100,000 sats wagered
- Expected house profit: ~10,000 sats
- Your balance should grow by roughly 10,000 sats

### Variance

Due to randomness:
- Some days you might lose money (variance)
- Some days you'll win more than expected
- Over thousands of spins, you'll trend toward 10% profit

## Daily Checklist

1. ✅ Check wallet balance
2. ✅ Review server logs for anomalies
3. ✅ Verify no unusual win patterns
4. ✅ Backup wallet files
5. ✅ Check that balance is growing appropriately

## Monthly Tasks

1. Calculate total profit
2. Withdraw excess profits to personal wallet
3. Rotate admin API key
4. Review and adjust max bet limits if needed

## Getting Help

If you notice:
- Consistent losses (should be impossible long-term)
- Balance not growing despite many bets
- Unusual payout patterns

Check:
1. Server logs for errors
2. Wallet file integrity
3. Game logic RTP (should be ~90%)

---

**Remember**: The house edge guarantees long-term profit. Short-term variance is normal. Keep the wallet funded and monitor regularly!
