import { NextRequest, NextResponse } from "next/server";
import { switchWalletMode, type WalletMode } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-middleware";

export async function POST(request: NextRequest) {
  try {
    // Get current authenticated user
    const user = getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { mode } = body;

    if (!mode) {
      return NextResponse.json(
        { error: "Missing mode parameter" },
        { status: 400 }
      );
    }

    if (mode !== "demo" && mode !== "real") {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'demo' or 'real'" },
        { status: 400 }
      );
    }

    // Switch wallet mode using user's account_id
    const updatedUser = switchWalletMode(user.account_id, mode as WalletMode);

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        account_id: updatedUser.account_id,
        balance: updatedUser.balance,
        wallet_mode: updatedUser.wallet_mode,
      },
    });
  } catch (error) {
    console.error("[API] Switch wallet mode error:", error);
    return NextResponse.json(
      { error: "Failed to switch wallet mode" },
      { status: 500 }
    );
  }
}
