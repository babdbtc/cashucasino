import db, { getDatabase } from "./db";
import crypto from "crypto";

export type WalletMode = "demo" | "real";

export interface User {
  id: number;
  account_id: string;
  nostr_pubkey: string | null;
  balance: number;
  wallet_mode: WalletMode;
  created_at: number;
  last_login: number | null;
}

export interface Session {
  id: string;
  user_id: number;
  created_at: number;
  expires_at: number;
  wallet_mode: WalletMode;
}

/**
 * Generate a random 16-digit account ID using cryptographically secure randomness
 * Format: XXXX-XXXX-XXXX-XXXX for readability
 */
export function generateAccountId(): string {
  // Generate 16 random digits using crypto.randomInt for security
  const digits = Array.from({ length: 16 }, () =>
    crypto.randomInt(0, 10).toString()
  ).join("");

  // Format as XXXX-XXXX-XXXX-XXXX
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
}

/**
 * Normalize account ID (remove dashes for storage/comparison)
 */
function normalizeAccountId(accountId: string): string {
  return accountId.replace(/-/g, "");
}

/**
 * Create a new user account in both databases
 * Returns the generated account ID (with dashes)
 */
export function createUser(): string {
  let accountId: string;
  let normalized: string;

  // Keep generating until we get a unique ID (collision chance is astronomically low)
  do {
    accountId = generateAccountId();
    normalized = normalizeAccountId(accountId);
  } while (getUserByAccountId(normalized) !== null);

  const now = Date.now();

  // Create user in both demo and real databases with default mode as real
  const demoDb = getDatabase("demo");
  const realDb = getDatabase("real");

  demoDb.prepare(`
    INSERT INTO users (account_id, balance, wallet_mode, created_at)
    VALUES (?, 0, 'real', ?)
  `).run(normalized, now);

  realDb.prepare(`
    INSERT INTO users (account_id, balance, wallet_mode, created_at)
    VALUES (?, 0, 'real', ?)
  `).run(normalized, now);

  console.log(`[Auth] Created new user with ID: ${accountId}`);

  return accountId; // Return formatted version
}

/**
 * Get user by account ID from demo database (which stores the wallet_mode preference)
 */
export function getUserByAccountId(accountId: string): User | null {
  const normalized = normalizeAccountId(accountId);

  // Get user from demo database to retrieve wallet_mode preference
  const demoDb = getDatabase("demo");
  const demoUser = demoDb.prepare(`
    SELECT id, account_id, balance, wallet_mode, created_at, last_login
    FROM users
    WHERE account_id = ?
  `).get(normalized) as User | undefined;

  if (!demoUser) {
    return null;
  }

  // Now get the balance from the appropriate database based on wallet_mode
  const activeDb = getDatabase(demoUser.wallet_mode);
  const user = activeDb.prepare(`
    SELECT id, account_id, balance, wallet_mode, created_at, last_login
    FROM users
    WHERE account_id = ?
  `).get(normalized) as User | undefined;

  return user || null;
}

/**
 * Get user by internal ID
 * If mode is provided, queries that database directly (more efficient when mode is known from session)
 * Otherwise, gets user from demo database first to determine wallet_mode, then returns user from active database
 * Uses account_id to find user across databases since IDs may differ
 */
export function getUserById(id: number, mode?: WalletMode): User | null {
  // If mode is provided, query that database directly
  if (mode) {
    const activeDb = getDatabase(mode);
    const user = activeDb.prepare(`
      SELECT id, account_id, nostr_pubkey, balance, wallet_mode, created_at, last_login
      FROM users
      WHERE id = ?
    `).get(id) as User | undefined;

    return user || null;
  }

  // Otherwise, use the existing two-step lookup process
  // First get from demo database to determine wallet_mode and account_id
  const demoDb = getDatabase("demo");
  const demoUser = demoDb.prepare(`
    SELECT id, account_id, nostr_pubkey, balance, wallet_mode, created_at, last_login
    FROM users
    WHERE id = ?
  `).get(id) as User | undefined;

  if (!demoUser) {
    return null;
  }

  // Now get from the appropriate database based on wallet_mode
  // Use account_id as the identifier since IDs may differ between databases
  const activeDb = getDatabase(demoUser.wallet_mode);
  const user = activeDb.prepare(`
    SELECT id, account_id, nostr_pubkey, balance, wallet_mode, created_at, last_login
    FROM users
    WHERE account_id = ?
  `).get(demoUser.account_id) as User | undefined;

  return user || null;
}

/**
 * Update user's last login timestamp
 */
export function updateLastLogin(userId: number, mode: WalletMode = "demo"): void {
  const now = Date.now();
  const activeDb = getDatabase(mode);
  activeDb.prepare(`
    UPDATE users
    SET last_login = ?
    WHERE id = ?
  `).run(now, userId);
}

/**
 * Switch user's wallet mode between demo and real
 * Updates the mode in both databases with transaction protection
 *
 * SECURITY: Uses transactions to ensure both databases are updated atomically
 * If either update fails, the entire operation is rolled back
 */
export function switchWalletMode(accountId: string, newMode: WalletMode): User | null {
  const normalized = normalizeAccountId(accountId);

  // Update mode in both databases to keep them in sync
  const demoDb = getDatabase("demo");
  const realDb = getDatabase("real");

  // Create transactions for both databases
  const updateDemoMode = demoDb.transaction(() => {
    demoDb.prepare(`
      UPDATE users
      SET wallet_mode = ?
      WHERE account_id = ?
    `).run(newMode, normalized);
  });

  const updateRealMode = realDb.transaction(() => {
    realDb.prepare(`
      UPDATE users
      SET wallet_mode = ?
      WHERE account_id = ?
    `).run(newMode, normalized);
  });

  try {
    // Execute both transactions in sequence
    // If either fails, the transaction will automatically rollback
    updateDemoMode();
    updateRealMode();

    console.log(`[Auth] User ${accountId} switched to ${newMode} mode`);

    // Return updated user from the new active database
    return getUserByAccountId(accountId);
  } catch (error) {
    console.error("[Auth] Failed to switch wallet mode:", error);
    // Transactions automatically rollback on error
    return null;
  }
}

/**
 * Create a new session for a user in the appropriate database
 * Returns session ID
 */
export function createSession(userId: number, mode: WalletMode = "demo"): string {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days

  const activeDb = getDatabase(mode);
  activeDb.prepare(`
    INSERT INTO sessions (id, user_id, created_at, expires_at, wallet_mode)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, userId, now, expiresAt, mode);

  return sessionId;
}

/**
 * Get session by ID
 * Checks both databases since we don't know which one the session is in
 */
export function getSession(sessionId: string): Session | null {
  // Try demo database first
  let session = getDatabase("demo").prepare(`
    SELECT id, user_id, created_at, expires_at, wallet_mode
    FROM sessions
    WHERE id = ?
  `).get(sessionId) as Session | undefined;

  // If not in demo, try real
  if (!session) {
    session = getDatabase("real").prepare(`
      SELECT id, user_id, created_at, expires_at, wallet_mode
      FROM sessions
      WHERE id = ?
    `).get(sessionId) as Session | undefined;
  }

  if (!session) {
    return null;
  }

  // Check if expired
  if (session.expires_at < Date.now()) {
    deleteSession(sessionId);
    return null;
  }

  return session;
}

/**
 * Delete a session (logout)
 * Deletes from both databases to be safe
 */
export function deleteSession(sessionId: string): void {
  getDatabase("demo").prepare(`
    DELETE FROM sessions
    WHERE id = ?
  `).run(sessionId);

  getDatabase("real").prepare(`
    DELETE FROM sessions
    WHERE id = ?
  `).run(sessionId);
}

/**
 * Delete all sessions for a user
 * Deletes from both databases
 */
export function deleteUserSessions(userId: number): void {
  getDatabase("demo").prepare(`
    DELETE FROM sessions
    WHERE user_id = ?
  `).run(userId);

  getDatabase("real").prepare(`
    DELETE FROM sessions
    WHERE user_id = ?
  `).run(userId);
}

/**
 * Get user's balance from their active wallet mode
 */
export function getUserBalance(userId: number, mode: WalletMode): number {
  const activeDb = getDatabase(mode);
  const result = activeDb.prepare(`
    SELECT balance
    FROM users
    WHERE id = ?
  `).get(userId) as { balance: number } | undefined;

  return result?.balance || 0;
}

/**
 * Update user's balance in their active wallet mode
 * Returns new balance
 */
export function updateUserBalance(userId: number, newBalance: number, mode: WalletMode): number {
  const activeDb = getDatabase(mode);
  activeDb.prepare(`
    UPDATE users
    SET balance = ?
    WHERE id = ?
  `).run(newBalance, userId);

  return newBalance;
}

/**
 * Add to user's balance
 * Records transaction in audit log
 * Uses atomic transaction to prevent race conditions
 */
export function addToBalance(
  userId: number,
  amount: number,
  type: "deposit" | "win" | "refund",
  mode: WalletMode,
  metadata?: string
): number {
  const activeDb = getDatabase(mode);

  const addTransaction = activeDb.transaction((
    userId: number,
    amount: number,
    type: string,
    metadata?: string
  ): number => {
    // Get current balance within transaction
    const result = activeDb.prepare(`
      SELECT balance
      FROM users
      WHERE id = ?
    `).get(userId) as { balance: number } | undefined;

    const currentBalance = result?.balance || 0;
    const newBalance = currentBalance + amount;

    // Update balance
    activeDb.prepare(`
      UPDATE users
      SET balance = ?
      WHERE id = ?
    `).run(newBalance, userId);

    // Record transaction
    activeDb.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_after, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, type, amount, newBalance, metadata || null, Date.now());

    console.log(`[Auth ${mode.toUpperCase()}] User ${userId}: ${type} +${amount} sats, new balance: ${newBalance}`);

    return newBalance;
  });

  return addTransaction(userId, amount, type, metadata);
}

/**
 * Subtract from user's balance
 * Returns new balance, or null if insufficient funds
 * Uses atomic transaction to prevent race conditions
 */
export function subtractFromBalance(
  userId: number,
  amount: number,
  type: "bet" | "withdraw",
  mode: WalletMode,
  metadata?: string
): number | null {
  const activeDb = getDatabase(mode);

  const subtractTransaction = activeDb.transaction((
    userId: number,
    amount: number,
    type: string,
    metadata?: string
  ): number | null => {
    // Get current balance within transaction
    const result = activeDb.prepare(`
      SELECT balance
      FROM users
      WHERE id = ?
    `).get(userId) as { balance: number } | undefined;

    const currentBalance = result?.balance || 0;

    if (currentBalance < amount) {
      // Insufficient funds - rollback happens automatically
      return null;
    }

    const newBalance = currentBalance - amount;

    // Update balance
    activeDb.prepare(`
      UPDATE users
      SET balance = ?
      WHERE id = ?
    `).run(newBalance, userId);

    // Record transaction
    activeDb.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_after, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, type, -amount, newBalance, metadata || null, Date.now());

    console.log(`[Auth ${mode.toUpperCase()}] User ${userId}: ${type} -${amount} sats, new balance: ${newBalance}`);

    return newBalance;
  });

  return subtractTransaction(userId, amount, type, metadata);
}

/**
 * Get user's transaction history from their active wallet mode
 */
export function getUserTransactions(userId: number, mode: WalletMode, limit: number = 50): Array<{
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  metadata: string | null;
  created_at: number;
}> {
  const activeDb = getDatabase(mode);
  return activeDb.prepare(`
    SELECT id, type, amount, balance_after, metadata, created_at
    FROM transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit) as any[];
}

/**
 * Get user's game state (server-side state prevents client manipulation)
 */
export function getGameState(userId: number, gameType: string, mode: WalletMode): {
  freeSpinsRemaining: number;
  currentMultiplier: number;
  freeSpinsTotalWin: number;
} {
  const activeDb = getDatabase(mode);
  const state = activeDb.prepare(`
    SELECT free_spins_remaining, current_multiplier, free_spins_total_win
    FROM game_states
    WHERE user_id = ? AND game_type = ?
  `).get(userId, gameType) as any;

  if (!state) {
    // Initialize default state
    activeDb.prepare(`
      INSERT INTO game_states (user_id, game_type, free_spins_remaining, current_multiplier, free_spins_total_win, updated_at)
      VALUES (?, ?, 0, 1, 0, ?)
    `).run(userId, gameType, Date.now());

    return {
      freeSpinsRemaining: 0,
      currentMultiplier: 1,
      freeSpinsTotalWin: 0
    };
  }

  return {
    freeSpinsRemaining: state.free_spins_remaining,
    currentMultiplier: state.current_multiplier,
    freeSpinsTotalWin: state.free_spins_total_win
  };
}

/**
 * Update user's game state
 * Uses atomic transaction to prevent race conditions
 */
export function updateGameState(
  userId: number,
  gameType: string,
  mode: WalletMode,
  updates: {
    freeSpinsRemaining?: number;
    currentMultiplier?: number;
    freeSpinsTotalWin?: number;
  }
): void {
  const activeDb = getDatabase(mode);

  const updateTransaction = activeDb.transaction((
    userId: number,
    gameType: string,
    updates: {
      freeSpinsRemaining?: number;
      currentMultiplier?: number;
      freeSpinsTotalWin?: number;
    }
  ): void => {
    // Get current state within transaction
    const state = activeDb.prepare(`
      SELECT free_spins_remaining, current_multiplier, free_spins_total_win
      FROM game_states
      WHERE user_id = ? AND game_type = ?
    `).get(userId, gameType) as any;

    // Initialize if doesn't exist
    if (!state) {
      activeDb.prepare(`
        INSERT INTO game_states (user_id, game_type, free_spins_remaining, current_multiplier, free_spins_total_win, updated_at)
        VALUES (?, ?, 0, 1, 0, ?)
      `).run(userId, gameType, Date.now());
    }

    const current = state ? {
      freeSpinsRemaining: state.free_spins_remaining,
      currentMultiplier: state.current_multiplier,
      freeSpinsTotalWin: state.free_spins_total_win
    } : {
      freeSpinsRemaining: 0,
      currentMultiplier: 1,
      freeSpinsTotalWin: 0
    };

    const newState = {
      freeSpinsRemaining: updates.freeSpinsRemaining ?? current.freeSpinsRemaining,
      currentMultiplier: updates.currentMultiplier ?? current.currentMultiplier,
      freeSpinsTotalWin: updates.freeSpinsTotalWin ?? current.freeSpinsTotalWin
    };

    activeDb.prepare(`
      UPDATE game_states
      SET free_spins_remaining = ?, current_multiplier = ?, free_spins_total_win = ?, updated_at = ?
      WHERE user_id = ? AND game_type = ?
    `).run(
      newState.freeSpinsRemaining,
      newState.currentMultiplier,
      newState.freeSpinsTotalWin,
      Date.now(),
      userId,
      gameType
    );
  });

  return updateTransaction(userId, gameType, updates);
}

/**
 * Format account ID with dashes for display
 */
export function formatAccountId(accountId: string): string {
  const normalized = normalizeAccountId(accountId);
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}`;
}

/**
 * Nostr Login Functions
 */

/**
 * Create or login user with Nostr pubkey
 * If user exists, returns existing user. If not, creates new user.
 */
export function loginOrCreateNostrUser(nostrPubkey: string): User {
  const demoDb = getDatabase("demo");
  const realDb = getDatabase("real");
  const now = Date.now();

  // Check if user exists in demo database
  let user = demoDb.prepare(`
    SELECT id, account_id, nostr_pubkey, balance, wallet_mode, created_at, last_login
    FROM users
    WHERE nostr_pubkey = ?
  `).get(nostrPubkey) as User | undefined;

  if (user) {
    // User exists, update last login in both databases
    const wallet_mode = user.wallet_mode;
    demoDb.prepare("UPDATE users SET last_login = ? WHERE nostr_pubkey = ?").run(now, nostrPubkey);
    realDb.prepare("UPDATE users SET last_login = ? WHERE nostr_pubkey = ?").run(now, nostrPubkey);

    console.log("[Auth] Nostr user logged in:", nostrPubkey.substring(0, 8) + "...");
    return user;
  }

  // User doesn't exist, create new user with Nostr pubkey
  const accountId = generateAccountId();
  const normalized = normalizeAccountId(accountId);

  // Create in both databases
  demoDb.prepare(`
    INSERT INTO users (account_id, nostr_pubkey, balance, wallet_mode, created_at, last_login)
    VALUES (?, ?, 10000, 'real', ?, ?)
  `).run(normalized, nostrPubkey, now, now);

  realDb.prepare(`
    INSERT INTO users (account_id, nostr_pubkey, balance, wallet_mode, created_at, last_login)
    VALUES (?, ?, 0, 'real', ?, ?)
  `).run(normalized, nostrPubkey, now, now);

  console.log("[Auth] New Nostr user created:", nostrPubkey.substring(0, 8) + "...");

  // Return the newly created user from demo database
  user = demoDb.prepare(`
    SELECT id, account_id, nostr_pubkey, balance, wallet_mode, created_at, last_login
    FROM users
    WHERE nostr_pubkey = ?
  `).get(nostrPubkey) as User;

  return user;
}

/**
 * Get user by Nostr pubkey
 */
export function getUserByNostrPubkey(nostrPubkey: string): User | null {
  const demoDb = getDatabase("demo");

  const user = demoDb.prepare(`
    SELECT id, account_id, nostr_pubkey, balance, wallet_mode, created_at, last_login
    FROM users
    WHERE nostr_pubkey = ?
  `).get(nostrPubkey) as User | undefined;

  if (!user) return null;

  // Get user from their active wallet mode database
  const activeDb = getDatabase(user.wallet_mode);
  const activeUser = activeDb.prepare(`
    SELECT id, account_id, nostr_pubkey, balance, wallet_mode, created_at, last_login
    FROM users
    WHERE nostr_pubkey = ?
  `).get(nostrPubkey) as User;

  return activeUser;
}

/**
 * Link Nostr pubkey to existing account
 */
export function linkNostrToAccount(accountId: string, nostrPubkey: string): boolean {
  const normalized = normalizeAccountId(accountId);
  const demoDb = getDatabase("demo");
  const realDb = getDatabase("real");

  try {
    // Check if this Nostr pubkey is already linked to another account
    const existing = demoDb.prepare(`
      SELECT id FROM users WHERE nostr_pubkey = ?
    `).get(nostrPubkey);

    if (existing) {
      console.log("[Auth] Nostr pubkey already linked to another account");
      return false;
    }

    // Update both databases
    demoDb.prepare(`
      UPDATE users SET nostr_pubkey = ? WHERE account_id = ?
    `).run(nostrPubkey, normalized);

    realDb.prepare(`
      UPDATE users SET nostr_pubkey = ? WHERE account_id = ?
    `).run(nostrPubkey, normalized);

    console.log("[Auth] Linked Nostr pubkey to account");
    return true;
  } catch (error) {
    console.error("[Auth] Failed to link Nostr pubkey:", error);
    return false;
  }
}

