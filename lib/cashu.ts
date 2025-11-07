import { Mint, Wallet, getDecodedToken, Proof } from "@cashu/cashu-ts";

const MINT_URL = process.env.NEXT_PUBLIC_CASHU_MINT_URL || "https://mint.minibits.cash/Bitcoin";

export interface TokenPayload {
  token: string;
  amount: number;
}

/**
 * Initialize a connection to the Cashu mint
 */
export async function initializeMint() {
  const mint = new Mint(MINT_URL);
  return mint;
}

/**
 * Initialize a Cashu wallet
 */
export async function initializeWallet() {
  const mint = await initializeMint();
  const wallet = new Wallet(mint);

  // Load keys from the mint (required in Cashu v3)
  await wallet.loadMint();

  return wallet;
}

/**
 * Verify and receive Cashu tokens
 * @param token - Encoded Cashu token
 * @returns Amount received in sats
 */
export async function receiveToken(token: string): Promise<number> {
  try {
    const wallet = await initializeWallet();
    const decodedToken = getDecodedToken(token) as any;

    if (!decodedToken || !decodedToken.token || decodedToken.token.length === 0) {
      throw new Error("Invalid token format");
    }

    // Extract proofs from token
    const proofs: Proof[] = decodedToken.token[0].proofs;

    // Calculate total amount
    const totalAmount = proofs.reduce((sum, proof) => sum + proof.amount, 0);

    // Receive the token (this will check with the mint and redeem)
    await wallet.receive(token);

    return totalAmount;
  } catch (error) {
    console.error("Error receiving token:", error);
    throw new Error("Failed to verify and receive token");
  }
}

/**
 * Send tokens (mint new tokens for payout)
 * @param amount - Amount in sats to send
 * @returns Encoded token string
 */
export async function sendToken(amount: number): Promise<string> {
  try {
    const wallet = await initializeWallet();

    // Mint new tokens
    const { send } = await (wallet as any).send(amount);

    return send;
  } catch (error) {
    console.error("Error sending token:", error);
    throw new Error("Failed to create payout token");
  }
}

/**
 * Verify a token is valid without receiving it
 * @param token - Encoded Cashu token
 * @returns Object with validity status and amount
 */
export async function verifyToken(token: string): Promise<{ valid: boolean; amount: number }> {
  try {
    const decodedToken = getDecodedToken(token) as any;

    if (!decodedToken || !decodedToken.token || decodedToken.token.length === 0) {
      return { valid: false, amount: 0 };
    }

    const proofs: Proof[] = decodedToken.token[0].proofs;
    const totalAmount = proofs.reduce((sum, proof) => sum + proof.amount, 0);

    // Check with mint if proofs are spendable
    const mint = await initializeMint();
    const wallet = new Wallet(mint);
    const spendableProofs = await (wallet as any).checkProofsSpent(proofs);

    // If any proof is already spent, token is invalid
    const allValid = spendableProofs.every((p: any) => !p.spent);

    return { valid: allValid, amount: totalAmount };
  } catch (error) {
    console.error("Error verifying token:", error);
    return { valid: false, amount: 0 };
  }
}
