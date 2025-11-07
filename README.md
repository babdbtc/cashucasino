# Babd's Cashu Online Casino

A no-account, privacy-focused online casino powered by Cashu ecash. Play casino games instantly with Bitcoin through Cashu tokens - no registration, no deposits, no personal information required.

## Features

- **💜 Login with Nostr**: One-click authentication using your npub (Alby, nos2x, etc.)
- **⚡ Instant Withdrawals**: Send funds directly to your Nostr wallet via encrypted DM
- **No Accounts Required**: Play instantly with Cashu tokens or Nostr login
- **Dual Wallet System**: Choose between Demo mode (test tokens) or Real mode (Bitcoin)
- **Privacy First**: No email, no KYC, no personal information collected
- **Provably Fair**: Cryptographically secure random number generation
- **Instant Payouts**: Win payouts automatically credited to your balance
- **Non-Custodial**: You control your funds - withdraw anytime

## Available Games

- **Slots**: 3x3 slot machine with 90% RTP, max bet 1000 sats
- **Roulette**: Coming soon
- **Blackjack**: Coming soon

## Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Payment**: Cashu ecash protocol (@cashu/cashu-ts)
- **Mint**: mint.minibits.cash
- **RNG**: Node.js crypto.randomBytes for secure randomness

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- A Cashu wallet with tokens from mint.minibits.cash

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd gamble.babd
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file (already included):
```bash
NEXT_PUBLIC_CASHU_MINT_URL=https://mint.minibits.cash/Bitcoin
MAX_BET_SATS=1000
MIN_BET_SATS=1
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## How to Play

### With Browser Wallet (Recommended)

1. **Get Cashu Tokens**: Use a Cashu-compatible wallet (like Minibits) to obtain tokens from mint.minibits.cash
2. **Select a Game**: Choose from available games on the homepage
3. **Deposit to Browser Wallet**: Click "Deposit" and paste your Cashu token - funds are stored locally in your browser
4. **Select Bet Amount**: Use the slider to choose your bet (1-1000 sats)
5. **Play**: Click "SPIN" - funds are automatically deducted from your browser wallet
6. **Auto-Receive Winnings**: If you win, winnings are automatically added to your browser wallet
7. **Withdraw Anytime**: Click "Withdraw" to get a Cashu token with your remaining balance

**Browser Wallet Benefits**:
- Deposit once, play many times
- No need to paste tokens for every spin
- Automatic payment and payout handling
- Withdraw your balance anytime
- Stored locally in your browser (non-custodial)

**Important**: Your wallet is stored in browser localStorage. Clearing cookies/site data will erase your wallet. Always withdraw before clearing browser data!

## Game Details

### Slots

- **Type**: 3x3 slot machine
- **RTP**: 90% (10% house edge)
- **Min Bet**: 1 sat
- **Max Bet**: 1000 sats
- **Payline**: Middle row only

**Paytable**:
- 7️⃣ 7️⃣ 7️⃣ = 777x (JACKPOT!)
- 💎 💎 💎 = 150x
- 🔔 🔔 🔔 = 40x
- 🍊 🍊 🍊 = 20x
- 🍋 🍋 🍋 = 13x
- 🍒 🍒 🍒 = 8x

**Verified RTP: 90.4%** (9.6% house edge)

## Architecture

### Frontend
- Next.js App Router with React 18
- Client-side game UI components
- **Browser Wallet**: `lib/browser-wallet.ts` - localStorage-based Cashu wallet
- **Wallet Panel**: `components/WalletPanel.tsx` - Deposit/withdraw UI
- **Slot Machine**: `components/SlotMachine.tsx` - Auto-payment integration

### Backend API
- `/api/slots/play`: Accepts Cashu token and bet amount, executes game, returns results
- `/api/admin/wallet`: Admin API for wallet management (protected)
- `/api/admin/withdraw`: Admin withdrawal endpoint

### Game Logic
- `lib/slots.ts`: Slot machine mechanics, RTP calculation, RNG
- `lib/wallet-manager.ts`: Persistent house wallet management (server-side)
- `lib/browser-wallet.ts`: Browser-based player wallet (client-side)
- `lib/rate-limiter.ts`: Anti-abuse rate limiting

### Browser Wallet Architecture

The browser wallet provides a seamless UX while maintaining privacy:

**Client-Side (Browser)**:
1. `BrowserCashuWallet` class stores Cashu proofs in localStorage
2. User deposits token → Proofs extracted and stored locally
3. User clicks spin → Wallet creates bet token from stored proofs
4. User wins → Payout token automatically added to wallet
5. User withdraws → All proofs encoded into Cashu token

**Server-Side**:
- Sees individual anonymous tokens per spin
- Cannot link multiple spins together
- Never stores user data or session info

**Privacy**: Each spin appears as an independent transaction from a different user

### Cashu Integration & House Wallet

The casino uses a **persistent house wallet** to manage all funds:

1. **Player places bet**: Client submits Cashu token to API
2. **Token verification**: API verifies token with mint.minibits.cash
3. **Collect bet**: Token is received into house wallet (casino's money now!)
4. **Game execution**: Cryptographically secure RNG determines outcome
5. **Payout (if win)**: New tokens sent from house wallet balance
6. **Casino profit**: Due to 90% RTP, house wallet grows with 10% edge

**Key Files:**
- `lib/wallet-manager.ts`: House wallet operations
- `.wallet/`: Persistent wallet storage (NEVER commit!)
- `WALLET_MANAGEMENT.md`: Complete wallet management guide

See [WALLET_MANAGEMENT.md](./WALLET_MANAGEMENT.md) for detailed wallet setup and monitoring.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed VPS deployment instructions.

Quick summary:
1. Build the app: `npm run build`
2. Use PM2 for process management
3. Configure Nginx as reverse proxy
4. Set up SSL with Let's Encrypt
5. Deploy to gamble.babd.space

## Security & Fairness

- **RNG**: Uses Node.js `crypto.randomBytes()` for cryptographically secure randomness
- **Token Verification**: All tokens verified with mint before game execution
- **Double-Spend Prevention**: Tokens redeemed immediately upon receipt
- **Non-Custodial**: Browser wallet stored locally - you control your private keys (proofs)
- **Privacy**: Server cannot link spins together; each bet appears anonymous
- **Rate Limiting**: 20 requests per minute per IP to prevent abuse
- **Browser Wallet Security**:
  - Proofs stored in localStorage only
  - Never transmitted except during game play
  - Automatic refund on API errors
  - Clear data warning displayed to users

## Legal Disclaimer

**WARNING**: Online gambling may be illegal in your jurisdiction. This software is provided for educational purposes only. The operators are responsible for ensuring compliance with all applicable laws and regulations. Users must be of legal gambling age in their jurisdiction.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Roadmap

- [x] Slots game with 90.4% RTP
- [x] Browser-based Cashu wallet
- [x] Auto-payment and payout system
- [ ] Roulette game
- [ ] Blackjack game
- [ ] Game statistics/history
- [ ] Provably fair verification UI
- [ ] Multi-mint support
- [ ] Mobile app (PWA)

## Support

For issues or questions:
- Open an issue on GitHub
- Check the deployment guide for troubleshooting

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [Cashu Protocol](https://cashu.space/) for the ecash implementation
- [Minibits](https://minibits.cash/) for the mint infrastructure
- The Bitcoin and Lightning communities

---

**Play responsibly. Never gamble more than you can afford to lose.**
