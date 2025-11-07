import { NextRequest, NextResponse } from "next/server";
import { sendFromHouse, getHouseBalance, type WalletMode } from "@/lib/wallet-manager";

// Simple admin authentication
const ADMIN_KEY = process.env.ADMIN_API_KEY || "change-this-in-production";

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${ADMIN_KEY}`;
}

/**
 * POST /api/admin/withdraw - Withdraw funds from house wallet
 *
 * Body: { amount: number, mode?: "demo" | "real" }
 * Returns: { token: string, amount: number, newBalance: number, mode: string }
 */
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { amount, mode = "demo" } = body;

    // Validate mode
    if (mode !== "demo" && mode !== "real") {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "demo" or "real"' },
        { status: 400 }
      );
    }

    // Validate amount
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }

    // Check current balance
    const currentBalance = await getHouseBalance(mode as WalletMode);
    if (amount > currentBalance) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Available: ${currentBalance} sats, Requested: ${amount} sats`,
          currentBalance,
          mode
        },
        { status: 400 }
      );
    }

    // Withdraw the funds
    const token = await sendFromHouse(amount, mode as WalletMode);
    const newBalance = await getHouseBalance(mode as WalletMode);

    console.log(`[Casino Owner ${mode.toUpperCase()}] Withdrew ${amount} sats. New balance: ${newBalance}`);

    return NextResponse.json({
      message: "Withdrawal successful",
      token,
      amount,
      newBalance,
      mode,
    });

  } catch (error) {
    console.error("Withdrawal error:", error);
    return NextResponse.json(
      { error: "Failed to withdraw funds", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
