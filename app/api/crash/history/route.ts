import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-middleware";
import { getCrashHistory } from "@/lib/crash-db";

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's wallet mode
    const walletMode = user.wallet_mode;

    // Get query params
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json({
        error: "Limit must be between 1 and 100"
      }, { status: 400 });
    }

    // Get crash history
    const history = getCrashHistory(limit, walletMode);

    return NextResponse.json({
      history,
    });
  } catch (error) {
    console.error("[CRASH_HISTORY_ERROR]", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
