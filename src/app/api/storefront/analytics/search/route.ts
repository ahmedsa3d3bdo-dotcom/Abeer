import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Minimal analytics sink: log to server console. Replace with DB/event pipeline as needed.
    console.info("[search-analytics]", body);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { message: e instanceof Error ? e.message : "Failed to record analytics" } },
      { status: 400 }
    );
  }
}
