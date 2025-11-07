import { NextRequest, NextResponse } from "next/server";
import { getWalletStats, getHouseBalance, initializeHouseWallet, type WalletMode } from "@/lib/wallet-manager";

// Simple admin authentication - in production, use a proper auth system
const ADMIN_KEY = process.env.ADMIN_API_KEY || "change-this-in-production";

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${ADMIN_KEY}`;
}

/**
 * GET /api/admin/wallet?mode=demo|real - Get wallet stats for specified mode
 * Query params:
 *   - mode: "demo" or "real" (default: "demo")
 */
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get("mode") || "demo") as WalletMode;

    console.log(`[Admin API] GET request with mode: ${mode}`);

    if (mode !== "demo" && mode !== "real") {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "demo" or "real"' },
        { status: 400 }
      );
    }

    const stats = await getWalletStats(mode);
    const balance = await getHouseBalance(mode);

    console.log(`[Admin API] Mode=${mode}, Balance=${balance}, ProofCount=${stats.proofCount}`);

    return NextResponse.json({
      mode,
      balance,
      proofCount: stats.proofCount,
      lastUpdated: stats.lastUpdated,
      status: "ok",
    });
  } catch (error) {
    console.error("Error getting wallet stats:", error);
    return NextResponse.json(
      { error: "Failed to get wallet stats" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/wallet - Initialize or fund wallet
 * Body: { token: string, mode?: "demo" | "real" }
 */
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { token, mode = "demo" } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token required" },
        { status: 400 }
      );
    }

    if (mode !== "demo" && mode !== "real") {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "demo" or "real"' },
        { status: 400 }
      );
    }

    const amount = await initializeHouseWallet(token, mode as WalletMode);
    const newBalance = await getHouseBalance(mode as WalletMode);

    return NextResponse.json({
      message: "Wallet funded successfully",
      mode,
      added: amount,
      newBalance,
    });
  } catch (error) {
    console.error("Error funding wallet:", error);
    return NextResponse.json(
      { error: "Failed to fund wallet", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
