import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const prev = request.cookies.get("prev_cart_id")?.value || null;
    const buyNow = request.cookies.get("buy_now_cart_id")?.value || null;

    const res = NextResponse.json({ success: true, data: { restoredTo: prev || null } });

    if (prev) {
      res.cookies.set("cart_id", prev, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    // Clear markers
    res.cookies.set("prev_cart_id", "", { httpOnly: true, sameSite: "lax", maxAge: 0 });
    res.cookies.set("buy_now_cart_id", "", { httpOnly: true, sameSite: "lax", maxAge: 0 });

    return res;
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || "Failed to restore cart" } }, { status: 500 });
  }
}
