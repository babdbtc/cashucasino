import { getDatabase } from "./db";
import { MinesGameState } from "./mines";

/**
 * Initialize mines_games table
 */
export function initializeMinesTable() {
  const dbDemo = getDatabase("demo");
  const dbReal = getDatabase("real");

  const createTable = `
    CREATE TABLE IF NOT EXISTS mines_games (
      user_id INTEGER PRIMARY KEY,
      game_id TEXT NOT NULL,
      mine_positions TEXT NOT NULL,
      revealed_tiles TEXT NOT NULL,
      mines_count INTEGER NOT NULL,
      current_multiplier REAL NOT NULL,
      bet_amount INTEGER NOT NULL,
      game_active INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;

  dbDemo.exec(createTable);
  dbReal.exec(createTable);

  // Create index
  dbDemo.exec("CREATE INDEX IF NOT EXISTS idx_mines_games_updated ON mines_games(updated_at)");
  dbReal.exec("CREATE INDEX IF NOT EXISTS idx_mines_games_updated ON mines_games(updated_at)");
}

// Initialize tables on import
initializeMinesTable();

/**
 * Save mines game state to database
 */
export function saveMinesGame(
  userId: number,
  gameState: MinesGameState,
  betAmount: number,
  walletMode: "demo" | "real" = "demo"
): void {
  const db = getDatabase(walletMode);
  const now = Date.now();

  db.prepare(`
    INSERT OR REPLACE INTO mines_games (
      user_id, game_id, mine_positions, revealed_tiles, mines_count,
      current_multiplier, bet_amount, game_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    gameState.gameId,
    JSON.stringify(gameState.minePositions),
    JSON.stringify(gameState.revealedTiles),
    gameState.minesCount,
    gameState.currentMultiplier,
    betAmount,
    gameState.gameActive ? 1 : 0,
    now,
    now
  );
}

/**
 * Get active mines game for user
 */
export function getMinesGame(userId: number, walletMode: "demo" | "real" = "demo"): {
  gameState: MinesGameState;
  betAmount: number;
} | null {
  const db = getDatabase(walletMode);

  const row = db.prepare(`
    SELECT * FROM mines_games WHERE user_id = ? AND game_active = 1
  `).get(userId) as any;

  if (!row) return null;

  return {
    gameState: {
      gameId: row.game_id,
      minePositions: JSON.parse(row.mine_positions),
      revealedTiles: JSON.parse(row.revealed_tiles),
      minesCount: row.mines_count,
      currentMultiplier: row.current_multiplier,
      gameActive: row.game_active === 1,
    },
    betAmount: row.bet_amount,
  };
}

/**
 * Update mines game state
 */
export function updateMinesGame(
  userId: number,
  gameState: MinesGameState,
  walletMode: "demo" | "real" = "demo"
): void {
  const db = getDatabase(walletMode);
  const now = Date.now();

  db.prepare(`
    UPDATE mines_games
    SET revealed_tiles = ?,
        current_multiplier = ?,
        game_active = ?,
        updated_at = ?
    WHERE user_id = ?
  `).run(
    JSON.stringify(gameState.revealedTiles),
    gameState.currentMultiplier,
    gameState.gameActive ? 1 : 0,
    now,
    userId
  );
}

/**
 * Delete mines game (after cashout or game over)
 */
export function deleteMinesGame(userId: number, walletMode: "demo" | "real" = "demo"): void {
  const db = getDatabase(walletMode);
  db.prepare("DELETE FROM mines_games WHERE user_id = ?").run(userId);
}

/**
 * Clean up old abandoned mines games
 */
export function cleanupOldMinesGames(): void {
  const dbDemo = getDatabase("demo");
  const dbReal = getDatabase("real");
  const expiry = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

  const demoResult = dbDemo.prepare("DELETE FROM mines_games WHERE updated_at < ?").run(expiry);
  const realResult = dbReal.prepare("DELETE FROM mines_games WHERE updated_at < ?").run(expiry);

  if (demoResult.changes > 0) {
    console.log(`[Database Demo] Cleaned up ${demoResult.changes} abandoned mines games`);
  }
  if (realResult.changes > 0) {
    console.log(`[Database Real] Cleaned up ${realResult.changes} abandoned mines games`);
  }
}

// Clean up old games periodically
setInterval(cleanupOldMinesGames, 60 * 60 * 1000); // Every hour
