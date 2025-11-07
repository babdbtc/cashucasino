/**
 * Virtual Balance System
 *
 * This system manages a user's virtual balance stored in localStorage.
 * The balance is separate from their Cashu wallet and is used for gameplay.
 *
 * Flow:
 * 1. User deposits Cashu token → Server receives it → User gets virtual balance
 * 2. User plays games → Virtual balance increases/decreases (no mint calls)
 * 3. User withdraws → Server creates Cashu token from house wallet
 */

const VIRTUAL_BALANCE_KEY = "cashu_casino_virtual_balance";

export interface VirtualBalance {
  balance: number;
  lastUpdated: number;
}

/**
 * Get the user's virtual balance
 */
export function getVirtualBalance(): number {
  if (typeof window === "undefined") return 0;

  try {
    const stored = localStorage.getItem(VIRTUAL_BALANCE_KEY);
    if (!stored) return 0;

    const data: VirtualBalance = JSON.parse(stored);
    return data.balance;
  } catch (error) {
    console.error("Error reading virtual balance:", error);
    return 0;
  }
}

/**
 * Set the user's virtual balance
 */
export function setVirtualBalance(amount: number): void {
  if (typeof window === "undefined") return;

  const data: VirtualBalance = {
    balance: Math.max(0, amount), // Never allow negative balance
    lastUpdated: Date.now(),
  };

  localStorage.setItem(VIRTUAL_BALANCE_KEY, JSON.stringify(data));
}

/**
 * Add to the user's virtual balance
 */
export function addVirtualBalance(amount: number): number {
  const currentBalance = getVirtualBalance();
  const newBalance = currentBalance + amount;
  setVirtualBalance(newBalance);
  return newBalance;
}

/**
 * Subtract from the user's virtual balance
 * Returns false if insufficient balance
 */
export function subtractVirtualBalance(amount: number): boolean {
  const currentBalance = getVirtualBalance();

  if (currentBalance < amount) {
    return false; // Insufficient balance
  }

  const newBalance = currentBalance - amount;
  setVirtualBalance(newBalance);
  return true;
}

/**
 * Check if user has sufficient balance
 */
export function hasSufficientBalance(amount: number): boolean {
  return getVirtualBalance() >= amount;
}

/**
 * Clear the virtual balance (for testing or manual reset)
 */
export function clearVirtualBalance(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VIRTUAL_BALANCE_KEY);
}
