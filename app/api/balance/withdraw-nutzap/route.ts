import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { sendFromHouseP2PK, type WalletMode } from "@/lib/wallet-manager";
import { subtractFromBalance, updateWithdrawalToken } from "@/lib/auth";
import { fetchNutzapConfig, sendNutzap } from "@/lib/nostr";

/**
 * POST /api/balance/withdraw-nutzap
 * Withdraw balance as P2PK-locked Cashu tokens via NIP-61 nutzap
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    if (authResult.user.balance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Check if user has a Nostr pubkey
    if (!authResult.user.nostr_pubkey) {
      return NextResponse.json(
        { error: "No Nostr account linked. Please link your Nostr account first." },
        { status: 400 }
      );
    }

    // Fetch user's NIP-61 nutzap configuration
    console.log(`[Withdraw Nutzap] Fetching nutzap config for ${authResult.user.nostr_pubkey.slice(0, 8)}...`);
    const nutzapConfig = await fetchNutzapConfig(authResult.user.nostr_pubkey);

    if (!nutzapConfig) {
      return NextResponse.json(
        { error: "No nutzap configuration found. Please set up NIP-61 in your Nostr wallet (kind 10019 event)." },
        { status: 400 }
      );
    }

    console.log(`[Withdraw Nutzap] Found ${nutzapConfig.mints.length} accepted mints:`, nutzapConfig.mints);
    console.log(`[Withdraw Nutzap] P2PK pubkey: ${nutzapConfig.p2pkPubkey.slice(0, 8)}...`);

    // Ensure the P2PK pubkey has '02' or '03' prefix as required by NIP-61
    let p2pkPubkey = nutzapConfig.p2pkPubkey;
    if (!p2pkPubkey.startsWith('02') && !p2pkPubkey.startsWith('03')) {
      p2pkPubkey = '02' + p2pkPubkey;
      console.log(`[Withdraw Nutzap] Added '02' prefix to P2PK pubkey: ${p2pkPubkey.slice(0, 8)}...`);
    }

    // Send P2PK-locked tokens from house wallet
    const walletMode = authResult.user.wallet_mode as WalletMode;
    const { token, proofs, mintUrl } = await sendFromHouseP2PK(amount, p2pkPubkey, walletMode);

    // Check if user accepts tokens from this mint
    if (!nutzapConfig.mints.includes(mintUrl)) {
      return NextResponse.json(
        { error: `Your wallet does not accept tokens from ${mintUrl}. Please add this mint to your NIP-61 configuration.` },
        { status: 400 }
      );
    }

    console.log(`[Withdraw Nutzap] Created P2PK-locked token for ${amount} sats`);

    // Deduct from user balance and save token
    const newBalance = await subtractFromBalance(authResult.user.id, amount, "withdraw", authResult.user.wallet_mode, "Nutzap withdrawal", token);

    if (newBalance === null) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    console.log(`[Auth ${authResult.user.wallet_mode.toUpperCase()}] User ${authResult.user.id}: withdraw -${amount} sats, new balance: ${newBalance}`);

    // Send nutzap (kind 9321 event)
    await sendNutzap(
      authResult.user.nostr_pubkey,
      proofs,
      amount,
      mintUrl,
      nutzapConfig.relays
    );

    console.log(`[Withdraw Nutzap ${authResult.user.wallet_mode.toUpperCase()}] User ${authResult.user.id} withdrew ${amount} sats via nutzap`);

    return NextResponse.json({
      success: true,
      amount,
      newBalance,
      message: `Successfully sent ${amount} sats via nutzap. Your wallet should auto-import the tokens.`,
    });
  } catch (error) {
    console.error("Withdraw nutzap error:", error);
    return NextResponse.json(
      { error: "Failed to withdraw via nutzap", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
