import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-middleware";
import { getUserWithdrawalHistory } from "@/lib/auth";

/**
 * GET /api/balance/withdrawal-history
 * Fetch user's withdrawal history with Cashu tokens
 */
export async function GET(req: NextRequest) {
  try {
    // Require authentication
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get wallet mode
    const walletMode = user.wallet_mode;

    // Fetch withdrawal history (only transactions with Cashu tokens)
    const withdrawals = getUserWithdrawalHistory(user.id, walletMode, 50);

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals.map(w => ({
        id: w.id,
        amount: Math.abs(w.amount), // Convert negative to positive for display
        token: w.cashu_token,
        metadata: w.metadata,
        created_at: w.created_at,
        date: new Date(w.created_at).toISOString(),
      })),
    });

  } catch (error) {
    console.error("Withdrawal history error:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching withdrawal history" },
      { status: 500 }
    );
  }
}
