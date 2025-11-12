import { NextRequest, NextResponse } from "next/server";
import { checkLightningPayment, mintFromLightning } from "@/lib/wallet-manager";
import { isRateLimited } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { addToBalance } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

/**
 * Lightning Deposit Claim API - Check payment and credit balance
 *
 * User requests claim → Server checks Lightning payment status
 * If paid, mint tokens from Lightning and credit user's balance
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

    // Rate limiting based on IP
    const ip = req.headers.get("x-forwarded-for") ||
                req.headers.get("x-real-ip") ||
                "unknown";

    // Allow 20 claim checks per minute per IP (users may poll this)
    if (isRateLimited(ip, 20, 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many claim requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { quoteId } = body;

    // Validate input
    if (!quoteId || typeof quoteId !== "string") {
      return NextResponse.json(
        { error: "Invalid quote ID" },
        { status: 400 }
      );
    }

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Get the Lightning deposit from database
    const db = getDatabase(walletMode);
    const deposit = db.prepare(`
      SELECT * FROM lightning_deposits
      WHERE quote_id = ? AND user_id = ?
    `).get(quoteId, user.id) as any;

    if (!deposit) {
      return NextResponse.json(
        { error: "Lightning deposit not found or does not belong to you" },
        { status: 404 }
      );
    }

    // If already paid and processed, return success
    if (deposit.state === "PAID") {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        amount: deposit.amount,
        message: "This Lightning deposit has already been processed",
      });
    }

    // Check if expired
    if (deposit.expiry < Math.floor(Date.now() / 1000)) {
      // Update state to EXPIRED
      db.prepare(`
        UPDATE lightning_deposits
        SET state = 'EXPIRED'
        WHERE quote_id = ?
      `).run(quoteId);

      return NextResponse.json(
        { error: "Lightning invoice has expired" },
        { status: 400 }
      );
    }

    // Check Lightning payment status
    let paymentStatus: { paid: boolean; state: string; expiry: number };
    try {
      paymentStatus = await checkLightningPayment(quoteId, walletMode);
      console.log(`[Lightning Claim ${walletMode.toUpperCase()}] Checked payment for user ${user.id}, quote ${quoteId}, paid=${paymentStatus.paid}`);
    } catch (error) {
      console.error("Lightning payment check error:", error);
      return NextResponse.json(
        { error: "Failed to check Lightning payment status" },
        { status: 500 }
      );
    }

    // Update state in database
    db.prepare(`
      UPDATE lightning_deposits
      SET state = ?
      WHERE quote_id = ?
    `).run(paymentStatus.state, quoteId);

    // If not paid yet, return pending status
    if (!paymentStatus.paid) {
      return NextResponse.json({
        success: false,
        paid: false,
        state: paymentStatus.state,
        message: "Lightning invoice is not yet paid",
      });
    }

    // Payment is confirmed! Mint tokens and credit balance
    let mintedAmount: number;
    try {
      // Mint tokens from Lightning payment
      mintedAmount = await mintFromLightning(deposit.amount, quoteId, walletMode);
      console.log(`[Lightning Claim ${walletMode.toUpperCase()}] Minted ${mintedAmount} sats from Lightning for user ${user.id}`);
    } catch (error) {
      console.error("Lightning minting error:", error);
      return NextResponse.json(
        { error: "Failed to mint tokens from Lightning payment. Please contact support." },
        { status: 500 }
      );
    }

    // Credit user's balance
    let newBalance: number;
    try {
      newBalance = addToBalance(user.id, mintedAmount, "deposit", walletMode, `Lightning deposit: ${mintedAmount} sats`);
      console.log(`[Lightning Claim ${walletMode.toUpperCase()}] Credited ${mintedAmount} sats to user ${user.id}, new balance: ${newBalance}`);
    } catch (error) {
      console.error("Balance credit error:", error);
      // This is serious - tokens were minted but balance wasn't credited
      // Log this for manual intervention
      console.error(`[CRITICAL] Minted ${mintedAmount} sats for user ${user.id} but failed to credit balance! Quote ID: ${quoteId}`);
      return NextResponse.json(
        { error: "Payment received but failed to credit balance. Please contact support with quote ID: " + quoteId },
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json({
      success: true,
      paid: true,
      amount: mintedAmount,
      newBalance,
      message: `Successfully deposited ${mintedAmount} sats from Lightning payment`,
    });

  } catch (error) {
    console.error("Lightning claim error:", error);
    return NextResponse.json(
      { error: "An error occurred while claiming Lightning deposit" },
      { status: 500 }
    );
  }
}
