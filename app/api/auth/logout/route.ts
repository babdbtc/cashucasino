import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth-middleware";

/**
 * POST /api/auth/logout
 * Logout current user
 */
export async function POST(req: NextRequest) {
  try {
    const sessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (sessionId) {
      deleteSession(sessionId);
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear cookie
    response.cookies.delete(SESSION_COOKIE_NAME);

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to log out" },
      { status: 500 }
    );
  }
}
