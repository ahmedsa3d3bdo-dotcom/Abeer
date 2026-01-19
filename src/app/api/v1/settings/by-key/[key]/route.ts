import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function PUT() {
  return NextResponse.json({ success: false, error: { message: "Not found" } }, { status: 404 });
}
