# Withdrawal Guide

## How Withdrawals Work

### For Players (Winning) 🎰

**Already implemented and automatic!**

When a player wins, the game automatically:
1. Generates a Cashu token with their winnings
2. Returns it in the API response
3. Displays it in the UI with a "Copy Token" button

**Player steps:**
1. Play and win
2. Copy the payout token from the UI
3. Open their Cashu wallet (Minibits, etc.)
4. Paste token → Receive funds
5. Done! Money is in their wallet

---

### For Casino Owner (Profits) 💰

You need to withdraw accumulated profits from the house wallet to your personal Cashu wallet.

## Quick Withdrawal

### Option 1: Using Scripts (Easiest)

**On Windows (PowerShell):**
```powershell
.\scripts\withdraw.ps1 -Amount 10000 -Local
```

**On Linux/Mac:**
```bash
./scripts/withdraw.sh 10000 local
```

Replace `10000` with the amount you want to withdraw in sats.

**What happens:**
1. Script calls the withdrawal API
2. Creates a Cashu token with your requested amount
3. Displays the token
4. You copy it into your personal Cashu wallet
5. Done!

**Example output:**
```
✅ WITHDRAWAL SUCCESSFUL!

Your Cashu token:
cashuAeyJ0b2tlbiI6W3sicHJvb2Zz...

Copy this token and paste it into your Cashu wallet!
```

### Option 2: Using API Directly

**Withdraw 10,000 sats:**

```bash
curl -X POST http://localhost:3000/api/admin/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -d '{"amount": 10000}'
```

**Response:**
```json
{
  "message": "Withdrawal successful",
  "token": "cashuAeyJ0b2tlbiI6W3...",
  "amount": 10000,
  "newBalance": 42000
}
```

**Then:**
1. Copy the `token` value
2. Open your Cashu wallet (Minibits)
3. Go to "Receive" → Paste token
4. Funds appear in your wallet!

---

## Withdrawal Workflow Example

Let's say you've been running the casino for a week:

### Step 1: Check Your Balance

```bash
# Windows
.\scripts\check-wallet.ps1 -Local

# Linux/Mac
./scripts/check-wallet.sh local
```

**Output:**
```json
{
  "balance": 52450,
  "proofCount": 15,
  "lastUpdated": "2025-01-10T15:30:00.000Z"
}
```

You have **52,450 sats** accumulated!

### Step 2: Decide How Much to Withdraw

**Keep some balance in the house wallet** to pay winners. Recommended:
- Keep at least 20,000-50,000 sats for operations
- Withdraw excess profits

**Example:**
- Balance: 52,450 sats
- Keep: 30,000 sats (buffer for payouts)
- Withdraw: 22,450 sats (your profit!)

### Step 3: Withdraw Your Profits

```bash
# Windows
.\scripts\withdraw.ps1 -Amount 22450 -Local

# Linux/Mac
./scripts/withdraw.sh 22450 local
```

### Step 4: Receive in Your Wallet

1. Copy the token from the output
2. Open Minibits (or your Cashu wallet)
3. Go to "Receive"
4. Paste the token
5. Money received! ✅

### Step 5: Verify New Balance

```bash
.\scripts\check-wallet.ps1 -Local
```

**Output:**
```json
{
  "balance": 30000,
  "proofCount": 8
}
```

Perfect! You withdrew 22,450 sats, and 30,000 sats remain for operations.

---

## Withdrawal Best Practices

### 1. Keep Operational Buffer

**Never withdraw everything!**

Keep enough in the house wallet to pay winners:
- **Minimum recommended:** 20,000 sats
- **Comfortable:** 50,000+ sats
- **High traffic:** 100,000+ sats

**Why?** If the house wallet runs out, you can't pay winners and the casino stops working.

### 2. Regular Withdrawals

**Withdraw profits regularly:**
- Daily if high volume
- Weekly for moderate traffic
- Monthly for low traffic

**Benefits:**
- Reduce risk (less money sitting in hot wallet)
- Track your profits
- Keep the house wallet lean

### 3. Calculate Your Profits

Before withdrawing, understand your profit:

```
Total Balance - Initial Funding - Operating Buffer = Withdrawable Profit
```

**Example:**
- Current balance: 75,000 sats
- Initial funding: 50,000 sats
- Operating buffer: 30,000 sats
- **Profit you can withdraw:** 75,000 - 50,000 - 30,000 = **-5,000** (wait for more profit!)

Or:

- Current balance: 120,000 sats
- Initial funding: 50,000 sats
- Operating buffer: 30,000 sats
- **Profit you can withdraw:** 120,000 - 50,000 - 30,000 = **40,000 sats** ✅

### 4. Track Your Withdrawals

Keep a log of withdrawals for accounting:

```
Date         | Amount  | Balance After
-------------|---------|---------------
2025-01-10   | 20,000  | 55,000
2025-01-17   | 15,000  | 62,000
2025-01-24   | 25,000  | 50,000
```

---

## Troubleshooting

### "Insufficient balance" error

**Problem:** Trying to withdraw more than the house wallet has.

**Solution:**
```bash
# Check current balance
.\scripts\check-wallet.ps1 -Local

# Withdraw a smaller amount
```

### "Token already spent" error

**Cause:** You're trying to import the same token twice into your wallet.

**Solution:** Each withdrawal creates a NEW token. Only use fresh tokens.

### Can't find the withdrawal scripts

**Solution:**
```bash
# Make sure you're in the project directory
cd /path/to/gamble.babd

# Make scripts executable (Linux/Mac)
chmod +x scripts/*.sh
```

### Wallet balance not updating after withdrawal

**Cause:** The wallet file might not have saved properly.

**Solution:**
```bash
# Check the actual file
cat .wallet/balance.json

# Restart the server
# Stop with Ctrl+C
npm run dev
```

---

## Security Notes

### Protect Your Withdrawal Tokens

⚠️ **Withdrawal tokens are like cash!**

- Don't share them publicly
- Don't paste them in public channels
- Copy them directly into your wallet
- Delete them from clipboard after use

### Protect Your Admin API Key

🔒 **Anyone with your admin key can withdraw!**

- Keep `ADMIN_API_KEY` secret
- Never commit it to git
- Rotate it regularly
- Use a strong random key

### Secure Your .wallet/ Directory

💰 **This directory contains your money!**

```bash
# Set strict permissions (Linux/Mac)
chmod 700 .wallet

# Backup regularly
cp -r .wallet .wallet-backup-$(date +%Y%m%d)

# Never commit to git (already in .gitignore)
```

---

## API Reference

### POST /api/admin/withdraw

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_API_KEY
Content-Type: application/json
```

**Body:**
```json
{
  "amount": 10000
}
```

**Success Response (200):**
```json
{
  "message": "Withdrawal successful",
  "token": "cashuAeyJ0b2tlbiI6W3...",
  "amount": 10000,
  "newBalance": 42000
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**400 Insufficient Balance:**
```json
{
  "error": "Insufficient balance. Available: 5000 sats, Requested: 10000 sats",
  "currentBalance": 5000
}
```

**400 Invalid Amount:**
```json
{
  "error": "Invalid amount. Must be a positive number."
}
```

---

## Summary

### For Players (Automatic)
✅ Win → Get token → Paste in wallet → Done

### For Casino Owner (You)
1. Check balance: `.\scripts\check-wallet.ps1 -Local`
2. Withdraw profit: `.\scripts\withdraw.ps1 -Amount 10000 -Local`
3. Copy token
4. Paste in your Cashu wallet
5. Receive funds
6. Profit! 💰

**Keep 20k-50k sats in the house wallet for operations, withdraw the rest regularly!**
