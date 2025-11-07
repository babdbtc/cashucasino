import { NextRequest, NextResponse } from "next/server";
import { receiveToHouse } from "@/lib/wallet-manager";
import { getCurrentUser } from "@/lib/auth-middleware";
import { addToBalance } from "@/lib/auth";

/**
 * Nostr Deposit API - Receive Cashu token via request body
 *
 * User pastes token from their Nostr DMs or wallet
 * We verify and credit their account
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

    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      );
    }

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Atomic operation: Receive token and credit balance
    let receivedAmount: number | undefined;

    try {
      // Receive token into house wallet
      receivedAmount = await receiveToHouse(token, walletMode);
      console.log(`[Deposit Nostr ${walletMode.toUpperCase()}] User ${user.id} deposited ${receivedAmount} sats`);

      // Credit user's balance
      const newBalance = addToBalance(user.id, receivedAmount, "deposit", walletMode, "Nostr token deposit");

      return NextResponse.json({
        success: true,
        amount: receivedAmount,
        newBalance,
        message: `Successfully deposited ${receivedAmount} sats to your balance`,
      });
    } catch (error) {
      console.error("Nostr deposit error:", error);

      // CRITICAL: Log if token was claimed but balance update failed
      if (receivedAmount) {
        console.error(`[CRITICAL] User ${user.id} deposited ${receivedAmount} sats but failed to credit balance. Timestamp: ${new Date().toISOString()}`);
        return NextResponse.json(
          {
            error: "Deposit received but failed to update balance. Please contact support with timestamp: " + new Date().toISOString(),
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        );
      }

      // Token was never claimed, safe to return error
      return NextResponse.json(
        { error: "Failed to verify token. Token may be invalid or already spent." },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Deposit error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing deposit" },
      { status: 500 }
    );
  }
}
