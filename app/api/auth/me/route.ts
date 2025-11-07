import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-middleware";
import { formatAccountId } from "@/lib/auth";

/**
 * GET /api/auth/me
 * Get current user information including Nostr pubkey
 */
export async function GET(req: NextRequest) {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        accountId: formatAccountId(user.account_id), // Return formatted version
        nostrPubkey: user.nostr_pubkey,
        balance: user.balance,
        walletMode: user.wallet_mode,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user information" },
      { status: 500 }
    );
  }
}
