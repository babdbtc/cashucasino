import { getDatabase } from "./db";
import { CrashGameState } from "./crash";

export interface CrashHistoryEntry {
  id: number;
  crashPoint: number;
  hashedServerSeed: string;
  createdAt: number;
}

/**
 * Initialize crash_games and crash_history tables
 */
export function initializeCrashTables() {
  const dbDemo = getDatabase("demo");
  const dbReal = getDatabase("real");

  // Active games table
  const createGamesTable = `
    CREATE TABLE IF NOT EXISTS crash_games (
      user_id INTEGER PRIMARY KEY,
      game_id TEXT NOT NULL,
      crash_point REAL NOT NULL,
      server_seed TEXT NOT NULL,
      client_seed TEXT NOT NULL,
      hashed_server_seed TEXT NOT NULL,
      game_start_time INTEGER NOT NULL,
      betting_phase_end INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      auto_cashout REAL,
      cashed_out INTEGER NOT NULL,
      cashout_multiplier REAL,
      game_active INTEGER NOT NULL,
      betting_phase INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;

  // History table for showing recent crash points
  const createHistoryTable = `
    CREATE TABLE IF NOT EXISTS crash_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crash_point REAL NOT NULL,
      hashed_server_seed TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `;

  dbDemo.exec(createGamesTable);
  dbReal.exec(createGamesTable);
  dbDemo.exec(createHistoryTable);
  dbReal.exec(createHistoryTable);

  // Create indexes
  dbDemo.exec("CREATE INDEX IF NOT EXISTS idx_crash_games_updated ON crash_games(updated_at)");
  dbReal.exec("CREATE INDEX IF NOT EXISTS idx_crash_games_updated ON crash_games(updated_at)");
  dbDemo.exec("CREATE INDEX IF NOT EXISTS idx_crash_history_created ON crash_history(created_at DESC)");
  dbReal.exec("CREATE INDEX IF NOT EXISTS idx_crash_history_created ON crash_history(created_at DESC)");
}

// Initialize tables on import
initializeCrashTables();

/**
 * Save crash game state to database
 */
export function saveCrashGame(
  userId: number,
  gameState: CrashGameState,
  walletMode: "demo" | "real" = "demo"
): void {
  const db = getDatabase(walletMode);
  const now = Date.now();

  db.prepare(`
    INSERT OR REPLACE INTO crash_games (
      user_id, game_id, crash_point, server_seed, client_seed, hashed_server_seed,
      game_start_time, betting_phase_end, bet_amount, auto_cashout, cashed_out,
      cashout_multiplier, game_active, betting_phase, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    gameState.gameId,
    gameState.crashPoint,
    gameState.serverSeed,
    gameState.clientSeed,
    gameState.hashedServerSeed,
    gameState.gameStartTime,
    gameState.bettingPhaseEnd,
    gameState.betAmount,
    gameState.autoCashout,
    gameState.cashedOut ? 1 : 0,
    gameState.cashoutMultiplier,
    gameState.gameActive ? 1 : 0,
    gameState.bettingPhase ? 1 : 0,
    now,
    now
  );
}

/**
 * Get active crash game for user
 */
export function getCrashGame(
  userId: number,
  walletMode: "demo" | "real" = "demo"
): CrashGameState | null {
  const db = getDatabase(walletMode);

  const row = db.prepare(`
    SELECT * FROM crash_games WHERE user_id = ? AND game_active = 1
  `).get(userId) as any;

  if (!row) return null;

  return {
    gameId: row.game_id,
    crashPoint: row.crash_point,
    serverSeed: row.server_seed,
    clientSeed: row.client_seed,
    hashedServerSeed: row.hashed_server_seed,
    gameStartTime: row.game_start_time,
    bettingPhaseEnd: row.betting_phase_end,
    betAmount: row.bet_amount,
    autoCashout: row.auto_cashout,
    cashedOut: row.cashed_out === 1,
    cashoutMultiplier: row.cashout_multiplier,
    gameActive: row.game_active === 1,
    bettingPhase: row.betting_phase === 1,
  };
}

/**
 * Update crash game state
 */
export function updateCrashGame(
  userId: number,
  gameState: CrashGameState,
  walletMode: "demo" | "real" = "demo"
): void {
  const db = getDatabase(walletMode);
  const now = Date.now();

  db.prepare(`
    UPDATE crash_games
    SET cashed_out = ?,
        cashout_multiplier = ?,
        game_active = ?,
        betting_phase = ?,
        updated_at = ?
    WHERE user_id = ?
  `).run(
    gameState.cashedOut ? 1 : 0,
    gameState.cashoutMultiplier,
    gameState.gameActive ? 1 : 0,
    gameState.bettingPhase ? 1 : 0,
    now,
    userId
  );
}

/**
 * Delete crash game (after game ends)
 */
export function deleteCrashGame(userId: number, walletMode: "demo" | "real" = "demo"): void {
  const db = getDatabase(walletMode);
  db.prepare("DELETE FROM crash_games WHERE user_id = ?").run(userId);
}

/**
 * Add crash point to history
 */
export function addCrashHistory(
  crashPoint: number,
  hashedServerSeed: string,
  walletMode: "demo" | "real" = "demo"
): void {
  const db = getDatabase(walletMode);
  const now = Date.now();

  db.prepare(`
    INSERT INTO crash_history (crash_point, hashed_server_seed, created_at)
    VALUES (?, ?, ?)
  `).run(crashPoint, hashedServerSeed, now);

  // Keep only last 100 entries
  db.prepare(`
    DELETE FROM crash_history
    WHERE id NOT IN (
      SELECT id FROM crash_history
      ORDER BY created_at DESC
      LIMIT 100
    )
  `).run();
}

/**
 * Get recent crash history (for ticker display)
 */
export function getCrashHistory(
  limit: number = 20,
  walletMode: "demo" | "real" = "demo"
): CrashHistoryEntry[] {
  const db = getDatabase(walletMode);

  const rows = db.prepare(`
    SELECT id, crash_point, hashed_server_seed, created_at
    FROM crash_history
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map(row => ({
    id: row.id,
    crashPoint: row.crash_point,
    hashedServerSeed: row.hashed_server_seed,
    createdAt: row.created_at,
  }));
}

/**
 * Clean up old abandoned crash games
 */
export function cleanupOldCrashGames(): void {
  const dbDemo = getDatabase("demo");
  const dbReal = getDatabase("real");
  const expiry = Date.now() - (1 * 60 * 60 * 1000); // 1 hour

  const demoResult = dbDemo.prepare("DELETE FROM crash_games WHERE updated_at < ?").run(expiry);
  const realResult = dbReal.prepare("DELETE FROM crash_games WHERE updated_at < ?").run(expiry);

  if (demoResult.changes > 0) {
    console.log(`[Database Demo] Cleaned up ${demoResult.changes} abandoned crash games`);
  }
  if (realResult.changes > 0) {
    console.log(`[Database Real] Cleaned up ${realResult.changes} abandoned crash games`);
  }
}

/**
 * Clean up old crash history
 */
export function cleanupOldCrashHistory(): void {
  const dbDemo = getDatabase("demo");
  const dbReal = getDatabase("real");
  const expiry = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days

  const demoResult = dbDemo.prepare("DELETE FROM crash_history WHERE created_at < ?").run(expiry);
  const realResult = dbReal.prepare("DELETE FROM crash_history WHERE created_at < ?").run(expiry);

  if (demoResult.changes > 0) {
    console.log(`[Database Demo] Cleaned up ${demoResult.changes} old crash history entries`);
  }
  if (realResult.changes > 0) {
    console.log(`[Database Real] Cleaned up ${realResult.changes} old crash history entries`);
  }
}

// Clean up old games and history periodically
// Note: Disabled during build to prevent issues. Can be enabled in production via a cron job.
// setInterval(cleanupOldCrashGames, 60 * 60 * 1000); // Every hour
// setInterval(cleanupOldCrashHistory, 24 * 60 * 60 * 1000); // Every 24 hours
