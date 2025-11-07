import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { leaveTable } from "@/lib/blackjack-manager";

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;
    const body = await req.json();
    const { tableId } = body;

    if (!tableId) {
      return NextResponse.json(
        { error: "Table ID required" },
        { status: 400 }
      );
    }

    // Leave the table
    leaveTable(tableId, userId);

    return NextResponse.json({
      success: true,
      message: "Left table successfully",
    });
  } catch (error) {
    console.error("[Blackjack Leave Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
