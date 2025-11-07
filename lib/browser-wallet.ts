"use client";

import { Proof } from "@cashu/cashu-ts";
import * as cbor from "cbor-web";

const WALLET_STORAGE_KEY = "cashu_browser_wallet_proofs";
const MINT_URL = process.env.NEXT_PUBLIC_CASHU_MINT_URL || "https://mint.minibits.cash/Bitcoin";

export interface WalletState {
  balance: number;
  proofs: Proof[];
  mintUrl?: string;
  tokenVersion?: "v3" | "v4"; // Track which format the proofs came from
}

/**
 * Browser-based Cashu wallet
 * Stores proofs in localStorage for privacy and convenience
 * Works natively with both v3 and v4 tokens
 */
export class BrowserCashuWallet {
  private proofs: Proof[] = [];
  private mintUrl: string = MINT_URL;
  private tokenVersion: "v3" | "v4" = "v4"; // Default to v4

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load wallet from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(WALLET_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.proofs = data.proofs || [];
        this.mintUrl = data.mintUrl || MINT_URL;
      }
    } catch (error) {
      console.error("Error loading wallet from storage:", error);
      this.proofs = [];
      this.mintUrl = MINT_URL;
    }
  }

  /**
   * Save wallet to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const data = {
        proofs: this.proofs,
        mintUrl: this.mintUrl,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Error saving wallet to storage:", error);
    }
  }

  /**
   * Get current balance
   */
  getBalance(): number {
    return this.proofs.reduce((sum, proof) => sum + proof.amount, 0);
  }

  /**
   * Get current state
   */
  getState(): WalletState {
    return {
      balance: this.getBalance(),
      proofs: this.proofs,
    };
  }

  /**
   * Deposit Cashu token into wallet
   * Sends token to server to claim it, receives fresh proofs back
   * @param token - Encoded Cashu token string (v3 or v4)
   */
  async deposit(token: string): Promise<{ success: boolean; amount: number; error?: string }> {
    try {
      // Send token to server to claim it and get fresh proofs back
      const response = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, amount: 0, error: data.error || "Failed to deposit token" };
      }

      // Now decode the FRESH token from server and store those proofs
      const freshToken = data.token;
      let base64Part: string;
      let isV4 = false;

      if (freshToken.startsWith("cashuA")) {
        // v3 token format
        base64Part = freshToken.slice(6);
      } else if (freshToken.startsWith("cashuB")) {
        // v4 token format
        base64Part = freshToken.slice(6);
        isV4 = true;
      } else {
        return { success: false, amount: 0, error: "Invalid token format from server" };
      }

      let decoded;
      try {
        if (isV4) {
          // V4 tokens use base64url encoding + CBOR
          // Base64url decoding: replace - with + and _ with /, then decode
          const base64Standard = base64Part.replace(/-/g, '+').replace(/_/g, '/');
          // Add padding if needed
          const padding = '='.repeat((4 - (base64Standard.length % 4)) % 4);

          // Decode base64 to binary
          const binaryString = atob(base64Standard + padding);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Decode CBOR
          decoded = cbor.decode(bytes.buffer);
        } else {
          // V3 tokens use standard base64 + JSON
          const decodedString = atob(base64Part);
          decoded = JSON.parse(decodedString);
        }
      } catch (decodeError) {
        console.error("Failed to decode token:", decodeError);
        console.error("Token prefix:", token.substring(0, 10));
        console.error("Base64 part (first 50 chars):", base64Part.substring(0, 50));
        return { success: false, amount: 0, error: `Failed to decode token: ${decodeError instanceof Error ? decodeError.message : 'Unknown error'}` };
      }

      // Helper function to convert Buffer/Uint8Array to hex string
      const bufferToHex = (buffer: any): string => {
        if (!buffer) {
          console.warn("bufferToHex: buffer is null/undefined");
          return "";
        }

        let bytes: Uint8Array;

        // Handle different buffer formats
        if (buffer instanceof Uint8Array) {
          bytes = buffer;
        } else if (buffer.data && Array.isArray(buffer.data)) {
          bytes = new Uint8Array(buffer.data);
        } else if (Array.isArray(buffer)) {
          bytes = new Uint8Array(buffer);
        } else {
          console.warn("Unknown buffer format for bufferToHex:", buffer);
          console.warn("Buffer type:", typeof buffer);
          console.warn("Buffer constructor:", buffer.constructor?.name);
          return "";
        }

        const hex = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        console.log("bufferToHex converted:", bytes.length, "bytes ->", hex.substring(0, 20) + "...");
        return hex;
      };

      // Helper function to convert Buffer/Uint8Array to base64url string (for keyset IDs)
      const bufferToBase64Url = (buffer: any): string => {
        if (!buffer) {
          console.warn("bufferToBase64Url: buffer is null/undefined");
          return "";
        }

        let bytes: Uint8Array;

        // Handle different buffer formats
        if (buffer instanceof Uint8Array) {
          bytes = buffer;
        } else if (buffer.data && Array.isArray(buffer.data)) {
          bytes = new Uint8Array(buffer.data);
        } else if (Array.isArray(buffer)) {
          bytes = new Uint8Array(buffer);
        } else {
          console.warn("Unknown buffer format for bufferToBase64Url:", buffer);
          console.warn("Buffer type:", typeof buffer);
          console.warn("Buffer constructor:", buffer.constructor?.name);
          return "";
        }

        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        // Convert to base64 then to base64url
        const base64url = btoa(binary)
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");

        console.log("bufferToBase64Url converted:", bytes.length, "bytes ->", base64url);
        return base64url;
      };

      // V4 tokens have a different structure
      let tokenEntries;
      if (isV4) {
        // V4 CBOR format: { t: [...], m: "mint_url", u: "sat", d: "memo" }
        // t = token array, each with { i: keyset_id, p: proofs }
        if (decoded.t && Array.isArray(decoded.t)) {
          // Convert v4 CBOR format to v3-compatible format
          tokenEntries = decoded.t.map((entry: any) => {
            // Keyset ID must be base64url encoded, not hex
            const keysetId = bufferToBase64Url(entry.i);

            // Convert v4 proofs to v3 format
            console.log("Converting v4 proofs, sample proof.c:", entry.p?.[0]?.c);
            console.log("Converting v4 proofs, sample proof.d.r:", entry.p?.[0]?.d?.r);

            const proofs = (entry.p || []).map((proof: any) => {
              const converted = {
                id: keysetId,
                amount: proof.a,
                secret: proof.s,
                C: bufferToHex(proof.c),
                // DLEQ proof is optional, convert if present
                ...(proof.d && {
                  dleq: {
                    r: bufferToHex(proof.d.r),
                    e: bufferToHex(proof.d.e),
                    s: bufferToHex(proof.d.s),
                  },
                }),
              };
              console.log("Converted v4 proof to v3:", converted);
              return converted;
            });

            return {
              mint: decoded.m || MINT_URL,
              proofs,
            };
          });

          // Store the mint URL from the v4 token
          if (decoded.m) {
            this.mintUrl = decoded.m;
          }
        } else {
          console.error("Unknown V4 token structure:", JSON.stringify(decoded, null, 2));
          return { success: false, amount: 0, error: "Invalid v4 token structure - check console" };
        }
      } else {
        // V3 format
        if (!decoded.token || !Array.isArray(decoded.token)) {
          console.error("V3 token structure:", decoded);
          return { success: false, amount: 0, error: "Invalid v3 token structure" };
        }
        tokenEntries = decoded.token;

        // Store the mint URL from the v3 token (use first entry's mint)
        if (tokenEntries.length > 0 && tokenEntries[0].mint) {
          this.mintUrl = tokenEntries[0].mint;
        }
      }

      // Extract proofs from all token entries
      let totalAmount = 0;
      for (const entry of tokenEntries) {
        if (!entry.proofs || !Array.isArray(entry.proofs)) {
          console.warn("Skipping entry without proofs:", entry);
          continue;
        }

        // Add proofs to wallet
        for (const proof of entry.proofs) {
          this.proofs.push(proof);
          totalAmount += proof.amount;
        }
      }

      if (totalAmount === 0) {
        return { success: false, amount: 0, error: "No valid proofs found in token" };
      }

      this.saveToStorage();

      return { success: true, amount: totalAmount };
    } catch (error) {
      console.error("Error depositing token:", error);
      return { success: false, amount: 0, error: `Failed to decode token: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Create a token for betting
   * Selects proofs to cover the bet amount
   * Returns a v3 token
   * @param amount - Amount in sats to bet
   */
  createBetToken(amount: number): { success: boolean; token?: string; error?: string } {
    const balance = this.getBalance();

    if (balance < amount) {
      return {
        success: false,
        error: `Insufficient balance. Have ${balance} sats, need ${amount} sats`,
      };
    }

    try {
      // Select proofs to cover the amount
      let selectedAmount = 0;
      const selectedProofs: Proof[] = [];
      const remainingProofs: Proof[] = [];

      for (const proof of this.proofs) {
        if (selectedAmount < amount) {
          selectedProofs.push(proof);
          selectedAmount += proof.amount;
        } else {
          remainingProofs.push(proof);
        }
      }

      if (selectedAmount < amount) {
        return { success: false, error: "Could not select enough proofs" };
      }

      // Create v3 token from selected proofs (use the mint URL from deposited token)
      console.log("===== BET TOKEN DEBUG =====");
      console.log("Bet amount requested:", amount);
      console.log("Selected amount:", selectedAmount);
      console.log("Selected proofs:", selectedProofs);
      console.log("Remaining proofs after selection:", remainingProofs);
      console.log("Current balance before bet:", this.getBalance());
      console.log("Using mint URL:", this.mintUrl);

      const tokenData = {
        token: [
          {
            mint: this.mintUrl,
            proofs: selectedProofs,
          },
        ],
      };

      console.log("Bet token data:", JSON.stringify(tokenData, null, 2));

      const jsonString = JSON.stringify(tokenData);
      const base64Token = btoa(jsonString);
      const token = "cashuA" + base64Token;

      console.log("Created bet token (first 100 chars):", token.substring(0, 100));

      // Update wallet: remove selected proofs
      this.proofs = remainingProofs;
      this.saveToStorage();

      const newBalance = this.getBalance();
      console.log("New balance after removing selected proofs:", newBalance);
      console.log("===== END BET TOKEN DEBUG =====");

      return { success: true, token };
    } catch (error) {
      console.error("Error creating bet token:", error);
      return { success: false, error: "Failed to create token" };
    }
  }

  /**
   * Receive a payout token (add to wallet)
   * @param token - Payout token from server
   */
  async receivePayout(token: string): Promise<{ success: boolean; amount: number; error?: string }> {
    return await this.deposit(token);
  }

  /**
   * Create a v4 token from proofs
   * @param proofs - Array of proofs to encode
   * @param mintUrl - Mint URL for the token
   */
  private createV4Token(proofs: Proof[], mintUrl: string): string {
    // Helper to convert hex string to Uint8Array
    const hexToBytes = (hex: string): Uint8Array => {
      if (!hex) return new Uint8Array(0);
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      }
      return bytes;
    };

    // Helper to convert base64url string to Uint8Array (for keyset IDs)
    const base64UrlToBytes = (base64url: string): Uint8Array => {
      if (!base64url) return new Uint8Array(0);
      // Convert base64url to standard base64
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      const padding = '='.repeat((4 - (base64.length % 4)) % 4);
      const binaryString = atob(base64 + padding);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    };

    // Group proofs by keyset ID
    const proofsByKeyset = new Map<string, Proof[]>();
    for (const proof of proofs) {
      const keysetId = proof.id || "";
      if (!proofsByKeyset.has(keysetId)) {
        proofsByKeyset.set(keysetId, []);
      }
      proofsByKeyset.get(keysetId)!.push(proof);
    }

    // Build v4 token structure
    const tokenEntries = [];
    for (const [keysetId, keysetProofs] of proofsByKeyset) {
      const v4Proofs = keysetProofs.map((proof) => {
        const v4Proof: any = {
          a: proof.amount,
          s: proof.secret,
          c: hexToBytes(proof.C),
        };

        // Add DLEQ if present
        if (proof.dleq && proof.dleq.r && proof.dleq.e && proof.dleq.s) {
          v4Proof.d = {
            r: hexToBytes(proof.dleq.r),
            e: hexToBytes(proof.dleq.e),
            s: hexToBytes(proof.dleq.s),
          };
        }

        return v4Proof;
      });

      tokenEntries.push({
        i: base64UrlToBytes(keysetId),
        p: v4Proofs,
      });
    }

    // Create v4 token data structure
    const v4TokenData = {
      t: tokenEntries,
      m: mintUrl,
      u: "sat",
      d: "", // memo (empty)
    };

    // Encode with CBOR
    const cborEncoded = cbor.encode(v4TokenData);

    // Convert to base64url
    const bytes = new Uint8Array(cborEncoded);
    let binaryString = "";
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binaryString);
    const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

    return "cashuB" + base64url;
  }

  /**
   * Withdraw all funds from wallet
   * Returns a v3 token with all proofs
   */
  withdrawAll(): { success: boolean; token?: string; amount: number; error?: string } {
    const balance = this.getBalance();

    if (balance === 0) {
      return { success: false, amount: 0, error: "Wallet is empty" };
    }

    try {
      console.log("===== WITHDRAWAL DEBUG =====");
      console.log("Number of proofs:", this.proofs.length);
      console.log("First proof:", this.proofs[0]);
      console.log("Token version:", this.tokenVersion);
      console.log("Mint URL:", this.mintUrl);

      // Create v3 token with all proofs (use the mint URL from deposited token)
      const tokenData = {
        token: [
          {
            mint: this.mintUrl,
            proofs: this.proofs,
          },
        ],
      };

      console.log("Token data to encode:", JSON.stringify(tokenData, null, 2));

      const jsonString = JSON.stringify(tokenData);
      const base64Token = btoa(jsonString);
      const token = "cashuA" + base64Token;

      console.log("Created token (first 100):", token.substring(0, 100));
      console.log("===== END WITHDRAWAL DEBUG =====");

      // Clear wallet
      this.proofs = [];
      this.saveToStorage();

      return { success: true, token, amount: balance };
    } catch (error) {
      console.error("Error withdrawing:", error);
      return { success: false, amount: 0, error: "Failed to create withdrawal token" };
    }
  }

  /**
   * Withdraw specific amount from wallet
   * Returns a v3 token
   */
  withdraw(amount: number): { success: boolean; token?: string; error?: string } {
    const balance = this.getBalance();

    if (balance < amount) {
      return {
        success: false,
        error: `Insufficient balance. Have ${balance} sats, need ${amount} sats`,
      };
    }

    try {
      // Select proofs to cover the amount
      let selectedAmount = 0;
      const selectedProofs: Proof[] = [];
      const remainingProofs: Proof[] = [];

      for (const proof of this.proofs) {
        if (selectedAmount < amount) {
          selectedProofs.push(proof);
          selectedAmount += proof.amount;
        } else {
          remainingProofs.push(proof);
        }
      }

      // Create v3 token from selected proofs (use the mint URL from deposited token)
      const tokenData = {
        token: [
          {
            mint: this.mintUrl,
            proofs: selectedProofs,
          },
        ],
      };

      const jsonString = JSON.stringify(tokenData);
      const base64Token = btoa(jsonString);
      const token = "cashuA" + base64Token;

      // Update wallet
      this.proofs = remainingProofs;
      this.saveToStorage();

      return { success: true, token };
    } catch (error) {
      console.error("Error withdrawing:", error);
      return { success: false, error: "Failed to create withdrawal token" };
    }
  }

  /**
   * Clear wallet (for testing/reset)
   */
  clear(): void {
    this.proofs = [];
    this.saveToStorage();
  }

  /**
   * Export wallet as backup string
   */
  exportBackup(): string {
    return JSON.stringify({
      proofs: this.proofs,
      balance: this.getBalance(),
      exportedAt: new Date().toISOString(),
    });
  }

  /**
   * Import wallet from backup string
   */
  importBackup(backupString: string): { success: boolean; error?: string } {
    try {
      const backup = JSON.parse(backupString);

      if (!backup.proofs || !Array.isArray(backup.proofs)) {
        return { success: false, error: "Invalid backup format" };
      }

      this.proofs = backup.proofs;
      this.saveToStorage();

      return { success: true };
    } catch (error) {
      console.error("Error importing backup:", error);
      return { success: false, error: "Failed to import backup" };
    }
  }
}

// Singleton instance
let walletInstance: BrowserCashuWallet | null = null;

export function getWallet(): BrowserCashuWallet {
  if (!walletInstance) {
    walletInstance = new BrowserCashuWallet();
  }
  return walletInstance;
}
