import { NextRequest, NextResponse } from "next/server";
import { createLightningInvoice } from "@/lib/wallet-manager";
import { isRateLimited } from "@/lib/rate-limiter";
import { getCurrentUser } from "@/lib/auth-middleware";
import { getDatabase } from "@/lib/db";

/**
 * Lightning Deposit API - Create Lightning invoice for deposit
 *
 * User requests deposit amount → Server creates Lightning invoice
 * Invoice is stored in database linked to user's account
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

    // Allow 10 invoice requests per minute per IP
    if (isRateLimited(ip, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many invoice requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { amount } = body;

    // Validate input
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }

    // Check minimum amount (1 sat)
    if (amount < 1) {
      return NextResponse.json(
        { error: "Minimum deposit is 1 sat" },
        { status: 400 }
      );
    }

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Create Lightning invoice
    let invoice: { quoteId: string; invoice: string; expiry: number; state: string };
    try {
      invoice = await createLightningInvoice(amount, walletMode);
      console.log(`[Lightning Deposit ${walletMode.toUpperCase()}] Created invoice for user ${user.id}, amount ${amount} sats`);
    } catch (error) {
      console.error("Lightning invoice creation error:", error);
      return NextResponse.json(
        { error: "Failed to create Lightning invoice. Please try again." },
        { status: 500 }
      );
    }

    // Store invoice in database
    const db = getDatabase(walletMode);
    try {
      db.prepare(`
        INSERT INTO lightning_deposits (user_id, quote_id, amount, invoice, state, expiry, wallet_mode, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.id,
        invoice.quoteId,
        amount,
        invoice.invoice,
        invoice.state,
        invoice.expiry,
        walletMode,
        Date.now()
      );

      console.log(`[Lightning Deposit ${walletMode.toUpperCase()}] Stored invoice for user ${user.id}, quote_id ${invoice.quoteId}`);
    } catch (error) {
      console.error("Database error storing Lightning invoice:", error);
      return NextResponse.json(
        { error: "Failed to store Lightning invoice" },
        { status: 500 }
      );
    }

    // Return the invoice details
    return NextResponse.json({
      success: true,
      quoteId: invoice.quoteId,
      invoice: invoice.invoice,
      amount: amount,
      expiry: invoice.expiry,
      state: invoice.state,
      message: `Lightning invoice created for ${amount} sats. Pay this invoice to deposit to your balance.`,
    });

  } catch (error) {
    console.error("Lightning deposit error:", error);
    return NextResponse.json(
      { error: "An error occurred while creating Lightning invoice" },
      { status: 500 }
    );
  }
}
