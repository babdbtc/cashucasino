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

    // Additional user-based rate limiting (prevents VPN/TOR bypass)
    if (isRateLimited(`user:${user.id}`, 15, 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many claim requests from your account. Please wait a moment." },
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
    const db = getDatabase(walletMode);

    // CRITICAL: Use transaction to prevent race condition double-spend
    // Lock the deposit row by checking state atomically
    const processPayment = db.transaction((quoteId: string, userId: number) => {
      // Lock this specific deposit by checking state in one atomic operation
      // Allow UNPAID or CHECK_FAILED (so users can retry after transient errors)
      const deposit = db.prepare(`
        SELECT * FROM lightning_deposits
        WHERE quote_id = ? AND user_id = ? AND state IN ('UNPAID', 'CHECK_FAILED')
      `).get(quoteId, userId) as any;

      if (!deposit) {
        // Either doesn't exist, already processed, or doesn't belong to user
        const existingDeposit = db.prepare(`
          SELECT state, amount, retry_count FROM lightning_deposits WHERE quote_id = ? AND user_id = ?
        `).get(quoteId, userId) as any;

        if (existingDeposit?.state === "PAID") {
          return { alreadyProcessed: true, amount: existingDeposit.amount };
        }
        if (existingDeposit?.state === "PROCESSING") {
          return { processing: true };
        }
        if (existingDeposit?.state === "CHECK_FAILED" && (existingDeposit.retry_count || 0) >= 10) {
          return { tooManyRetries: true };
        }
        return { notFound: true };
      }

      // Check retry limit for CHECK_FAILED deposits (prevent spam/DoS)
      if (deposit.state === 'CHECK_FAILED' && (deposit.retry_count || 0) >= 10) {
        return { tooManyRetries: true };
      }

      // Check expiry
      if (deposit.expiry < Math.floor(Date.now() / 1000)) {
        db.prepare(`UPDATE lightning_deposits SET state = 'EXPIRED' WHERE quote_id = ?`).run(quoteId);
        return { expired: true };
      }

      // Increment retry count if retrying a CHECK_FAILED deposit
      if (deposit.state === 'CHECK_FAILED') {
        db.prepare(`
          UPDATE lightning_deposits
          SET retry_count = retry_count + 1
          WHERE quote_id = ?
        `).run(quoteId);
      }

      // Immediately mark as PROCESSING to prevent concurrent claims
      db.prepare(`
        UPDATE lightning_deposits SET state = 'PROCESSING' WHERE quote_id = ?
      `).run(quoteId);

      return { success: true, deposit };
    });

    // Execute transaction atomically
    let claimResult;
    try {
      claimResult = processPayment(quoteId, user.id);
    } catch (error) {
      console.error("[Lightning Claim] Transaction error:", error);
      return NextResponse.json(
        { error: "Failed to process claim" },
        { status: 500 }
      );
    }

    // Handle transaction results
    if (claimResult.notFound) {
      return NextResponse.json(
        { error: "Lightning deposit not found or does not belong to you" },
        { status: 404 }
      );
    }

    if (claimResult.alreadyProcessed) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        amount: claimResult.amount,
        message: "This Lightning deposit has already been processed",
      });
    }

    if (claimResult.processing) {
      return NextResponse.json({
        success: false,
        paid: false,
        state: "PROCESSING",
        message: "Lightning invoice is being processed by another request",
      });
    }

    if (claimResult.tooManyRetries) {
      return NextResponse.json(
        { error: "Too many retry attempts. Please contact support if the issue persists." },
        { status: 429 }
      );
    }

    if (claimResult.expired) {
      return NextResponse.json(
        { error: "Lightning invoice has expired" },
        { status: 400 }
      );
    }

    const deposit = claimResult.deposit;

    // Check Lightning payment status with mint (outside transaction)
    let paymentStatus: { paid: boolean; state: string; expiry: number };
    try {
      paymentStatus = await checkLightningPayment(quoteId, walletMode);
      console.log(`[Lightning Claim ${walletMode.toUpperCase()}] Checked payment for user ${user.id}, quote ${quoteId}, paid=${paymentStatus.paid}`);
    } catch (error) {
      console.error("[Lightning Claim] Mint communication error:", error);
      // Mark as CHECK_FAILED so we can retry
      db.prepare(`
        UPDATE lightning_deposits SET state = 'CHECK_FAILED' WHERE quote_id = ?
      `).run(quoteId);
      return NextResponse.json(
        { error: "Failed to check Lightning payment status. Please try again." },
        { status: 500 }
      );
    }

    // If not paid yet, update state and return pending status
    // IMPORTANT: Only update state to PAID after successful minting+crediting
    if (!paymentStatus.paid) {
      db.prepare(`
        UPDATE lightning_deposits
        SET state = ?
        WHERE quote_id = ?
      `).run(paymentStatus.state, quoteId);

      return NextResponse.json({
        success: false,
        paid: false,
        state: paymentStatus.state,
        message: "Lightning invoice is not yet paid",
      });
    }

    // Payment is confirmed by mint - but keep state as PROCESSING until we complete minting+crediting

    // Payment is confirmed! Mint tokens and credit balance
    let mintedAmount: number;
    try {
      // Mint tokens from Lightning payment
      mintedAmount = await mintFromLightning(deposit.amount, quoteId, walletMode);
      console.log(`[Lightning Claim ${walletMode.toUpperCase()}] Minted ${mintedAmount} sats from Lightning for user ${user.id}`);
    } catch (error) {
      console.error("[Lightning Claim] Minting error:", error);
      // Mark as MINT_FAILED for investigation
      db.prepare(`
        UPDATE lightning_deposits SET state = 'MINT_FAILED' WHERE quote_id = ?
      `).run(quoteId);
      return NextResponse.json(
        { error: "Failed to mint tokens from Lightning payment. Please contact support with quote ID: " + quoteId },
        { status: 500 }
      );
    }

    // Credit user's balance
    let newBalance: number;
    try {
      newBalance = addToBalance(user.id, mintedAmount, "deposit", walletMode, `Lightning deposit: ${mintedAmount} sats`);

      // Mark as fully PAID only after successful credit
      db.prepare(`UPDATE lightning_deposits SET state = 'PAID' WHERE quote_id = ?`).run(quoteId);

      console.log(`[Lightning Claim ${walletMode.toUpperCase()}] Credited ${mintedAmount} sats to user ${user.id}, new balance: ${newBalance}`);
    } catch (error) {
      console.error("[Lightning Claim] Balance credit error:", error);

      // CRITICAL: Tokens were minted but balance wasn't credited
      // Store in failed_credits table for manual recovery
      console.error(`[CRITICAL] Minted ${mintedAmount} sats for user ${user.id} but failed to credit balance! Quote ID: ${quoteId}`);

      db.prepare(`
        INSERT INTO failed_credits (user_id, quote_id, amount, error_message, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(user.id, quoteId, mintedAmount, String(error), Date.now());

      db.prepare(`
        UPDATE lightning_deposits SET state = 'CREDIT_FAILED' WHERE quote_id = ?
      `).run(quoteId);

      return NextResponse.json(
        { error: "Payment received but failed to credit balance. Please contact support with quote ID: " + quoteId },
        { status: 500 }
      );
    }

    // Success!
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
