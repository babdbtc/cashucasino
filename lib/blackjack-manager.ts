import db from "./db";
import crypto from "crypto";
import {
  Card,
  Hand,
  createShoe,
  shuffleDeck,
  dealInitialCards,
  needsReshuffle,
  isBlackjack,
  calculateHandValue,
} from "./blackjack";

const MAX_SEATS = 5;
const TABLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export interface TableState {
  id: string;
  deck: Card[];
  dealerHand: Card[];
  phase: 'betting' | 'dealing' | 'playing' | 'dealer' | 'payout' | 'waiting';
  currentSeat: number;
  minBet: number;
  maxBet: number;
  createdAt: number;
  lastActivity: number;
}

export interface SeatState {
  id: number;
  tableId: string;
  userId: number;
  seatNumber: number;
  hands: Hand[];
  currentHandIndex: number;
  totalBet: number;
  status: 'waiting' | 'betting' | 'playing' | 'done';
  createdAt: number;
}

// Generate unique table ID
function generateTableId(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Find or create a table with available seats
export function findOrCreateTable(): TableState {
  const now = Date.now();

  // Clean up old inactive tables
  db.prepare(`
    DELETE FROM blackjack_tables
    WHERE last_activity < ?
  `).run(now - TABLE_TIMEOUT);

  // Find table with available seats
  const tables = db.prepare(`
    SELECT t.*
    FROM blackjack_tables t
    WHERE (t.phase = 'waiting' OR t.phase = 'betting')
      AND (SELECT COUNT(*) FROM blackjack_seats WHERE table_id = t.id) < ?
    ORDER BY t.created_at ASC
    LIMIT 1
  `).get(MAX_SEATS) as any;

  if (tables) {
    // Update last activity
    db.prepare(`
      UPDATE blackjack_tables
      SET last_activity = ?
      WHERE id = ?
    `).run(now, tables.id);

    return {
      id: tables.id,
      deck: JSON.parse(tables.deck_state),
      dealerHand: JSON.parse(tables.dealer_hand),
      phase: tables.phase,
      currentSeat: tables.current_seat,
      minBet: tables.min_bet,
      maxBet: tables.max_bet,
      createdAt: tables.created_at,
      lastActivity: now,
    };
  }

  // Create new table
  const tableId = generateTableId();
  const deck = shuffleDeck(createShoe(6));

  const table: TableState = {
    id: tableId,
    deck,
    dealerHand: [],
    phase: 'waiting',
    currentSeat: 0,
    minBet: 1,
    maxBet: 1000,
    createdAt: now,
    lastActivity: now,
  };

  db.prepare(`
    INSERT INTO blackjack_tables (
      id, deck_state, dealer_hand, phase, current_seat,
      min_bet, max_bet, created_at, last_activity
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    table.id,
    JSON.stringify(table.deck),
    JSON.stringify(table.dealerHand),
    table.phase,
    table.currentSeat,
    table.minBet,
    table.maxBet,
    table.createdAt,
    table.lastActivity
  );

  return table;
}

// Get table by ID
export function getTable(tableId: string): TableState | null {
  const row = db.prepare(`
    SELECT * FROM blackjack_tables WHERE id = ?
  `).get(tableId) as any;

  if (!row) return null;

  return {
    id: row.id,
    deck: JSON.parse(row.deck_state),
    dealerHand: JSON.parse(row.dealer_hand),
    phase: row.phase,
    currentSeat: row.current_seat,
    minBet: row.min_bet,
    maxBet: row.max_bet,
    createdAt: row.created_at,
    lastActivity: row.last_activity,
  };
}

// Update table state
export function updateTable(table: TableState): void {
  const now = Date.now();

  db.prepare(`
    UPDATE blackjack_tables
    SET deck_state = ?, dealer_hand = ?, phase = ?,
        current_seat = ?, last_activity = ?
    WHERE id = ?
  `).run(
    JSON.stringify(table.deck),
    JSON.stringify(table.dealerHand),
    table.phase,
    table.currentSeat,
    now,
    table.id
  );
}

// Join a table
export function joinTable(tableId: string, userId: number): SeatState | null {
  // Check if user already at this table
  const existing = db.prepare(`
    SELECT * FROM blackjack_seats
    WHERE table_id = ? AND user_id = ?
  `).get(tableId, userId) as any;

  if (existing) {
    // If returning to table in waiting phase, move to betting
    const table = getTable(tableId);
    if (table && table.phase === 'waiting') {
      startBettingPhase(tableId);
      // Re-fetch seat after phase change
      const updatedSeat = db.prepare(`
        SELECT * FROM blackjack_seats
        WHERE table_id = ? AND user_id = ?
      `).get(tableId, userId) as any;

      return {
        id: updatedSeat.id,
        tableId: updatedSeat.table_id,
        userId: updatedSeat.user_id,
        seatNumber: updatedSeat.seat_number,
        hands: JSON.parse(updatedSeat.hands),
        currentHandIndex: updatedSeat.current_hand_index,
        totalBet: updatedSeat.total_bet,
        status: updatedSeat.status,
        createdAt: updatedSeat.created_at,
      };
    }

    return {
      id: existing.id,
      tableId: existing.table_id,
      userId: existing.user_id,
      seatNumber: existing.seat_number,
      hands: JSON.parse(existing.hands),
      currentHandIndex: existing.current_hand_index,
      totalBet: existing.total_bet,
      status: existing.status,
      createdAt: existing.created_at,
    };
  }

  // Find available seat
  const occupiedSeats = db.prepare(`
    SELECT seat_number FROM blackjack_seats WHERE table_id = ?
  `).all(tableId) as any[];

  const occupied = new Set(occupiedSeats.map(s => s.seat_number));
  let seatNumber = -1;

  for (let i = 0; i < MAX_SEATS; i++) {
    if (!occupied.has(i)) {
      seatNumber = i;
      break;
    }
  }

  if (seatNumber === -1) return null; // Table full

  const now = Date.now();

  // Check if table is in waiting phase and auto-start betting
  const table = getTable(tableId);
  const initialStatus = table && table.phase === 'waiting' ? 'betting' : 'waiting';

  const seat: SeatState = {
    id: 0, // Will be set by DB
    tableId,
    userId,
    seatNumber,
    hands: [],
    currentHandIndex: 0,
    totalBet: 0,
    status: initialStatus,
    createdAt: now,
  };

  const result = db.prepare(`
    INSERT INTO blackjack_seats (
      table_id, user_id, seat_number, hands, current_hand_index,
      total_bet, status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    seat.tableId,
    seat.userId,
    seat.seatNumber,
    JSON.stringify(seat.hands),
    seat.currentHandIndex,
    seat.totalBet,
    seat.status,
    seat.createdAt
  );

  seat.id = result.lastInsertRowid as number;

  // Auto-start betting phase if table was waiting
  if (table && table.phase === 'waiting') {
    startBettingPhase(tableId);
    // Update seat status after phase change
    seat.status = 'betting';
  }

  return seat;
}

// Get all seats at a table
export function getTableSeats(tableId: string): SeatState[] {
  const rows = db.prepare(`
    SELECT * FROM blackjack_seats
    WHERE table_id = ?
    ORDER BY seat_number ASC
  `).all(tableId) as any[];

  return rows.map(row => ({
    id: row.id,
    tableId: row.table_id,
    userId: row.user_id,
    seatNumber: row.seat_number,
    hands: JSON.parse(row.hands),
    currentHandIndex: row.current_hand_index,
    totalBet: row.total_bet,
    status: row.status,
    createdAt: row.created_at,
  }));
}

// Get seat by user ID
export function getSeatByUserId(tableId: string, userId: number): SeatState | null {
  const row = db.prepare(`
    SELECT * FROM blackjack_seats
    WHERE table_id = ? AND user_id = ?
  `).get(tableId, userId) as any;

  if (!row) return null;

  return {
    id: row.id,
    tableId: row.table_id,
    userId: row.user_id,
    seatNumber: row.seat_number,
    hands: JSON.parse(row.hands),
    currentHandIndex: row.current_hand_index,
    totalBet: row.total_bet,
    status: row.status,
    createdAt: row.created_at,
  };
}

// Update seat state
export function updateSeat(seat: SeatState): void {
  db.prepare(`
    UPDATE blackjack_seats
    SET hands = ?, current_hand_index = ?, total_bet = ?, status = ?
    WHERE id = ?
  `).run(
    JSON.stringify(seat.hands),
    seat.currentHandIndex,
    seat.totalBet,
    seat.status,
    seat.id
  );
}

// Leave table
export function leaveTable(tableId: string, userId: number): void {
  db.prepare(`
    DELETE FROM blackjack_seats
    WHERE table_id = ? AND user_id = ?
  `).run(tableId, userId);

  // If no players left, delete table
  const remaining = db.prepare(`
    SELECT COUNT(*) as count FROM blackjack_seats WHERE table_id = ?
  `).get(tableId) as any;

  if (remaining.count === 0) {
    db.prepare(`DELETE FROM blackjack_tables WHERE id = ?`).run(tableId);
  }
}

// Check if all players have bet
export function allPlayersReady(tableId: string): boolean {
  const seats = getTableSeats(tableId);
  if (seats.length === 0) return false;

  return seats.every(seat => seat.status === 'playing' || seat.status === 'done');
}

// Check if all players are done
export function allPlayersDone(tableId: string): boolean {
  const seats = getTableSeats(tableId);
  if (seats.length === 0) return false;

  return seats.every(seat => seat.status === 'done');
}

// Start betting phase (auto-start when players waiting)
export function startBettingPhase(tableId: string): void {
  const table = getTable(tableId);
  if (!table) return;

  // Check if deck needs reshuffling
  if (needsReshuffle(table.deck)) {
    table.deck = shuffleDeck(createShoe(6));
  }

  table.phase = 'betting';
  table.dealerHand = [];
  table.currentSeat = 0;
  updateTable(table);

  // Reset all seats to betting
  const seats = getTableSeats(tableId);
  for (const seat of seats) {
    seat.hands = [];
    seat.currentHandIndex = 0;
    seat.totalBet = 0;
    seat.status = 'betting';
    updateSeat(seat);
  }
}

// Deal initial cards
export function dealInitialHands(tableId: string): void {
  const table = getTable(tableId);
  if (!table) return;

  const seats = getTableSeats(tableId);
  const numPlayers = seats.length;

  const { playerHands, dealerHand, remainingDeck } = dealInitialCards(table.deck, numPlayers);

  // Update dealer hand
  table.dealerHand = dealerHand;
  table.deck = remainingDeck;
  table.phase = 'playing';
  table.currentSeat = 0;
  updateTable(table);

  // Update player hands
  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i];
    const initialHand: Hand = {
      cards: playerHands[i],
      bet: seat.totalBet,
      status: isBlackjack(playerHands[i]) ? 'blackjack' : 'active',
    };

    seat.hands = [initialHand];
    seat.currentHandIndex = 0;
    seat.status = initialHand.status === 'blackjack' ? 'done' : 'playing';
    updateSeat(seat);
  }
}

// Get current player turn
export function getCurrentPlayer(tableId: string): SeatState | null {
  const table = getTable(tableId);
  if (!table || table.phase !== 'playing') return null;

  const seats = getTableSeats(tableId);
  if (seats.length === 0) return null;

  // Find next player who needs to act
  for (let i = table.currentSeat; i < seats.length; i++) {
    const seat = seats[i];
    if (seat.status === 'playing') {
      // Check if current hand is still active
      const currentHand = seat.hands[seat.currentHandIndex];
      if (currentHand && currentHand.status === 'active') {
        return seat;
      }
    }
  }

  return null;
}

// Advance to next player or dealer
export function advanceToNextPlayer(tableId: string): 'continue' | 'dealer' | 'done' {
  const table = getTable(tableId);
  if (!table) return 'done';

  const currentPlayer = getCurrentPlayer(tableId);
  if (!currentPlayer) {
    // No more players, move to dealer phase
    table.phase = 'dealer';
    updateTable(table);
    return 'dealer';
  }

  table.currentSeat = currentPlayer.seatNumber;
  updateTable(table);
  return 'continue';
}
