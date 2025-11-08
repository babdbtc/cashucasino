# Quick Start Guide

Get your Cashu casino up and running in 5 minutes!

## Prerequisites

- Node.js 18+
- Cashu wallet with tokens from mint.minibits.cash (for testing and funding)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

The `.env.local` file is already set up, but you should:

1. **Generate a secure admin API key:**

```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

2. **Update `.env.local`:**

```env
ADMIN_API_KEY=your-generated-key-here
```

## Step 3: Fund the House Wallet

Before players can win, you need to fund the house wallet.

**Recommended initial funding: 50,000 sats**

### Get Funding Tokens

1. Open Minibits wallet (or another Cashu wallet)
2. Create a token for 50,000 sats from `mint.minibits.cash`
3. Copy the token string (starts with `cashuA...`)

### Fund the Wallet

**Option A: Using the script (Linux/Mac)**

```bash
./scripts/fund-wallet.sh 'cashuAeyJ0b2tlbiI6W3...' local
```

**Option B: Using curl**

```bash
curl -X POST http://localhost:3000/api/admin/wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -d '{"token": "cashuAeyJ0b2tlbiI6W3..."}'
```

You should see:
```json
{
  "message": "Wallet funded successfully",
  "added": 50000,
  "newBalance": 50000
}
```

## Step 4: Start the Dev Server

```bash
npm run dev
```

Visit: http://localhost:3000

## Step 5: Test the Casino

1. Go to the Slots page
2. Get a test token from your Cashu wallet (10-100 sats)
3. Select bet amount
4. Paste token
5. Click SPIN!

## Step 6: Monitor Your Wallet

**Check balance:**

```bash
# Linux/Mac
./scripts/check-wallet.sh local

# Windows PowerShell
.\scripts\check-wallet.ps1 -Local

# Or with curl
curl http://localhost:3000/api/admin/wallet \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

## Understanding the Flow

### When a Player LOSES (90% of the time):

```
1. Player submits 100 sats token
2. Your wallet receives 100 sats → Balance: +100 ✅
3. Player spins and loses
4. You keep the 100 sats! 💰
```

### When a Player WINS (10% of the time):

```
1. Player submits 100 sats token
2. Your wallet receives 100 sats → Balance: +100
3. Player spins and wins 200 sats
4. Your wallet pays out 200 sats → Balance: -200
5. Net: -100 sats this round
```

### Long Term (House Edge):

With 90% RTP and 10% house edge:

- **1000 spins @ 100 sats = 100,000 sats wagered**
- **Your expected profit: ~10,000 sats** (10% of wagers)

Due to variance, short-term results fluctuate, but long-term you'll profit ~10%.

## What's Next?

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deploying to your VPS at `gamble.babd.space`

### Wallet Management

See [WALLET_MANAGEMENT.md](./WALLET_MANAGEMENT.md) for:
- Detailed wallet operations
- Security best practices
- Monitoring and maintenance
- Withdrawing profits

### Security Checklist

Before going live:

- [ ] Change ADMIN_API_KEY to a secure random value
- [ ] Set up HTTPS with SSL certificate
- [ ] Configure Nginx rate limiting
- [ ] Set up automated wallet backups
- [ ] Test with small amounts first
- [ ] Monitor logs regularly

## Troubleshooting

### "Failed to verify token"

- Token may be invalid or already spent
- Ensure token is from mint.minibits.cash
- Generate a fresh token

### "Casino cannot pay winnings"

- House wallet balance is too low
- Fund the wallet using the admin API
- Recommended to keep balance > 50,000 sats

### "Too many requests"

- Rate limiting active (20 spins/min per IP)
- Wait 60 seconds and try again
- This prevents abuse

## Getting Cashu Tokens for Testing

See [GETTING_TOKENS.md](./GETTING_TOKENS.md) for detailed instructions on getting test tokens.

Quick version:
1. Download Minibits wallet
2. Fund it with Bitcoin
3. Create Cashu token from mint.minibits.cash
4. Use token to play

## Support

- **README**: [README.md](./README.md) - Full project overview
- **Deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md) - VPS setup
- **Wallet**: [WALLET_MANAGEMENT.md](./WALLET_MANAGEMENT.md) - Wallet operations
- **Tokens**: [GETTING_TOKENS.md](./GETTING_TOKENS.md) - How to get tokens

## File Structure

```
gamble.babd/
├── app/
│   ├── api/
│   │   ├── admin/wallet/    # Admin API (check/fund wallet)
│   │   └── slots/play/      # Game API
│   ├── slots/               # Slots game page
│   └── page.tsx             # Homepage
├── lib/
│   ├── wallet-manager.ts    # House wallet (YOUR MONEY!)
│   ├── slots.ts             # Game logic
│   └── rate-limiter.ts      # Anti-abuse
├── scripts/
│   ├── check-wallet.sh      # Check balance
│   └── fund-wallet.sh       # Fund wallet
├── .wallet/                 # Wallet data (NEVER COMMIT!)
└── [documentation files]
```

## Next Steps

1. ✅ **Test locally** with small amounts
2. ✅ **Monitor wallet balance** to see it grow
3. ✅ **Understand the house edge** (10% long-term profit)
4. 🚀 **Deploy to production** when ready

---

**Have fun and gamble responsibly!** (You're the house, so you always win in the long run 😉)
