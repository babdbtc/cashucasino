import { Mint, Wallet, Proof } from "@cashu/cashu-ts";
import fs from "fs/promises";
import path from "path";

const MINT_URL_DEMO = process.env.NEXT_PUBLIC_CASHU_MINT_URL_DEMO || "https://testnut.cashu.space";
const MINT_URL_REAL = process.env.NEXT_PUBLIC_CASHU_MINT_URL_REAL || "https://mint.minibits.cash/Bitcoin";

const WALLET_DIR_BASE = path.join(process.cwd(), ".wallet");

type WalletMode = "demo" | "real";

function getWalletPaths(mode: WalletMode) {
  const walletDir = path.join(WALLET_DIR_BASE, mode);
  return {
    walletDir,
    proofsFile: path.join(walletDir, "proofs.json"),
    balanceFile: path.join(walletDir, "balance.json"),
  };
}

function getMintUrl(mode: WalletMode): string {
  return mode === "real" ? MINT_URL_REAL : MINT_URL_DEMO;
}

interface WalletData {
  proofs: Proof[];
  balance: number;
  lastUpdated: string;
}

/**
 * Ensure wallet directory exists
 */
async function ensureWalletDir(mode: WalletMode) {
  const { walletDir } = getWalletPaths(mode);
  try {
    await fs.access(walletDir);
  } catch {
    await fs.mkdir(walletDir, { recursive: true });
  }
}

/**
 * Load house wallet proofs from disk
 */
async function loadWalletData(mode: WalletMode): Promise<WalletData> {
  try {
    await ensureWalletDir(mode);
    const { proofsFile } = getWalletPaths(mode);
    console.log(`[Wallet Manager] Loading wallet data for mode=${mode} from ${proofsFile}`);
    const data = await fs.readFile(proofsFile, "utf-8");
    const walletData = JSON.parse(data);
    console.log(`[Wallet Manager] Loaded mode=${mode}: balance=${walletData.balance}, proofCount=${walletData.proofs.length}`);
    return walletData;
  } catch (error) {
    // Initialize empty wallet
    console.log(`[Wallet Manager] No wallet file found for mode=${mode}, initializing empty wallet`);
    return {
      proofs: [],
      balance: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Save house wallet proofs to disk
 */
async function saveWalletData(data: WalletData, mode: WalletMode): Promise<void> {
  await ensureWalletDir(mode);
  const { proofsFile, balanceFile } = getWalletPaths(mode);
  await fs.writeFile(proofsFile, JSON.stringify(data, null, 2));

  // Also save a balance snapshot for quick reference
  await fs.writeFile(balanceFile, JSON.stringify({
    balance: data.balance,
    lastUpdated: data.lastUpdated,
  }, null, 2));
}

/**
 * Get the house wallet with current balance
 */
export async function getHouseWallet(mode: WalletMode = "demo"): Promise<{ wallet: Wallet; balance: number }> {
  const mintUrl = getMintUrl(mode);
  const mint = new Mint(mintUrl);
  const wallet = new Wallet(mint);

  // Load keys from the mint (required in Cashu v3)
  await wallet.loadMint();

  const data = await loadWalletData(mode);

  // Calculate actual balance from proofs
  const balance = data.proofs.reduce((sum, proof) => sum + proof.amount, 0);

  return { wallet, balance };
}

/**
 * Get current house balance
 */
export async function getHouseBalance(mode: WalletMode = "demo"): Promise<number> {
  const data = await loadWalletData(mode);
  return data.balance;
}

/**
 * Receive tokens into house wallet (player loses, house wins)
 * @param token - Cashu token from player
 * @param mode - Wallet mode (demo or real)
 * @returns Amount received
 */
export async function receiveToHouse(token: string, mode: WalletMode = "demo"): Promise<number> {
  const { wallet } = await getHouseWallet(mode);
  const data = await loadWalletData(mode);

  // Receive the token (this swaps proofs with the mint)
  // In Cashu v3, receive() returns an array of proofs directly
  const receivedProofs = await wallet.receive(token);

  // Calculate amount received
  const amountReceived = receivedProofs.reduce((sum, p) => sum + p.amount, 0);

  // Add to our stored proofs
  data.proofs.push(...receivedProofs);
  data.balance += amountReceived;
  data.lastUpdated = new Date().toISOString();

  await saveWalletData(data, mode);

  console.log(`[House Wallet ${mode.toUpperCase()}] Received ${amountReceived} sats. New balance: ${data.balance}`);

  return amountReceived;
}

/**
 * Send tokens from house wallet (player wins, house pays)
 * @param amount - Amount to send in sats
 * @param mode - Wallet mode (demo or real)
 * @returns Encoded token string
 */
export async function sendFromHouse(amount: number, mode: WalletMode = "demo"): Promise<string> {
  const { wallet } = await getHouseWallet(mode);
  const data = await loadWalletData(mode);

  const balance = data.proofs.reduce((sum, proof) => sum + proof.amount, 0);

  if (balance < amount) {
    throw new Error(`Insufficient house balance. Have ${balance} sats, need ${amount} sats`);
  }

  // In Cashu v3, we pass proofs directly to the send method
  // The wallet will select appropriate proofs and handle change
  const result = await wallet.send(amount, data.proofs);

  console.log('[Debug] wallet.send() result:', JSON.stringify(result, null, 2));

  // Extract sent proofs and change from result
  const sentProofs = result.send || [];
  const changeProofs = result.keep || [];

  if (!sentProofs || sentProofs.length === 0) {
    throw new Error('No proofs to send');
  }

  const mintUrl = getMintUrl(mode);

  // Manually encode the token (the library encoding functions have issues)
  // Cashu token format: cashuA + base64(JSON)
  const tokenData = {
    token: [
      {
        mint: mintUrl,
        proofs: sentProofs,
      },
    ],
  };

  const jsonString = JSON.stringify(tokenData);
  const base64Token = Buffer.from(jsonString).toString('base64');
  const token = 'cashuA' + base64Token;

  // Update our stored proofs with the change
  data.proofs = changeProofs;
  data.balance = changeProofs.reduce((sum, proof) => sum + proof.amount, 0);
  data.lastUpdated = new Date().toISOString();

  await saveWalletData(data, mode);

  console.log(`[House Wallet ${mode.toUpperCase()}] Sent ${amount} sats. New balance: ${data.balance}`);

  // Return the encoded token string
  return token;
}

/**
 * Send P2PK-locked tokens from house wallet
 * @param amount - Amount to send in sats
 * @param p2pkPubkey - Public key to lock tokens to
 * @param mode - Wallet mode (demo or real)
 * @returns Encoded token string with P2PK lock, proofs, and mint URL
 */
export async function sendFromHouseP2PK(
  amount: number,
  p2pkPubkey: string,
  mode: WalletMode = "demo"
): Promise<{ token: string; proofs: any[]; mintUrl: string }> {
  const { wallet } = await getHouseWallet(mode);
  const data = await loadWalletData(mode);

  const balance = data.proofs.reduce((sum, proof) => sum + proof.amount, 0);

  if (balance < amount) {
    throw new Error(`Insufficient house balance. Have ${balance} sats, need ${amount} sats`);
  }

  // Send with P2PK lock
  // @ts-ignore - P2PK options are supported but not in type definitions
  const result = await wallet.send(amount, data.proofs, {
    pubkey: p2pkPubkey,
    includeFees: true,
  } as any);

  console.log("[Debug] wallet.send() with P2PK result:", JSON.stringify(result, null, 2));

  // Extract sent proofs and change from result
  const sentProofs = result.send || [];
  const changeProofs = result.keep || [];

  if (!sentProofs || sentProofs.length === 0) {
    throw new Error("No proofs to send");
  }

  const mintUrl = getMintUrl(mode);

  // Manually encode the token (the library encoding functions have issues)
  // Cashu token format: cashuA + base64(JSON)
  const tokenData = {
    token: [
      {
        mint: mintUrl,
        proofs: sentProofs,
      },
    ],
  };

  const jsonString = JSON.stringify(tokenData);
  const base64Token = Buffer.from(jsonString).toString("base64");
  const token = "cashuA" + base64Token;

  // Update our stored proofs with the change
  data.proofs = changeProofs;
  data.balance = changeProofs.reduce((sum, proof) => sum + proof.amount, 0);
  data.lastUpdated = new Date().toISOString();

  await saveWalletData(data, mode);

  console.log(`[House Wallet ${mode.toUpperCase()}] Sent ${amount} sats with P2PK lock. New balance: ${data.balance}`);

  return { token, proofs: sentProofs, mintUrl };
}

/**
 * Initialize house wallet with initial funding
 * This should be called once when setting up the casino
 * @param token - Initial Cashu token to fund the house
 * @param mode - Wallet mode (demo or real)
 */
export async function initializeHouseWallet(token: string, mode: WalletMode = "demo"): Promise<number> {
  console.log(`[House Wallet ${mode.toUpperCase()}] Initializing with seed funding...`);
  const amount = await receiveToHouse(token, mode);
  console.log(`[House Wallet ${mode.toUpperCase()}] Initialized with ${amount} sats`);
  return amount;
}

/**
 * Get wallet statistics
 */
export async function getWalletStats(mode: WalletMode = "demo"): Promise<{
  balance: number;
  proofCount: number;
  lastUpdated: string;
}> {
  const data = await loadWalletData(mode);
  return {
    balance: data.balance,
    proofCount: data.proofs.length,
    lastUpdated: data.lastUpdated,
  };
}

// Export type for use in other modules
export type { WalletMode };
