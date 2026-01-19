import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq, sql } from "drizzle-orm";
import { enforceSecurity } from "@/server/utils/security-guards";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const security = await enforceSecurity(request, "helpfulVote");
    if (security) return security;

    // Cookie-based dedup
    const cookieName = "sf_rev_helpful";
    const cookieVal = request.cookies.get(cookieName)?.value || "";
    const seen = new Set(cookieVal.split(",").filter(Boolean));
    if (seen.has(id)) {
      return NextResponse.json({ success: true, data: { already: true } });
    }

    const [row] = await db
      .update(schema.productReviews)
      .set({ helpfulCount: sql`${schema.productReviews.helpfulCount} + 1` as any })
      .where(eq(schema.productReviews.id, id))
      .returning({ id: schema.productReviews.id, helpfulCount: schema.productReviews.helpfulCount });

    if (!row) {
      return NextResponse.json({ success: false, error: { message: "Review not found" } }, { status: 404 });
    }

    // Update cookie
    seen.add(id);
    const res = NextResponse.json({ success: true, data: row });
    res.cookies.set(cookieName, Array.from(seen).join(","), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1y
    });
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Failed to mark helpful" } },
      { status: 500 }
    );
  }
}
