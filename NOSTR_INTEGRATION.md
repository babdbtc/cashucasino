# 💜 Nostr + Cashu Integration Guide

This casino features **native Nostr integration** for seamless, privacy-first authentication and instant Cashu token transfers via encrypted Nostr DMs.

---

## 🌟 Features

### 1. **Login with Nostr** (NIP-07)
- One-click authentication using browser extensions (Alby, nos2x, Nostur, etc.)
- No email, no password, no KYC - just your npub
- Automatic account creation for new users
- Persistent sessions across devices

### 2. **Instant Withdrawals via Nostr DM** (NIP-44)
- Withdraw funds directly to your Nostr wallet
- Tokens sent via encrypted DMs (end-to-end encrypted with NIP-44)
- No copy-pasting required!
- Automatic fallback if DM delivery fails

### 3. **Privacy-First**
- No personal information required
- Your npub is your identity
- All token transfers encrypted
- Compatible with any Nostr-enabled Cashu wallet

---

## 🚀 Quick Start

### For Users

#### 1. Install a Nostr Extension
Choose one of these browser extensions:
- **[Alby](https://getalby.com)** (Recommended - includes built-in wallet)
- **[nos2x](https://github.com/fiatjaf/nos2x)** (Lightweight)
- **[Nostur](https://nostur.com)** (iOS/macOS)
- **[Amethyst](https://github.com/vitorpamplona/amethyst)** (Android)

#### 2. Login with Nostr
1. Visit the casino
2. Click **"Login with Nostr"** 💜
3. Your extension will ask you to sign a message
4. Approve the signature
5. You're logged in! (Account auto-created if new)

#### 3. Play & Withdraw
1. Play games with your demo balance (10,000 sats to start)
2. Switch to "Real" mode when ready
3. Click **"Instant Withdraw to Nostr"** ⚡
4. Enter amount → Confirm
5. Check your Nostr DMs for the Cashu token!

---

### For Developers

#### Prerequisites
```bash
npm install nostr-tools @noble/secp256k1
```

#### Environment Setup
```bash
# Generate a Nostr keypair for the casino
# Option 1: Use nostrtool.com
# Option 2: Use nostr-tools
node -e "const { generateSecretKey, getPublicKey } = require('nostr-tools'); const sk = generateSecretKey(); console.log('Private Key (hex):', Buffer.from(sk).toString('hex')); console.log('Public Key (hex):', getPublicKey(sk));"

# Add to .env.local
CASINO_NOSTR_PRIVATE_KEY=your_hex_private_key_here

# Optional: Custom Nostr relays
NOSTR_RELAYS=wss://relay.damus.io,wss://relay.nostr.band,wss://nos.lol
```

#### Start the Server
```bash
npm run dev
```

---

## 🔧 Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│  ┌────────────────┐         ┌──────────────────────┐       │
│  │ Nostr Extension│◄────────┤  Login with Nostr    │       │
│  │  (Alby/nos2x)  │ NIP-07  │  Button              │       │
│  └────────────────┘         └──────────────────────┘       │
└───────────────────────────────┬─────────────────────────────┘
                                │ Signed Event (NIP-98)
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Casino Server (Next.js)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/auth/nostr-login                                │  │
│  │  - Verify Nostr signature                             │  │
│  │  - Create/login user by npub                          │  │
│  │  - Return session cookie                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/balance/withdraw-nostr                          │  │
│  │  1. Deduct balance from user                          │  │
│  │  2. Create Cashu token from house wallet              │  │
│  │  3. Encrypt token with NIP-44                         │  │
│  │  4. Send DM to user's npub                            │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────┘
                                │ Encrypted DM (NIP-44)
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      Nostr Relays                            │
│  wss://relay.damus.io, wss://relay.nostr.band, etc.        │
└───────────────────────────────┬─────────────────────────────┘
                                │ DM Delivery
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  User's Nostr Wallet                         │
│  (npub.cash, Cashu.me, Minibits, etc.)                      │
│  - Receives encrypted DM                                     │
│  - Decrypts Cashu token                                      │
│  - Adds to wallet balance                                    │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

#### Frontend
- **`components/AuthModal.tsx`** - Login UI with Nostr button
- **`components/WalletPanel.tsx`** - Instant Nostr withdraw UI
- **`lib/auth-context.tsx`** - Nostr authentication logic
- **`types/nostr.d.ts`** - TypeScript definitions for NIP-07

#### Backend
- **`lib/nostr.ts`** - Core Nostr utilities
  - `sendCashuTokenViaDM()` - Send encrypted DMs
  - `verifyNostrAuth()` - Verify signatures
  - `fetchNostrProfile()` - Get user metadata
- **`lib/auth.ts`** - User management
  - `loginOrCreateNostrUser()` - Nostr login/register
  - `getUserByNostrPubkey()` - Lookup by npub
- **`app/api/auth/nostr-login/route.ts`** - Login endpoint
- **`app/api/balance/withdraw-nostr/route.ts`** - Instant withdraw
- **`app/api/balance/deposit-nostr/route.ts`** - Manual deposit

#### Database
- **`lib/db.ts`** - Schema includes `nostr_pubkey` column
- Users table:
  ```sql
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    account_id TEXT UNIQUE,
    nostr_pubkey TEXT UNIQUE,  -- Hex format npub
    balance INTEGER CHECK (balance >= 0),
    wallet_mode TEXT DEFAULT 'demo',
    created_at INTEGER,
    last_login INTEGER
  )
  ```

---

## 📡 Nostr Integration Points (NIPs)

This implementation uses these Nostr Improvement Proposals:

### NIP-07: Browser Extension Communication
- Used for: User authentication
- Flow: Extension signs challenge → Server verifies signature
- Functions: `window.nostr.getPublicKey()`, `window.nostr.signEvent()`

### NIP-98: HTTP Auth
- Used for: Secure API authentication
- Event kind: `27235`
- Tags: `["challenge", "..."]`, `["method", "POST"]`, `["u", "url"]`

### NIP-44: Encrypted Direct Messages (v2)
- Used for: Sending Cashu tokens privately
- More secure than NIP-04 (deprecated)
- Uses conversation keys for encryption

### NIP-04: Legacy Encrypted DMs
- Fallback for older clients
- **Note:** NIP-04 has known vulnerabilities, use NIP-44 when possible

---

## 🔐 Security Features

### 1. Authentication Security
```typescript
// Server-side signature verification
export function verifyNostrAuth(event: NostrEvent, expectedChallenge: string): boolean {
  // ✅ Verify cryptographic signature
  if (!verifyEvent(event)) return false;

  // ✅ Check event kind (27235 for HTTP Auth)
  if (event.kind !== 27235) return false;

  // ✅ Verify challenge matches (prevents replay attacks)
  const challengeTag = event.tags.find(t => t[0] === "challenge");
  if (challengeTag[1] !== expectedChallenge) return false;

  // ✅ Check timestamp (must be recent, within 5 minutes)
  const timeDiff = Math.abs(Date.now() / 1000 - event.created_at);
  if (timeDiff > 300) return false;

  return true;
}
```

### 2. Atomic Withdrawals
```typescript
// Balance deducted BEFORE token creation
const newBalance = subtractFromBalance(user.id, amount, "withdraw", walletMode);

// If token creation fails, balance is automatically refunded
try {
  token = await sendFromHouse(amount, walletMode);
  await sendCashuTokenViaDM(user.nostr_pubkey, token, amount);
} catch (error) {
  addToBalance(user.id, amount, "refund", walletMode);
  // User never loses funds
}
```

### 3. Encrypted Token Transfers
```typescript
// NIP-44 encryption (secure conversation keys)
const conversationKey = nip44.v2.utils.getConversationKey(
  senderPrivkey,
  recipientPubkey
);
const encryptedToken = nip44.v2.encrypt(token, conversationKey);

// Only recipient can decrypt with their private key
```

### 4. Rate Limiting
- Login: 10 attempts per minute per IP
- Withdrawals: 10 per minute per IP
- All financial endpoints protected

---

## 🎯 User Experience Flow

### First-Time User (Nostr)
1. **Visit Casino** → See "Login with Nostr" button 💜
2. **Click Button** → Extension pops up asking for signature
3. **Approve** → Instant login, account auto-created
4. **Get 10,000 Demo Sats** → Start playing immediately
5. **Play Games** → Plinko, Sweet Bonanza, Blackjack
6. **Switch to Real Mode** → Toggle Demo/Real wallet
7. **Deposit Real Sats** → Paste Cashu token
8. **Win & Withdraw** → Click "Instant Withdraw to Nostr" ⚡
9. **Check Nostr DMs** → Token arrives encrypted in your DMs!

### Returning User (Nostr)
1. **Visit Casino** → Click "Login with Nostr" 💜
2. **Approve Signature** → Logged in instantly
3. **Play & Withdraw** → Seamless experience

### Traditional User (No Nostr)
1. **Create Account** → Get 16-digit Account ID
2. **Play Games** → Same gaming experience
3. **Deposit/Withdraw** → Manual token copy-paste
4. **Optional:** Link Nostr later for instant withdrawals

---

## 🧪 Testing

### Test Nostr Login
```bash
# 1. Install Alby extension (https://getalby.com)
# 2. Generate test npub at nostrtool.com (or use Alby's)
# 3. Visit http://localhost:3000
# 4. Click "Login with Nostr"
# 5. Approve signature in Alby
# 6. Verify: You should see your balance (10,000 demo sats)
```

### Test Instant Withdraw
```bash
# Prerequisites: Logged in with Nostr
# 1. Click "Wallet" in sidebar
# 2. Click "Instant Withdraw to Nostr"
# 3. Enter amount (e.g., 5000)
# 4. Click "Send via Nostr"
# 5. Check your Nostr client (Damus, Amethyst, etc.) for DM
# 6. DM should contain encrypted Cashu token
```

### Test Fallback (Manual Withdraw)
```bash
# If DM fails, fallback shows token directly:
# 1. Trigger withdrawal with Nostr DM relay down
# 2. Should see warning + token displayed
# 3. Can manually copy token to wallet
```

---

## 🚨 Troubleshooting

### "No Nostr extension found"
**Solution:** Install [Alby](https://getalby.com) or [nos2x](https://github.com/fiatjaf/nos2x) browser extension.

### "Failed to send DM" during withdrawal
**Cause:** Nostr relays unreachable or user's DM relays not configured.
**Result:** Token shown directly to user (fallback mode).
**Fix:**
- Configure `NOSTR_RELAYS` in `.env.local` with reliable relays
- Use popular relays: `relay.damus.io`, `relay.nostr.band`, `nos.lol`

### "CASINO_NOSTR_PRIVATE_KEY not configured"
**Solution:** Generate a keypair and add to `.env.local`:
```bash
# Generate key
node -e "const { generateSecretKey } = require('nostr-tools'); console.log(Buffer.from(generateSecretKey()).toString('hex'));"

# Add to .env.local
CASINO_NOSTR_PRIVATE_KEY=<hex_key_here>
```

### Withdrawals not arriving in Nostr wallet
**Possible causes:**
1. **Relay mismatch:** Your wallet uses different relays than casino
   - **Fix:** Add casino's relay to your wallet, or add your relays to `NOSTR_RELAYS`
2. **DM encryption mismatch:** Wallet doesn't support NIP-44
   - **Fix:** Use modern wallet like Alby, Amethyst, or Damus
3. **Private key not imported:** Wallet can't decrypt DMs
   - **Fix:** Import your Nostr private key (nsec) into wallet

---

## 🔮 Future Enhancements

### Planned Features
- [ ] **NIP-61 (Nutzaps):** Native Cashu-over-Nostr protocol
- [ ] **NIP-57 (Zaps):** Integrate Lightning zaps for deposits
- [ ] **NIP-05 Discovery:** Auto-detect user's Cashu wallet via NIP-05
- [ ] **Nostr Notifications:** Game results via Nostr notifications
- [ ] **Multiplayer Chat:** Nostr-based in-game chat (NIP-28)
- [ ] **Leaderboards:** Publish high scores to Nostr (NIP-52)

### Possible Integrations
- **npub.cash:** Direct integration with npub.cash Cashu wallet
- **Cashu.me:** Support for Cashu.me wallet discovery
- **Minibits:** Integration with Minibits wallet
- **LNbits:** Cashu extension integration

---

## 📚 Resources

### Nostr Resources
- **NIPs Repository:** https://github.com/nostr-protocol/nips
- **Nostr Tools:** https://github.com/nbd-wtf/nostr-tools
- **NIP-07 Explainer:** https://github.com/nostr-protocol/nips/blob/master/07.md
- **NIP-44 Spec:** https://github.com/nostr-protocol/nips/blob/master/44.md

### Cashu Resources
- **Cashu Protocol:** https://github.com/cashubtc
- **Cashu.me Wallet:** https://cashu.me
- **npub.cash:** https://npub.cash
- **Minibits Wallet:** https://www.minibits.cash

### Testing Tools
- **Nostrtool:** https://nostrtool.com (Generate test keypairs)
- **Nostr.watch:** https://nostr.watch (Monitor relays)
- **Cashu.space:** https://testnut.cashu.space (Test mint)

---

## 💪 Contributing

Want to improve the Nostr integration? Here's how:

1. **Test Edge Cases:** Try breaking the authentication or DM delivery
2. **Add Features:** Implement NIP-61 (Nutzaps) or NIP-57 (Zaps)
3. **Improve UX:** Better error messages, loading states, onboarding
4. **Write Docs:** Add tutorials, FAQs, or translations

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **Nostr Protocol:** https://nostr.com
- **Cashu Protocol:** https://cashu.space
- **nostr-tools:** For excellent Nostr SDK
- **Alby:** For amazing Nostr browser extension

---

**Built with 💜 for the Nostr and Bitcoin communities**

*Making casino gaming private, instant, and fun!*
