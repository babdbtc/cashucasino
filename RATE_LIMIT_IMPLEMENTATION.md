# Rate Limiting Implementation Summary

## What Was Implemented

✅ **Different rate limits for demo vs real balances**
- Demo play: Very restrictive limits (default: 10 requests/min) to encourage real play
- Real play: Anti-DDoS only (default: 10,000 requests/min) - normal players never hit this
- Fully configurable per game route

✅ **Account bypass system for demo play**
- Specific accounts can bypass demo rate limits
- Managed via a simple Set in `lib/rate-limiter.ts`
- Helpful for admin accounts, testers, and content creators

✅ **Admin management script**
- Easy CLI tool to manage bypass accounts
- List, add, remove, and check bypass status
- Located at `scripts/manage-rate-limit-bypass.ts`

✅ **Backward compatible**
- Old `isRateLimited()` still works
- New `isRateLimitedByMode()` for enhanced features
- Easy migration path

## Files Modified

1. **`lib/rate-limiter.ts`** - Enhanced rate limiting system
2. **`app/api/plinko/play/route.ts`** - Updated to use new system
3. **`app/api/mines/reveal/route.ts`** - Updated to use new system

## Files Created

1. **`scripts/manage-rate-limit-bypass.ts`** - Admin CLI tool
2. **`docs/RATE_LIMITING.md`** - Comprehensive documentation
3. **`RATE_LIMIT_IMPLEMENTATION.md`** - This summary

## Quick Start

### 1. Add Bypass Accounts (Optional)

Edit `lib/rate-limiter.ts` around line 29:

```typescript
const DEMO_BYPASS_ACCOUNTS = new Set<string>([
  "admin@yourdomain.com",
  "tester@yourdomain.com",
]);
```

### 2. Update Other Game Routes

Follow the pattern in `app/api/plinko/play/route.ts`:

```typescript
import { isRateLimitedByMode } from "@/lib/rate-limiter";

// ... in your POST handler

const walletMode = user.wallet_mode;

if (isRateLimitedByMode(ip, walletMode, user.account_id, {
  demoMaxRequests: 30,     // Very restrictive to encourage real play
  realMaxRequests: 10000,  // Anti-DDoS only, normal players never hit this
})) {
  return NextResponse.json(
    { error: `Too many requests. (${walletMode} mode)` },
    { status: 429 }
  );
}
```

### 3. Test the System

```bash
# Test with a regular account (should hit limits)
# ... play game rapidly in demo mode

# Add bypass for an account
npx tsx scripts/manage-rate-limit-bypass.ts add "test@example.com"

# Test again with bypass account (should never hit limits)
# ... play game rapidly in demo mode

# Check bypass status
npx tsx scripts/manage-rate-limit-bypass.ts check "test@example.com"

# List all bypass accounts
npx tsx scripts/manage-rate-limit-bypass.ts list
```

## Routes That Still Need Updating

You can update these routes using the same pattern:

- `app/api/mines/start/route.ts`
- `app/api/mines/cashout/route.ts`
- `app/api/mines/abandon/route.ts`
- `app/api/bonanza/play/route.ts`
- `app/api/bonanza/buy-freespins/route.ts`
- `app/api/slots/play/route.ts`

Each just needs:
1. Import change: `isRateLimited` → `isRateLimitedByMode`
2. Get wallet mode: `const walletMode = user.wallet_mode;`
3. Update the rate limit check with appropriate limits

## Recommended Limits by Game

**All Games Use Same Pattern:**
```typescript
{
  demoMaxRequests: 10-30,  // Very restrictive (varies by game speed)
  realMaxRequests: 10000,  // Anti-DDoS only (~166/sec - players never hit this)
}
```

**Specific Demo Limits by Game:**
- **Plinko:** 30 req/min (~1 every 2 seconds)
- **Slots:** 30 req/min (~1 every 2 seconds)
- **Sweet Bonanza:** 20 req/min (~1 every 3 seconds)
- **Mines Reveal:** 30 req/min (~1 every 2 seconds)
- **Mines Start/Cashout/Abandon:** 20 req/min (~1 every 3 seconds)
- **Buy Free Spins:** 10 req/min (~1 every 6 seconds)

**Real Balance:** Always 10,000 req/min for all games - this is purely anti-DDoS, not gameplay limiting.

## Benefits

1. **Prevents Demo Abuse**: Regular users can't spam demo tokens endlessly
2. **Encourages Real Play**: Demo has restrictive limits, real play is generous
3. **Better UX for Paying Users**: Real balance users get much higher limits
4. **Flexible Testing**: Admins/testers can bypass demo limits for testing
5. **Independent Tracking**: Demo and real limits are tracked separately
6. **Revenue Driver**: Creates incentive to deposit and play with real balance
7. **Prominent User Feedback**: Big popup modal alerts users and explains how to get unlimited play

## Example Usage Scenario

**Regular User:**
- Plays demo: Limited to 10-30 plays/minute depending on game (very restrictive - will hit limits quickly)
- Hits limit: **Big prominent popup** explaining the limit and offering to switch to real mode
- Plays real: Limited to 10,000 plays/minute (essentially unlimited - ~166/second!)
- **Massive** incentive to switch to real mode for unrestricted gameplay

**Admin/Tester Account:**
- Plays demo: **Unlimited** (bypassed)
- Plays real: 10,000 plays/minute (essentially unlimited)
- Perfect for testing, making videos, demos

**Content Creator Account:**
- Plays demo: **Unlimited** (bypassed)
- Plays real: 10,000 plays/minute (essentially unlimited)
- Can make unlimited demo and real gameplay videos

## Security Notes

- Bypass only works for **demo mode**
- Real money play is always rate limited
- Account IDs are case-insensitive and trimmed
- In-memory implementation (consider Redis for production)
- IP-based tracking (consider account-based tracking too)

## Next Steps

1. ✅ Test the current implementation
2. ⬜ Update remaining game routes
3. ⬜ Add your admin account IDs to bypass list
4. ⬜ Monitor bypass account usage
5. ⬜ Consider Redis implementation for production scale

## Questions?

See `docs/RATE_LIMITING.md` for detailed documentation.
