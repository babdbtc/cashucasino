import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), ".data");
const DB_PATH_DEMO = path.join(DB_DIR, "casino-demo.db");
const DB_PATH_REAL = path.join(DB_DIR, "casino-real.db");

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database connections
const dbDemo = new Database(DB_PATH_DEMO);
const dbReal = new Database(DB_PATH_REAL);

// Default export is demo for backward compatibility
const db = dbDemo;

// Enable foreign keys for both databases
dbDemo.pragma("foreign_keys = ON");
dbReal.pragma("foreign_keys = ON");

// Create tables if they don't exist
function initializeDatabase(database: Database.Database) {
  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT UNIQUE NOT NULL,
      nostr_pubkey TEXT UNIQUE,
      balance INTEGER DEFAULT 0 CHECK (balance >= 0),
      wallet_mode TEXT DEFAULT 'demo',
      created_at INTEGER NOT NULL,
      last_login INTEGER
    )
  `);

  // Migration: Add wallet_mode column if it doesn't exist
  try {
    const tableInfo = database.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    const hasWalletMode = tableInfo.some(col => col.name === "wallet_mode");

    if (!hasWalletMode) {
      console.log("[Database Migration] Adding wallet_mode column to users table");
      database.exec(`ALTER TABLE users ADD COLUMN wallet_mode TEXT DEFAULT 'demo'`);
    }

    // Migration: Add nostr_pubkey column if it doesn't exist
    const hasNostrPubkey = tableInfo.some(col => col.name === "nostr_pubkey");
    if (!hasNostrPubkey) {
      console.log("[Database Migration] Adding nostr_pubkey column to users table");
      database.exec(`ALTER TABLE users ADD COLUMN nostr_pubkey TEXT UNIQUE`);
    }
  } catch (error) {
    // Table might not exist yet, which is fine
  }

  // Migration: Add CHECK constraint for balance >= 0 (for existing tables)
  // Note: SQLite doesn't allow adding CHECK constraints to existing columns
  // So we recreate the table if needed
  try {
    // Check if users table needs migration by testing the constraint
    const testUser = database.prepare("SELECT * FROM users LIMIT 1").get();
    if (testUser !== undefined) {
      // Table exists, check if constraint is enforced
      // Try to insert a user with negative balance (in a transaction that we'll rollback)
      let needsMigration = false;

      try {
        database.exec("BEGIN TRANSACTION");
        database.prepare("INSERT INTO users (account_id, balance, created_at) VALUES (?, ?, ?)").run("test-constraint-check-" + Date.now(), -1, Date.now());
        // If this succeeds, we need migration
        database.exec("ROLLBACK");
        needsMigration = true;
      } catch (error) {
        // Constraint already exists, rollback
        try {
          database.exec("ROLLBACK");
        } catch {
          // Already rolled back
        }
        needsMigration = false;
      }

      if (needsMigration) {
        console.log("[Database Migration] Adding CHECK constraint for balance >= 0");

        // Check which columns exist in the old table
        const tableInfo = database.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
        const hasNostrPubkey = tableInfo.some(col => col.name === "nostr_pubkey");
        const hasWalletMode = tableInfo.some(col => col.name === "wallet_mode");

        // Drop users_new if it exists from a previous failed migration
        database.exec("DROP TABLE IF EXISTS users_new");

        // Create new table with CHECK constraint
        database.exec(`
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id TEXT UNIQUE NOT NULL,
            nostr_pubkey TEXT UNIQUE,
            balance INTEGER DEFAULT 0 CHECK (balance >= 0),
            wallet_mode TEXT DEFAULT 'demo',
            created_at INTEGER NOT NULL,
            last_login INTEGER
          )
        `);

        // Copy data (ensuring no negative balances) - only copy columns that exist
        if (hasNostrPubkey && hasWalletMode) {
          database.exec(`
            INSERT INTO users_new (id, account_id, nostr_pubkey, balance, wallet_mode, created_at, last_login)
            SELECT id, account_id, nostr_pubkey, MAX(balance, 0), wallet_mode, created_at, last_login
            FROM users
          `);
        } else if (hasWalletMode) {
          database.exec(`
            INSERT INTO users_new (id, account_id, balance, wallet_mode, created_at, last_login)
            SELECT id, account_id, MAX(balance, 0), wallet_mode, created_at, last_login
            FROM users
          `);
        } else if (hasNostrPubkey) {
          database.exec(`
            INSERT INTO users_new (id, account_id, nostr_pubkey, balance, created_at, last_login)
            SELECT id, account_id, nostr_pubkey, MAX(balance, 0), created_at, last_login
            FROM users
          `);
        } else {
          database.exec(`
            INSERT INTO users_new (id, account_id, balance, created_at, last_login)
            SELECT id, account_id, MAX(balance, 0), created_at, last_login
            FROM users
          `);
        }

        // Drop old table
        database.exec("DROP TABLE users");

        // Rename new table
        database.exec("ALTER TABLE users_new RENAME TO users");

        console.log("[Database Migration] CHECK constraint migration completed");
      }
    }
  } catch (error) {
    // Migration failed or not needed, log and continue
    console.log("[Database Migration] CHECK constraint migration skipped:", error);
  }

  // Sessions table for active sessions
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      wallet_mode TEXT DEFAULT 'demo',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migration: Add wallet_mode column to sessions if it doesn't exist
  try {
    const sessionTableInfo = database.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
    const hasSessionWalletMode = sessionTableInfo.some(col => col.name === "wallet_mode");

    if (!hasSessionWalletMode) {
      console.log("[Database Migration] Adding wallet_mode column to sessions table");
      database.exec(`ALTER TABLE sessions ADD COLUMN wallet_mode TEXT DEFAULT 'demo'`);
    }
  } catch (error) {
    // Table might not exist yet, which is fine
  }

  // Transactions table for audit log
  database.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      metadata TEXT,
      cashu_token TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migration: Add cashu_token column if it doesn't exist
  try {
    const transactionsTableInfo = database.prepare("PRAGMA table_info(transactions)").all() as Array<{ name: string }>;
    const hasCashuToken = transactionsTableInfo.some(col => col.name === "cashu_token");

    if (!hasCashuToken) {
      console.log("[Database Migration] Adding cashu_token column to transactions table");
      database.exec(`ALTER TABLE transactions ADD COLUMN cashu_token TEXT`);
    }
  } catch (error) {
    // Table might not exist yet, which is fine
  }

  // Game states table for server-side game state (prevents client manipulation)
  database.exec(`
    CREATE TABLE IF NOT EXISTS game_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_type TEXT NOT NULL,
      free_spins_remaining INTEGER DEFAULT 0,
      current_multiplier INTEGER DEFAULT 1,
      free_spins_total_win INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, game_type)
    )
  `);

  // Blackjack tables for multiplayer game
  database.exec(`
    CREATE TABLE IF NOT EXISTS blackjack_tables (
      id TEXT PRIMARY KEY,
      deck_state TEXT NOT NULL,
      dealer_hand TEXT NOT NULL,
      phase TEXT NOT NULL,
      current_seat INTEGER DEFAULT 0,
      min_bet INTEGER DEFAULT 1,
      max_bet INTEGER DEFAULT 1000,
      created_at INTEGER NOT NULL,
      last_activity INTEGER NOT NULL
    )
  `);

  // Blackjack seats (players at tables)
  database.exec(`
    CREATE TABLE IF NOT EXISTS blackjack_seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      seat_number INTEGER NOT NULL,
      hands TEXT NOT NULL,
      current_hand_index INTEGER DEFAULT 0,
      total_bet INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (table_id) REFERENCES blackjack_tables(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(table_id, seat_number)
    )
  `);

  // Blackjack solo games - Stores game state to prevent loss on server restart
  database.exec(`
    CREATE TABLE IF NOT EXISTS blackjack_solo_games (
      user_id INTEGER PRIMARY KEY,
      deck TEXT NOT NULL,
      player_hands TEXT NOT NULL,
      dealer_hand TEXT NOT NULL,
      current_hand_index INTEGER DEFAULT 0,
      initial_bet INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Lightning deposit quotes - Tracks pending Lightning deposits
  // States: UNPAID, PROCESSING, PAID, EXPIRED, MINT_FAILED, CREDIT_FAILED, CHECK_FAILED
  database.exec(`
    CREATE TABLE IF NOT EXISTS lightning_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quote_id TEXT UNIQUE NOT NULL,
      amount INTEGER NOT NULL,
      invoice TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'UNPAID',
      expiry INTEGER NOT NULL,
      wallet_mode TEXT DEFAULT 'demo',
      retry_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migration: Add retry_count column if it doesn't exist
  try {
    const lightningTableInfo = database.prepare("PRAGMA table_info(lightning_deposits)").all() as Array<{ name: string }>;
    const hasRetryCount = lightningTableInfo.some(col => col.name === "retry_count");

    if (!hasRetryCount) {
      console.log("[Database Migration] Adding retry_count column to lightning_deposits table");
      database.exec(`ALTER TABLE lightning_deposits ADD COLUMN retry_count INTEGER DEFAULT 0`);
    }
  } catch (error) {
    // Table might not exist yet, which is fine
  }

  // Failed credit attempts - For manual recovery when minting succeeds but balance credit fails
  database.exec(`
    CREATE TABLE IF NOT EXISTS failed_credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quote_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      error_message TEXT,
      created_at INTEGER NOT NULL,
      resolved BOOLEAN DEFAULT 0,
      resolved_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_game_states_user_id ON game_states(user_id);
    CREATE INDEX IF NOT EXISTS idx_blackjack_tables_activity ON blackjack_tables(last_activity);
    CREATE INDEX IF NOT EXISTS idx_blackjack_seats_table ON blackjack_seats(table_id);
    CREATE INDEX IF NOT EXISTS idx_blackjack_seats_user ON blackjack_seats(user_id);
    CREATE INDEX IF NOT EXISTS idx_blackjack_solo_updated ON blackjack_solo_games(updated_at);
    CREATE INDEX IF NOT EXISTS idx_lightning_deposits_user_id ON lightning_deposits(user_id);
    CREATE INDEX IF NOT EXISTS idx_lightning_deposits_quote_id ON lightning_deposits(quote_id);
    CREATE INDEX IF NOT EXISTS idx_lightning_deposits_state ON lightning_deposits(state);
    CREATE INDEX IF NOT EXISTS idx_failed_credits_user_id ON failed_credits(user_id);
    CREATE INDEX IF NOT EXISTS idx_failed_credits_resolved ON failed_credits(resolved);
  `);
}

// Initialize both databases on import
initializeDatabase(dbDemo);
initializeDatabase(dbReal);
console.log("[Database] Demo and Real databases initialized successfully");

// Helper function to get the correct database based on wallet mode
export function getDatabase(mode: "demo" | "real" = "demo"): Database.Database {
  return mode === "real" ? dbReal : dbDemo;
}

// Clean up expired sessions and old games periodically from both databases
setInterval(() => {
  const now = Date.now();

  // Clean up expired sessions
  const demoSessionResult = dbDemo.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  if (demoSessionResult.changes > 0) {
    console.log(`[Database Demo] Cleaned up ${demoSessionResult.changes} expired sessions`);
  }

  const realSessionResult = dbReal.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  if (realSessionResult.changes > 0) {
    console.log(`[Database Real] Cleaned up ${realSessionResult.changes} expired sessions`);
  }

  // Clean up blackjack solo games older than 24 hours
  const gameExpiry = now - (24 * 60 * 60 * 1000);
  const demoGameResult = dbDemo.prepare("DELETE FROM blackjack_solo_games WHERE updated_at < ?").run(gameExpiry);
  if (demoGameResult.changes > 0) {
    console.log(`[Database Demo] Cleaned up ${demoGameResult.changes} abandoned blackjack solo games`);
  }

  const realGameResult = dbReal.prepare("DELETE FROM blackjack_solo_games WHERE updated_at < ?").run(gameExpiry);
  if (realGameResult.changes > 0) {
    console.log(`[Database Real] Cleaned up ${realGameResult.changes} abandoned blackjack solo games`);
  }

  // Clean up expired Lightning deposits
  const demoLightningResult = dbDemo.prepare("DELETE FROM lightning_deposits WHERE expiry < ? AND state != 'PAID'").run(now);
  if (demoLightningResult.changes > 0) {
    console.log(`[Database Demo] Cleaned up ${demoLightningResult.changes} expired Lightning deposits`);
  }

  const realLightningResult = dbReal.prepare("DELETE FROM lightning_deposits WHERE expiry < ? AND state != 'PAID'").run(now);
  if (realLightningResult.changes > 0) {
    console.log(`[Database Real] Cleaned up ${realLightningResult.changes} expired Lightning deposits`);
  }
}, 60 * 60 * 1000); // Every hour

export default db;
