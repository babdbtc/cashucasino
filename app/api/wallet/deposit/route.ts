import { NextRequest, NextResponse } from "next/server";
import { receiveToHouse, sendFromHouse } from "@/lib/wallet-manager";
import { getCurrentUser } from "@/lib/auth-middleware";

/**
 * Deposit endpoint for browser wallet
 * Receives a token, claims it from the mint, and returns fresh proofs
 *
 * SECURITY: This endpoint is authenticated to prevent abuse of house wallet
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      );
    }

    // Get user's wallet mode (default to demo if not set)
    const walletMode = user.wallet_mode || "demo";

    // Atomic operation: Receive token and create fresh token
    // Both operations must succeed together or fail together
    let receivedAmount: number | undefined;
    let freshToken: string;

    try {
      // Step 1: Receive the token into house wallet (claim from mint)
      receivedAmount = await receiveToHouse(token, walletMode);
      console.log(`[Wallet ${walletMode.toUpperCase()}] User ${user.id} deposited ${receivedAmount} sats`);

      // Step 2: Immediately send back fresh proofs to user (same amount)
      freshToken = await sendFromHouse(receivedAmount, walletMode);
      console.log(`[Wallet ${walletMode.toUpperCase()}] Sent ${receivedAmount} sats back as fresh token`);

    } catch (error) {
      console.error("Wallet deposit error:", error);

      // CRITICAL: Log if token was claimed but fresh token creation failed
      if (receivedAmount) {
        console.error(`[CRITICAL] User ${user.id} deposited ${receivedAmount} sats but failed to receive fresh token. Timestamp: ${new Date().toISOString()}`);
        return NextResponse.json(
          {
            error: "Deposit received but failed to create fresh token. Please contact support immediately with this timestamp: " + new Date().toISOString(),
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

    // Both operations succeeded, return the fresh token
    return NextResponse.json({
      success: true,
      amount: receivedAmount,
      token: freshToken,
    });

  } catch (error) {
    console.error("Wallet deposit error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing deposit" },
      { status: 500 }
    );
  }
}
