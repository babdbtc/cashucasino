/**
 * Simple in-memory rate limiter to prevent abuse
 * For production, consider using Redis for distributed rate limiting
 */

import { WalletMode } from "./auth";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration for different wallet modes
 */
export interface RateLimitConfig {
  demoMaxRequests?: number;
  demoWindowMs?: number;
  realMaxRequests?: number;
  realWindowMs?: number;
}

/**
 * Account IDs that bypass rate limiting for demo play
 * Add account IDs here to allow unrestricted demo play for testing/admin purposes
 */
const DEMO_BYPASS_ACCOUNTS = new Set<string>([
  // Add account IDs here, e.g.:
  // "admin@example.com",
  // "tester@example.com",
]);

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Add an account ID to the demo bypass list
 * @param accountId - Account ID to bypass rate limiting for demo play
 */
export function addDemoBypassAccount(accountId: string): void {
  DEMO_BYPASS_ACCOUNTS.add(accountId.toLowerCase().trim());
}

/**
 * Remove an account ID from the demo bypass list
 * @param accountId - Account ID to remove from bypass list
 */
export function removeDemoBypassAccount(accountId: string): void {
  DEMO_BYPASS_ACCOUNTS.delete(accountId.toLowerCase().trim());
}

/**
 * Check if an account has demo bypass privileges
 * @param accountId - Account ID to check
 */
export function hasDemoBypass(accountId: string): boolean {
  return DEMO_BYPASS_ACCOUNTS.has(accountId.toLowerCase().trim());
}

/**
 * Get all account IDs with demo bypass privileges
 */
export function getDemoBypassAccounts(): string[] {
  return Array.from(DEMO_BYPASS_ACCOUNTS);
}

/**
 * Check if a request should be rate limited (legacy function for backward compatibility)
 * @param identifier - Unique identifier (e.g., IP address)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limit exceeded, false otherwise
 */
export function isRateLimited(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000 // 1 minute default
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    // First request or window expired, reset
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return false;
  }

  if (entry.count >= maxRequests) {
    // Rate limit exceeded
    return true;
  }

  // Increment count
  entry.count++;
  return false;
}

/**
 * Check if a request should be rate limited based on wallet mode
 * @param identifier - Unique identifier (e.g., IP address)
 * @param walletMode - Current wallet mode ("demo" or "real")
 * @param accountId - User's account ID (optional, for bypass checking)
 * @param config - Rate limit configuration for demo and real modes
 * @returns true if rate limit exceeded, false otherwise
 */
export function isRateLimitedByMode(
  identifier: string,
  walletMode: WalletMode,
  accountId?: string,
  config?: RateLimitConfig
): boolean {
  // Check if account has demo bypass privileges
  if (walletMode === "demo" && accountId && hasDemoBypass(accountId)) {
    console.log(`[RateLimit] Account ${accountId} bypassing demo rate limit`);
    return false;
  }

  // Determine rate limit settings based on wallet mode
  const maxRequests = walletMode === "demo"
    ? (config?.demoMaxRequests ?? 10)    // Default: 10 for demo (very restrictive to encourage real play)
    : (config?.realMaxRequests ?? 10000); // Default: 10000 for real (anti-DDoS only, normal players never hit this)

  const windowMs = walletMode === "demo"
    ? (config?.demoWindowMs ?? 60 * 1000)  // Default: 1 minute
    : (config?.realWindowMs ?? 60 * 1000); // Default: 1 minute

  // Create a unique key that includes wallet mode
  const key = `${identifier}:${walletMode}`;

  return isRateLimited(key, maxRequests, windowMs);
}

/**
 * Get rate limit info for an identifier
 */
export function getRateLimitInfo(identifier: string): {
  count: number;
  resetTime: number;
  limited: boolean;
} | null {
  const entry = rateLimitMap.get(identifier);
  if (!entry) return null;

  return {
    count: entry.count,
    resetTime: entry.resetTime,
    limited: entry.count >= 10,
  };
}

/**
 * Reset rate limit for an identifier (admin function)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}
