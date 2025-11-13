import { NextRequest, NextResponse } from "next/server";
import { sendFromHouse, getHouseBalance } from "@/lib/wallet-manager";
import { isRateLimited } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { subtractFromBalance, getUserBalance, addToBalance, updateWithdrawalToken } from "@/lib/auth";
import { sendCashuTokenViaDM, fetchNostrProfile } from "@/lib/nostr";

/**
 * Nostr Withdraw API - Send Cashu token via Nostr DM
 *
 * User requests withdrawal → We deduct balance → Create token → Send via Nostr DM
 */
export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has Nostr pubkey linked
    if (!user.nostr_pubkey) {
      return NextResponse.json(
        { error: "No Nostr account linked. Please link your Nostr account first." },
        { status: 400 }
      );
    }

    // Rate limiting based on IP
    const ip = req.headers.get("x-forwarded-for") ||
                req.headers.get("x-real-ip") ||
                "unknown";

    // Allow 10 withdrawals per minute per IP
    if (isRateLimited(ip, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many withdrawal requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { amount } = body;

    // Validate input
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid withdrawal amount" },
        { status: 400 }
      );
    }

    // Check minimum withdrawal (1 sat)
    if (amount < 1) {
      return NextResponse.json(
        { error: "Minimum withdrawal is 1 sat" },
        { status: 400 }
      );
    }

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Check user balance (from the appropriate database)
    const userBalance = getUserBalance(user.id, walletMode);
    if (userBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient balance. You have ${userBalance} sats, need ${amount} sats` },
        { status: 400 }
      );
    }

    // Check house wallet balance (for the appropriate mode)
    const houseBalance = await getHouseBalance(walletMode);
    if (houseBalance < amount) {
      console.error(`[Withdraw Nostr ${walletMode.toUpperCase()}] Insufficient house balance. Requested: ${amount}, Available: ${houseBalance}`);
      return NextResponse.json(
        { error: "Casino cannot process withdrawal at this time. Please contact support." },
        { status: 503 }
      );
    }

    // CRITICAL: Deduct from user's balance FIRST before creating token
    const newBalance = subtractFromBalance(user.id, amount, "withdraw", walletMode, `Nostr DM withdrawal`);

    if (newBalance === null) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Now create withdrawal token from house wallet
    // If this fails, we need to refund the user's balance
    let token: string;
    try {
      token = await sendFromHouse(amount, walletMode);
      console.log(`[Withdraw Nostr ${walletMode.toUpperCase()}] User ${user.id} withdrew ${amount} sats`);

      // Save the token in the transaction record for withdrawal history
      updateWithdrawalToken(user.id, walletMode, token);
    } catch (error) {
      console.error("Withdrawal token creation error:", error);

      // CRITICAL: Refund the balance since token creation failed
      addToBalance(user.id, amount, "refund", walletMode, "Nostr withdrawal token creation failed - refund");

      return NextResponse.json(
        { error: "Failed to create withdrawal token. Your balance has been refunded." },
        { status: 500 }
      );
    }

    // Send token via Nostr DM
    try {
      await sendCashuTokenViaDM(user.nostr_pubkey, token, amount);

      console.log(`[Withdraw Nostr ${walletMode.toUpperCase()}] Sent ${amount} sats via DM to ${user.nostr_pubkey.substring(0, 8)}...`);

      return NextResponse.json({
        success: true,
        amount,
        newBalance,
        message: `Successfully sent ${amount} sats to your Nostr wallet via DM`,
      });
    } catch (error) {
      console.error("Failed to send Nostr DM:", error);

      // Token was created but DM failed
      // Return the token so user can claim it manually
      return NextResponse.json({
        success: true,
        amount,
        token, // Fallback: give user the token directly
        newBalance,
        message: `Withdrawal successful but failed to send DM. Here's your token:`,
        warning: "Failed to send via Nostr DM. Please claim this token manually in your Cashu wallet.",
      });
    }

  } catch (error) {
    console.error("Nostr withdrawal error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your withdrawal" },
      { status: 500 }
    );
  }
}
