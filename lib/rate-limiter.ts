/**
 * Simple in-memory rate limiter to prevent abuse
 * For production, consider using Redis for distributed rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

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
 * Check if a request should be rate limited
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
