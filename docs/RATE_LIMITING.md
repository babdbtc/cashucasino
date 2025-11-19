# Rate Limiting System

This document explains the enhanced rate limiting system that supports different limits for demo and real balance gameplay.

## Features

1. **Separate rate limits for demo vs real balances**
   - Demo play can have more lenient limits (good for testing)
   - Real play has stricter limits (protect real money gameplay)

2. **Account-based bypass for demo play**
   - Specific accounts can bypass demo rate limits entirely
   - Useful for admin accounts, testers, and content creators

3. **Backward compatible**
   - Old `isRateLimited()` function still works
   - Easy migration path for existing code

## Usage

### Basic Usage in Game Routes

Replace the old rate limiting code:

```typescript
// OLD WAY
import { isRateLimited } from "@/lib/rate-limiter";

if (isRateLimited(ip, 500, 60 * 1000)) {
  return NextResponse.json(
    { error: "Too many requests." },
    { status: 429 }
  );
}
```

With the new mode-aware version:

```typescript
// NEW WAY
import { isRateLimitedByMode } from "@/lib/rate-limiter";

const walletMode = user.wallet_mode;

if (isRateLimitedByMode(ip, walletMode, user.account_id, {
  demoMaxRequests: 1000,  // 1000 requests/min for demo
  demoWindowMs: 60 * 1000,
  realMaxRequests: 100,   // 100 requests/min for real
  realWindowMs: 60 * 1000,
})) {
  return NextResponse.json(
    { error: `Too many requests. (${walletMode} mode)` },
    { status: 429 }
  );
}
```

### Configuration Options

The `isRateLimitedByMode` function accepts a configuration object:

```typescript
interface RateLimitConfig {
  demoMaxRequests?: number;  // Max requests for demo play (default: 10)
  demoWindowMs?: number;     // Time window for demo play (default: 60000)
  realMaxRequests?: number;  // Max requests for real play (default: 10000)
  realWindowMs?: number;     // Time window for real play (default: 60000)
}
```

### Recommended Settings by Game Type

**All Games:**
```typescript
{
  demoMaxRequests: 10-30,  // Very restrictive (1 every 2-6 seconds)
  demoWindowMs: 60 * 1000,
  realMaxRequests: 10000,  // Anti-DDoS only (~166/sec - normal players never hit this)
  realWindowMs: 60 * 1000,
}
```

**Specific Examples:**

- **Plinko/Slots/Mines Reveal:** `demoMaxRequests: 30` (faster games)
- **Sweet Bonanza:** `demoMaxRequests: 20` (turbo mode, very restrictive on demo)
- **Mines Start/Cashout/Abandon:** `demoMaxRequests: 20` (slower actions)
- **Buy Free Spins:** `demoMaxRequests: 10` (expensive action)

**Real balance** always uses `realMaxRequests: 10000` across all games - this is only for DDoS protection, not to limit legitimate gameplay.

## Managing Bypass Accounts

### Adding Accounts to Bypass List (Permanent)

Edit `lib/rate-limiter.ts` and add account IDs to the set:

```typescript
const DEMO_BYPASS_ACCOUNTS = new Set<string>([
  "admin@example.com",
  "tester@example.com",
  "content-creator@example.com",
]);
```

### Managing Bypass List at Runtime

Use the admin script for temporary changes:

```bash
# List all bypass accounts
npx tsx scripts/manage-rate-limit-bypass.ts list

# Add an account to bypass list (runtime only)
npx tsx scripts/manage-rate-limit-bypass.ts add "test@example.com"

# Remove an account from bypass list
npx tsx scripts/manage-rate-limit-bypass.ts remove "test@example.com"

# Check if account has bypass
npx tsx scripts/manage-rate-limit-bypass.ts check "test@example.com"
```

**Note:** Runtime changes are lost on server restart. For permanent changes, edit the source code.

### Programmatic Access

You can also use these functions directly in your code:

```typescript
import {
  addDemoBypassAccount,
  removeDemoBypassAccount,
  hasDemoBypass,
  getDemoBypassAccounts,
} from "@/lib/rate-limiter";

// Add account
addDemoBypassAccount("admin@example.com");

// Check if account has bypass
if (hasDemoBypass("admin@example.com")) {
  console.log("This account can play demo without limits!");
}

// Get all bypass accounts
const accounts = getDemoBypassAccounts();

// Remove account
removeDemoBypassAccount("admin@example.com");
```

## How It Works

1. **Mode-based keys**: Each user gets separate rate limit counters for demo and real play
   - Demo key: `{ip}:demo`
   - Real key: `{ip}:real`

2. **Bypass check**: Before applying rate limits, the system checks if the account is in the bypass list
   - Only applies to demo mode
   - Bypass accounts have unlimited demo play

3. **Independent limits**: Demo and real play are rate limited separately
   - Playing in demo mode doesn't affect real mode limits
   - Switching between modes resets the counter

## Migration Guide

Update your game routes one by one:

### Step 1: Update Imports
```typescript
// Change this:
import { isRateLimited } from "@/lib/rate-limiter";

// To this:
import { isRateLimitedByMode } from "@/lib/rate-limiter";
```

### Step 2: Get Wallet Mode Early
```typescript
// Add after user authentication:
const walletMode = user.wallet_mode;
```

### Step 3: Update Rate Limit Check
```typescript
// Change the rate limit check to use isRateLimitedByMode
if (isRateLimitedByMode(ip, walletMode, user.account_id, {
  demoMaxRequests: 1000,
  realMaxRequests: 100,
})) {
  // ... error response
}
```

### Example: Full Route Update

See `app/api/plinko/play/route.ts` for a complete example.

## Why Different Limits?

**Demo Balance (Very Restrictive - 10-30 req/min):**
- Extremely low limits discourage prolonged demo-only play
- Encourages users to deposit and use real balance
- Prevents abuse of free demo tokens
- Still allows testing the platform basics
- Bypass accounts can override for legitimate testing/content creation needs
- Users will quickly hit limits in turbo/autoplay modes

**Real Balance (Anti-DDoS Only - 10,000 req/min):**
- Limits are so high that normal players will **never** hit them
- Even extreme turbo mode or rapid clicking won't hit limits
- Zero friction for paying customers
- Only blocks obvious DDoS attacks or bot abuse
- Creates massive incentive to switch from demo to real mode
- Players get essentially unlimited gameplay with real balance

## User Experience

When a demo user hits the rate limit, they see a **prominent popup modal** that:
- Shows a large warning icon with animation
- Clearly states "DEMO RATE LIMIT REACHED"
- Explains that demo mode is limited to prevent abuse
- Highlights that **real balance has NO rate limits**
- Provides a big button to instantly switch to real mode
- Cannot be ignored - requires user acknowledgment

This creates a strong conversion moment where users are prompted to upgrade to real balance for unlimited gameplay.

## Security Considerations

1. **IP-based tracking**: Users can still switch IPs to bypass limits
   - Consider adding account-level tracking for production
   - Consider using Redis for distributed rate limiting

2. **Bypass list management**: Only authorized admins should modify the bypass list
   - Consider creating an admin API endpoint with authentication
   - Log all bypass list changes

3. **Monitor bypass usage**: Track when bypass accounts are playing
   - Look for abuse patterns
   - Set up alerts for unusual activity

## Future Enhancements

- [ ] Redis-based distributed rate limiting
- [ ] Per-account rate limiting (in addition to IP)
- [ ] Dynamic rate limit adjustment based on system load
- [ ] Admin API endpoint for bypass management
- [ ] Rate limit analytics dashboard
- [ ] Progressive rate limits (slower after hitting soft limits)
