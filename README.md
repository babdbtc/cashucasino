# Cashu Casino

**Someone hosted this at: [cashucasino.cc](https://cashucasino.cc)**

A privacy-focused online casino powered by Cashu ecash. Play provably fair casino games with Bitcoin through Cashu tokens - minimal registration, instant deposits/withdrawals, and complete transparency.

> **⚠️ WORK IN PROGRESS**: This project is under active development. Bugs may exist, and deposited funds could be irreversibly lost due to software errors or mint issues. **Only deposit amounts you are completely comfortable losing.** Use at your own risk.

## Features

### Authentication & Privacy
- **Nostr Login**: One-click authentication using your Nostr identity (Alby, nos2x, etc.) via NIP-07
- **Simple Account System**: Or create an account with just a 16-digit ID - no email, no password, no personal info
- **Privacy First**: No KYC, no tracking, minimal data collection
- **Cross-Tab Sync**: Your balance and wallet mode sync automatically across browser tabs

### Wallet & Payments
- **Dual Wallet System**:
  - **Demo Mode**: Play with test tokens from testnut.cashu.space
  - **Real Mode**: Play with real Bitcoin via mint.minibits.cash
- **Multiple Deposit Methods**:
  - **Lightning Network**: Generate invoice, scan QR code, pay with any Lightning wallet - automatically converts to Cashu tokens and credits your balance
  - **Cashu Tokens**: Paste Cashu token and start playing immediately
- **Multiple Withdrawal Methods**:
  - **Standard**: Generate Cashu token string to copy/paste into your wallet
  - **Nostr Instant Withdraw**: Automatic delivery to your Nostr wallet via encrypted DM (for Nostr-authenticated users)
  - **Nutzap Support**: Withdraw via Nostr zap protocol
- **Custodial**: Deposit funds to your account balance, play multiple games, withdraw anytime

### Games
- **Sweet Bonanza Slots**: 6x5 cluster pays slot with tumble mechanic, free spins, and multipliers (RTP: ~95.5%)
- **Plinko**: Drop the ball through 16 rows of pegs with three risk levels (Low/Medium/High) and multipliers up to 1000x
- **Blackjack**: Classic 21 with standard rules (Coming Soon)

### Provably Fair
- **Cryptographic RNG**: Uses Node.js `crypto.randomBytes()` for secure randomness
- **Open Source RTP Scripts**: All payout calculations available on GitHub
- **Transparent Mechanics**: Full game logic visible in source code

## Available Games

### Sweet Bonanza
- **Type**: 6x5 cluster pays slot with tumble mechanic
- **RTP**: ~95.5% (4.5% house edge)
- **Min Bet**: 5 sats
- **Max Bet**: 1000 sats
- **Features**:
  - **Cluster Pays**: Win with 8+ matching symbols anywhere on grid
  - **Tumble Mechanic**: Winning symbols disappear, new ones drop for consecutive wins
  - **Free Spins**: 4+ scatter symbols trigger 10 free spins
  - **Bomb Multipliers**: Random multipliers (2x-100x) in free spins mode
  - **Buy Feature**: Purchase 10 free spins for 100x bet
  - **Turbo Mode**: Speed up animations for faster gameplay
  - **Autoplay**: Up to 500 automatic spins with customizable settings

**Paytable** (8+ symbols):
- 🍬 Red Heart: 8-9 = 12x | 10-11 = 30x | 12+ = 60x
- 💜 Purple Candy: 8-9 = 10x | 10-11 = 25x | 12+ = 50x
- 💚 Green Candy: 8-9 = 8x | 10-11 = 20x | 12+ = 40x
- 💙 Blue Candy: 8-9 = 6x | 10-11 = 15x | 12+ = 30x
- 🍎 Apple: 8-9 = 4x | 10-11 = 10x | 12+ = 25x
- 🍇 Grapes: 8-9 = 3x | 10-11 = 8x | 12+ = 20x
- 🍉 Watermelon: 8-9 = 2x | 10-11 = 6x | 12+ = 15x
- 🫐 Blueberry: 8-9 = 1.5x | 10-11 = 4x | 12+ = 10x
- 🍌 Banana: 8-9 = 1x | 10-11 = 3x | 12+ = 8x
- 🍭 Scatter: 4+ triggers 10 free spins

### Plinko
- **Type**: Probability-based ball drop game
- **Rows**: 16 pegs, 17 multiplier slots
- **Risk Levels**:
  - **Low Risk**: Max 16x, safer middle slots
  - **Medium Risk**: Max 110x, balanced risk/reward
  - **High Risk**: Max 1000x, extreme edges
- **Min Bet**: 1 sat
- **Max Bet**: 1000 sats

**Multipliers**:
- Low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16]
- Medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110]
- High: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000]

## Authentication Methods

### Nostr Login (Recommended)

Cashu Casino integrates deeply with Nostr for seamless, privacy-preserving authentication and instant withdrawals.

**Requirements**:
- A Nostr browser extension (Alby, nos2x, Flamingo, etc.) that supports NIP-07
- Your Nostr public key (npub)

**How it works**:
1. Click "Login with Nostr" button
2. Extension prompts you to sign an auth event (NIP-98 HTTP Auth)
3. Your Nostr public key becomes your account identifier
4. Instant access - no passwords, no email verification

**Benefits**:
- One-click login across devices (if using same Nostr identity)
- Instant withdrawals to your Nostr wallet via encrypted DM
- Maximum privacy - Nostr is decentralized
- Future features: Social sharing, leaderboards, zaps

**Nostr Integration Details**:
- **NIP-07**: Browser extension interface for signing
- **NIP-98**: HTTP authentication using signed events
- **NIP-04**: Encrypted Direct Messages for withdrawal delivery
- **Relays**: Configurable relay list (defaults: relay.damus.io, relay.nostr.band, nos.lol)

### Account ID Login

**How to register**:
1. Click "Create Account"
2. Receive a unique 16-digit account ID (e.g., `ABCD-EFGH-IJKL-MNOP`)
3. **Save this ID** - it's your only way to log back in
4. No password, no email, no recovery mechanism

**Important**:
- Your account ID is both your username AND password
- Save it somewhere safe (password manager, encrypted note, etc.)
- Never share it with anyone
- If you lose it, your account is gone forever

## How to Deposit & Play

### Deposit Method 1: Lightning Network (Recommended)

The easiest way to deposit - works with any Lightning wallet!

**What you need**:
- Any Lightning Network wallet (Phoenix, Muun, Zeus, BlueWallet, etc.)
- Logged in to your casino account

**How it works**:
1. Create account or login with Nostr
2. Select wallet mode (Demo or Real)
3. Click any game → Open **Wallet** panel
4. Click **⚡ Lightning** tab (default)
5. Enter amount in sats (minimum 1 sat)
6. Click **Create Invoice**
7. Scan the QR code with your Lightning wallet, or copy the invoice string
8. Pay the invoice in your Lightning wallet
9. Wait a few seconds - the casino automatically detects payment
10. Balance updates automatically - ready to play!

**How it works behind the scenes**:
- Casino generates a Lightning invoice through the Cashu mint
- You pay the invoice with any Lightning wallet
- Once paid, the mint converts your Lightning payment to Cashu tokens
- Casino receives the Cashu tokens and credits your balance
- All automatic - no manual steps needed!

**Benefits**:
- Works with any Lightning wallet - no need for Cashu-specific wallet
- Automatic conversion from Lightning → Cashu → Balance
- QR code for easy mobile scanning
- Real-time payment detection with visual confirmation
- Secure and instant

### Deposit Method 2: Cashu Tokens

For users who already have Cashu tokens.

**Step 1: Get Cashu Tokens**

**For Real Mode (Bitcoin)**:
1. Download a Cashu wallet:
   - **Minibits** (mobile) - [minibits.cash](https://minibits.cash)
   - **eNuts** (mobile)
   - **Cashu.me** (web)
2. Add mint: `mint.minibits.cash`
3. Fund wallet via Lightning Network

**For Demo Mode (Testing)**:
1. Use any Cashu wallet
2. Add test mint: `testnut.cashu.space`
3. Get free test tokens from faucet

**Step 2: Deposit to Casino**

1. Create account or login with Nostr
2. Select wallet mode (Demo or Real)
3. Click any game → Open **Wallet** panel
4. Click **Cashu Token** tab
5. In your Cashu wallet app:
   - Select amount to send
   - Copy the token string (starts with `cashuA...`)
6. Paste token into casino deposit field
7. Click **Deposit** - balance updates instantly!

### Step 3: Play Games

1. Choose your game
2. Select bet amount (1-1000 sats)
3. Click **SPIN** / **DROP** / **PLAY**
4. Winnings automatically added to your balance
5. Play multiple times without re-depositing

## How to Withdraw

### Method 1: Standard Withdrawal (All Users)

1. Open **Wallet** panel
2. Click **Withdraw All** (or enter custom amount)
3. Click **Withdraw**
4. Casino generates Cashu token string
5. Copy the token
6. Open your Cashu wallet app
7. Paste token to receive funds

**Note**: Tokens are valid Cashu ecash that can be imported into any compatible wallet.

### Method 2: Nostr Instant Withdraw (Nostr Users Only)

**Requirements**: Logged in with Nostr

**How it works**:
1. Open **Wallet** panel
2. Click **⚡ Instant Withdraw to Nostr**
3. Enter amount (or click **Withdraw All**)
4. Click **Send to Nostr Wallet**
5. Casino sends encrypted DM to your Nostr public key with Cashu token

**Fallback**: If DM delivery fails, you'll receive the token as standard withdrawal

### Method 3: Nutzap Withdrawal (Coming Soon)

Withdraw using Nostr Zap protocol with Cashu tokens.

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Animations**: GSAP
- **Icons**: Emoji + SVG

### Backend
- **API**: Next.js API Routes (serverless)
- **Database**: SQLite (better-sqlite3)
- **Session**: HTTP-only cookies

### Payments
- **Protocol**: Cashu ecash (@cashu/cashu-ts v3.0.2)
- **Lightning Network**: NUT-04/NUT-05 mint quotes for Lightning ⇄ Cashu conversion
- **QR Codes**: qrcode.react for Lightning invoice display
- **Mints**:
  - Production: mint.minibits.cash
  - Testing: testnut.cashu.space

### Nostr
- **Library**: nostr-tools v2.17.2
- **Crypto**: @noble/secp256k1 for signing
- **Standards**: NIP-07, NIP-98, NIP-04

### Security
- **RNG**: Node.js crypto.randomBytes (CSPRNG)
- **Authentication**: JWT tokens in HTTP-only cookies
- **Encryption**: Nostr NIP-04 for DMs

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/babdbtc/cashucasino.git
cd gamble.babd
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment variables**:

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```bash
# Cashu Mint (choose one)
# For testing:
NEXT_PUBLIC_CASHU_MINT_URL=https://testnut.cashu.space
# For production:
# NEXT_PUBLIC_CASHU_MINT_URL=https://mint.minibits.cash/Bitcoin

# Game limits
MAX_BET_SATS=1000
MIN_BET_SATS=1

# Admin API key (generate with: openssl rand -hex 32)
ADMIN_API_KEY=your-secure-random-key-here

# Nostr Configuration (for instant withdrawals)
# Casino's Nostr private key in hex format
# Generate with: openssl rand -hex 32
# Or use a Nostr key generator
CASINO_NOSTR_PRIVATE_KEY=your-nostr-private-key-hex-here

# Optional: Custom Nostr relays (comma-separated)
# NOSTR_RELAYS=wss://relay.damus.io,wss://relay.nostr.band,wss://nos.lol
```

4. **Run development server**:
```bash
npm run dev
```

5. **Open browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## Security & Fairness

### Provably Fair Gaming
- **Cryptographic RNG**: All games use `crypto.randomBytes()` from Node.js
- **No Seed Manipulation**: Random numbers generated per-bet, impossible to predict
- **Open Source**: Full game logic available in `lib/` directory
- **RTP Verification**: Monte Carlo simulation scripts in `scripts/` folder

### Privacy Features
- **Minimal Data**: Only store account ID, balance, and optional Nostr pubkey
- **No Tracking**: No analytics, no cookies (except auth session)
- **Cashu Privacy**: Ecash protocol provides sender/receiver anonymity
- **Local Storage**: Wallet data never leaves your browser

### Payment Security
- **Token Verification**: All Cashu tokens verified with mint before accepting
- **Double-Spend Prevention**: Tokens redeemed immediately upon receipt
- **Atomic Operations**: Balance updates are transactional
- **Withdrawal Protection**: Withdrawals deduct balance atomically

### Nostr Security
- **NIP-98 Auth**: Challenge-response prevents replay attacks
- **Encrypted DMs**: NIP-04 encryption for withdrawal token delivery
- **Key Management**: Casino's private key stored server-side only
- **Relay Redundancy**: Multiple relays for reliability

### Rate Limiting
- API endpoints rate-limited to prevent abuse
- Balance updates validated server-side
- Bet limits enforced (1-1000 sats)

## Lightning Deposit Implementation

The Lightning deposit feature allows users to deposit Bitcoin via any Lightning Network wallet, with automatic conversion to Cashu tokens and balance crediting.

### Architecture

**Flow**: Lightning Payment → Cashu Mint → Cashu Tokens → User Balance

1. User requests deposit amount
2. Casino creates Lightning invoice via Cashu mint (NUT-04)
3. User pays invoice with any Lightning wallet
4. Casino polls mint to check payment status (NUT-05)
5. Once paid, mint converts Lightning → Cashu tokens
6. Casino mints tokens and credits user balance
7. All automatic - no manual token handling needed

### Database Schema

**`lightning_deposits` Table**:
```sql
CREATE TABLE lightning_deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  quote_id TEXT UNIQUE NOT NULL,      -- Mint quote identifier
  amount INTEGER NOT NULL,             -- Amount in sats
  invoice TEXT NOT NULL,               -- Lightning invoice (BOLT11)
  state TEXT NOT NULL DEFAULT 'UNPAID', -- UNPAID, PAID, EXPIRED
  expiry INTEGER NOT NULL,             -- Unix timestamp
  wallet_mode TEXT DEFAULT 'demo',     -- demo or real
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### API Endpoints

**`POST /api/balance/deposit-lightning`** - Create Lightning invoice
- **Auth**: Required (session-based)
- **Rate Limit**: 10 requests per minute per IP
- **Input**: `{ amount: number }` (minimum 1 sat)
- **Output**: `{ quoteId, invoice, amount, expiry, state }`
- **Function**: Creates Lightning invoice via `wallet.createMintQuote()`
- **Storage**: Stores invoice in `lightning_deposits` table

**`POST /api/balance/deposit-lightning-claim`** - Check payment and credit balance
- **Auth**: Required (session-based)
- **Rate Limit**: 20 requests per minute per IP (allows polling)
- **Input**: `{ quoteId: string }`
- **Output**: `{ success, paid, amount?, newBalance? }`
- **Function**:
  1. Checks payment status via `wallet.checkMintQuote()`
  2. If paid, mints tokens via `wallet.mintProofs()`
  3. Credits user balance atomically
  4. Updates database state to 'PAID'
- **Polling**: Frontend checks every 3 seconds until payment confirmed

### Core Functions (`lib/wallet-manager.ts`)

**`createLightningInvoice(amount, mode)`**
```typescript
// Creates Lightning invoice via Cashu mint
const mintQuote = await wallet.createMintQuote(amount);
return {
  quoteId: mintQuote.quote,      // Unique quote identifier
  invoice: mintQuote.request,     // BOLT11 invoice string
  expiry: mintQuote.expiry,       // Unix timestamp
  state: mintQuote.state          // UNPAID, PAID, etc.
};
```

**`checkLightningPayment(quoteId, mode)`**
```typescript
// Checks if Lightning invoice has been paid
const quoteStatus = await wallet.checkMintQuote(quoteId);
return {
  paid: quoteStatus.state === "PAID",
  state: quoteStatus.state,
  expiry: quoteStatus.expiry
};
```

**`mintFromLightning(amount, quoteId, mode)`**
```typescript
// Mints Cashu tokens from paid Lightning invoice
const mintedProofs = await wallet.mintProofs(amount, quoteId);
// Adds proofs to house wallet storage
// Returns amount minted
```

### Frontend Implementation

**Location**: `components/WalletPanel.tsx`

**Features**:
- Tab-based UI (Lightning / Cashu Token)
- QR code display for easy mobile scanning
- Real-time payment polling (3-second intervals)
- Loading spinner while waiting for payment
- Success confirmation with checkmark animation
- Auto-close after payment confirmed
- Invoice copy-to-clipboard functionality

**State Management**:
```typescript
const [depositMethod, setDepositMethod] = useState<"cashu" | "lightning">("lightning");
const [lightningInvoice, setLightningInvoice] = useState("");
const [checkingPayment, setCheckingPayment] = useState(false);
const [paymentConfirmed, setPaymentConfirmed] = useState(false);
```

**Payment Detection Flow**:
1. User clicks "Create Invoice"
2. Invoice generated and QR code displayed
3. Polling starts (every 3 seconds)
4. When paid, `paymentConfirmed` set to true
5. Success animation shown
6. Balance updated
7. Modal auto-closes after 3 seconds

### Security Considerations

- **Rate Limiting**: Invoice creation (10/min) and claim checks (20/min) to prevent abuse
- **Authentication**: All endpoints require valid session
- **Ownership Verification**: Quote ID must belong to requesting user
- **Atomic Operations**: Balance updates use existing transaction-safe `addToBalance()`
- **Double-Credit Prevention**: Database checks if quote already paid before minting
- **Expiry Handling**: Expired invoices automatically marked and cleaned up
- **Error Recovery**: Critical errors logged for manual intervention if needed

### Cleanup & Maintenance

- **Expired Invoices**: Automatically deleted hourly if unpaid and past expiry
- **Abandoned Checks**: Frontend stops polling after 10 minutes
- **Database Indexes**: Optimized for fast quote lookups

### Testing

**Demo Mode**:
- Uses `testnut.cashu.space` mint
- Test Lightning payments (may require test Lightning wallet)

**Real Mode**:
- Uses `mint.minibits.cash` mint
- Real Bitcoin Lightning payments

### Error Handling

- **Invoice Creation Failure**: Returns 500 with user-friendly error
- **Payment Check Failure**: Returns 500, frontend continues polling
- **Minting Failure**: Critical error logged, support notified
- **Balance Credit Failure**: Critical error logged with quote ID for recovery

## RTP Transparency

All games have their RTP (Return to Player) calculated and verified through Monte Carlo simulations.

### Simulation Scripts

Located in `scripts/` directory:
- `simulate-bonanza.ts` - Sweet Bonanza RTP analysis
- `simulate-buy-freespins.ts` - Free spins purchase ROI
- `README-SIMULATION.md` - Full documentation

**Run simulations**:
```bash
npx tsx scripts/simulate-bonanza.ts
```

### Current RTPs
- **Sweet Bonanza**: ~95.5% (4.5% house edge)
- **Plinko**: Varies by risk level (theoretical)

**Transparency**: All RTP calculations are open-source on GitHub.

## Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed VPS deployment instructions.

**Quick overview**:
1. Build the app: `npm run build`
2. Use PM2 for process management
3. Configure Nginx as reverse proxy
4. Set up SSL with Let's Encrypt
5. Configure production environment variables
6. Initialize SQLite database

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly (run simulations if changing game logic)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add comments for complex logic
- Update RTP simulations if changing game mechanics
- Test all payment flows (deposit/withdraw)
- Verify Nostr integration works with multiple extensions

## Roadmap

- [x] Sweet Bonanza Slots with tumble mechanic
- [x] Plinko with 3 risk levels
- [x] Nostr authentication (NIP-07, NIP-98)
- [x] Nostr instant withdrawals (NIP-04)
- [x] Dual wallet system (Demo/Real)
- [x] Account ID auth system
- [x] RTP simulation tools
- [x] Cross-tab balance sync
- [x] Turbo mode & autoplay
- [x] Lightning Network deposits with QR codes
- [ ] Blackjack (in progress)
- [ ] Roulette
- [ ] Dice game
- [ ] Game history/statistics
- [ ] Provably fair verification UI
- [ ] Multi-mint support
- [ ] Social features (Nostr leaderboards)
- [ ] Mobile PWA
- [ ] Nutzap withdrawals
- [ ] More Sweet Bonanza features

## Documentation

For detailed guides and documentation, see the **[docs/](./docs/)** folder:
- [Quick Start Guide](./docs/QUICKSTART.md)
- [Getting Cashu Tokens](./docs/GETTING_TOKENS.md)
- [Withdrawal Guide](./docs/WITHDRAWAL_GUIDE.md)
- [Nostr Integration](./docs/NOSTR_INTEGRATION.md)
- [Sweet Bonanza Mechanics](./docs/SWEET_BONANZA_MECHANICS.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Wallet Management](./docs/WALLET_MANAGEMENT.md)
- [Security Analysis](./docs/SECURITY_ANALYSIS.md)
- [RTP Simulation Scripts](./scripts/README-SIMULATION.md)

## Support

For issues or questions:
- [Open an issue on GitHub](https://github.com/babdbtc/cashucasino/issues)
- Browse the [documentation folder](./docs/) for detailed guides
- Contact via Nostr: [npub1d3h6cxpz9y9f20c5rg08hgadjtns4stmyqw75q8spssdp46r635q33wvj0](https://njump.me/npub1d3h6cxpz9y9f20c5rg08hgadjtns4stmyqw75q8spssdp46r635q33wvj0)

## License

MIT License - see [LICENSE](./LICENSE) file for details

## Acknowledgments

- [Cashu Protocol](https://cashu.space/) - Privacy-preserving ecash
- [Minibits](https://minibits.cash/) - Mint infrastructure
- [Nostr](https://nostr.com/) - Decentralized protocol
