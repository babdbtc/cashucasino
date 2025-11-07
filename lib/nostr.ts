import { SimplePool, nip19, nip04, nip44, getPublicKey, finalizeEvent, verifyEvent, type Event as NostrEvent } from "nostr-tools";

/**
 * Nostr utilities for authentication and Cashu token transfers
 */

// Default relays for the casino
export const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.snort.social",
];

// Casino's Nostr keypair (should be in environment variables)
export const CASINO_NOSTR_PRIVATE_KEY = process.env.CASINO_NOSTR_PRIVATE_KEY || "";
export const CASINO_NOSTR_PUBLIC_KEY = CASINO_NOSTR_PRIVATE_KEY
  ? getPublicKey(hexToBytes(CASINO_NOSTR_PRIVATE_KEY))
  : "";

// Helper to convert hex to bytes
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Helper to convert bytes to hex
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify a Nostr authentication event
 * Used for NIP-98 HTTP Auth
 */
export function verifyNostrAuth(event: NostrEvent, expectedChallenge: string): boolean {
  try {
    // Verify signature
    if (!verifyEvent(event)) {
      console.error("[Nostr] Invalid event signature");
      return false;
    }

    // Check event kind (27235 for NIP-98 HTTP Auth)
    if (event.kind !== 27235) {
      console.error("[Nostr] Invalid event kind:", event.kind);
      return false;
    }

    // Check challenge matches
    const challengeTag = event.tags.find(t => t[0] === "challenge");
    if (!challengeTag || challengeTag[1] !== expectedChallenge) {
      console.error("[Nostr] Challenge mismatch");
      return false;
    }

    // Check timestamp (event should be recent, within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(now - event.created_at);
    if (timeDiff > 300) {
      console.error("[Nostr] Event too old or in future:", timeDiff);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Nostr] Auth verification error:", error);
    return false;
  }
}

/**
 * Send a Cashu token via Nostr DM
 * Uses NIP-04 for encryption (deprecated but widely supported)
 */
export async function sendCashuTokenViaDM(
  recipientPubkey: string,
  token: string,
  amount: number,
  relays: string[] = DEFAULT_RELAYS
): Promise<void> {
  if (!CASINO_NOSTR_PRIVATE_KEY) {
    throw new Error("Casino Nostr private key not configured");
  }

  const pool = new SimplePool();

  try {
    // NIP-04 encryption for maximum compatibility with all Nostr clients
    const senderPrivkeyBytes = hexToBytes(CASINO_NOSTR_PRIVATE_KEY);
    const encryptedContent = await nip04.encrypt(CASINO_NOSTR_PRIVATE_KEY, recipientPubkey, token);

    // Create DM event (kind 4 with NIP-04 encryption)
    const dmEvent = finalizeEvent({
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["p", recipientPubkey],
        ["cashu", "true"], // Custom tag to identify Cashu tokens
        ["amount", amount.toString()],
      ],
      content: encryptedContent,
    }, senderPrivkeyBytes);

    // Publish to relays
    await Promise.any(
      relays.map(relay => pool.publish([relay], dmEvent))
    );

    console.log(`[Nostr] Sent ${amount} sats token to ${recipientPubkey.slice(0, 8)}...`);
  } catch (error) {
    console.error("[Nostr] Failed to send DM:", error);
    throw error;
  } finally {
    pool.close(relays);
  }
}

/**
 * Fetch user's Nostr profile metadata
 * Returns Cashu wallet info if available
 */
export async function fetchNostrProfile(pubkey: string, relays: string[] = DEFAULT_RELAYS): Promise<{
  name?: string;
  nip05?: string;
  cashuAddress?: string;
  cashuMints?: string[];
} | null> {
  const pool = new SimplePool();

  try {
    const events = await pool.querySync(relays, {
      kinds: [0], // Metadata
      authors: [pubkey],
      limit: 1,
    });

    if (events.length === 0) return null;

    const metadata = JSON.parse(events[0].content);

    return {
      name: metadata.name,
      nip05: metadata.nip05,
      cashuAddress: metadata.lud16 || metadata.nip05, // Often the same
      cashuMints: metadata.cashu?.mints || [],
    };
  } catch (error) {
    console.error("[Nostr] Failed to fetch profile:", error);
    return null;
  } finally {
    pool.close(relays);
  }
}

/**
 * Convert npub to hex pubkey
 */
export function npubToHex(npub: string): string {
  try {
    const decoded = nip19.decode(npub);
    if (decoded.type === "npub") {
      return decoded.data as string;
    }
    throw new Error("Invalid npub");
  } catch (error) {
    throw new Error("Invalid npub format");
  }
}

/**
 * Convert hex pubkey to npub
 */
export function hexToNpub(hex: string): string {
  try {
    return nip19.npubEncode(hex);
  } catch (error) {
    throw new Error("Invalid hex pubkey");
  }
}

/**
 * Generate a random challenge for authentication
 */
export function generateChallenge(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Fetch user's NIP-61 nutzap configuration (kind 10019)
 * Returns accepted mints and P2PK pubkey for receiving nutzaps
 */
export async function fetchNutzapConfig(pubkey: string, relays: string[] = DEFAULT_RELAYS): Promise<{
  mints: string[];
  p2pkPubkey: string;
  relays: string[];
} | null> {
  const pool = new SimplePool();

  try {
    const events = await pool.querySync(relays, {
      kinds: [10019], // NIP-61 nutzap config
      authors: [pubkey],
      limit: 1,
    });

    if (events.length === 0) return null;

    const event = events[0];
    const mints = event.tags.filter(t => t[0] === "mint").map(t => t[1]);
    const p2pkPubkeyTag = event.tags.find(t => t[0] === "pubkey");
    const relayTags = event.tags.filter(t => t[0] === "relay").map(t => t[1]);

    if (!p2pkPubkeyTag || mints.length === 0) {
      console.error("[Nostr] Invalid kind 10019 event - missing pubkey or mints");
      return null;
    }

    return {
      mints,
      p2pkPubkey: p2pkPubkeyTag[1],
      relays: relayTags.length > 0 ? relayTags : relays,
    };
  } catch (error) {
    console.error("[Nostr] Failed to fetch nutzap config:", error);
    return null;
  } finally {
    pool.close(relays);
  }
}

/**
 * Send a Cashu token via NIP-61 nutzap (kind 9321)
 * Tokens are P2PK-locked to recipient's pubkey
 */
export async function sendNutzap(
  recipientPubkey: string,
  proofs: any[], // Cashu proofs
  amount: number,
  mintUrl: string,
  relays: string[] = DEFAULT_RELAYS
): Promise<void> {
  if (!CASINO_NOSTR_PRIVATE_KEY) {
    throw new Error("Casino Nostr private key not configured");
  }

  const pool = new SimplePool();

  try {
    const senderPrivkeyBytes = hexToBytes(CASINO_NOSTR_PRIVATE_KEY);

    // Create nutzap event (kind 9321)
    const nutzapEvent = finalizeEvent({
      kind: 9321,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["p", recipientPubkey],
        ["u", mintUrl],
        ["unit", "sat"],
        ...proofs.map(proof => ["proof", JSON.stringify(proof)]),
      ],
      content: "", // Nutzaps have empty content - proofs are in tags
    }, senderPrivkeyBytes);

    // Publish to relays
    await Promise.any(
      relays.map(relay => pool.publish([relay], nutzapEvent))
    );

    console.log(`[Nostr] Sent ${amount} sats nutzap to ${recipientPubkey.slice(0, 8)}...`);
  } catch (error) {
    console.error("[Nostr] Failed to send nutzap:", error);
    throw error;
  } finally {
    pool.close(relays);
  }
}
