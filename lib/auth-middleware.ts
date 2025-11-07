import { NextRequest } from "next/server";
import { getSession, getUserById, type User } from "./auth";

const SESSION_COOKIE_NAME = "casino_session";

/**
 * Get current authenticated user from request
 * Returns user object or null if not authenticated
 */
export function getCurrentUser(req: NextRequest): User | null {
  const sessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const session = getSession(sessionId);

  if (!session) {
    return null;
  }

  const user = getUserById(session.user_id);

  return user;
}

/**
 * Require authentication middleware
 * Returns user or throws error response
 */
export function requireAuth(req: NextRequest): User {
  const user = getCurrentUser(req);

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export { SESSION_COOKIE_NAME };

/**
 * Authenticate request and return result object
 * Used by API routes for consistent auth handling
 */
export async function authenticateRequest(req: NextRequest): Promise<{
  authenticated: boolean;
  user: User | null;
}> {
  const user = getCurrentUser(req);

  return {
    authenticated: user !== null,
    user,
  };
}
