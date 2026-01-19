import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, gte, like, lte, sql } from "drizzle-orm";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "support.view");
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const email = searchParams.get("email");
    const q = searchParams.get("q");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
    const offset = (page - 1) * limit;

    const filters: any[] = [];
    if (status) filters.push(eq(schema.contactMessages.status as any, status as any));
    if (email) filters.push(like(schema.contactMessages.email, `%${email}%`));
    if (q) {
      const likeQ = `%${q}%`;
      filters.push(sql`(${schema.contactMessages.subject} ILIKE ${likeQ} OR ${schema.contactMessages.message} ILIKE ${likeQ})`);
    }
    if (from) filters.push(gte(schema.contactMessages.createdAt as any, new Date(from)));
    if (to) filters.push(lte(schema.contactMessages.createdAt as any, new Date(to)));

    const where = filters.length ? and(...filters) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.contactMessages)
      .where(where as any);

    const items = await db
      .select()
      .from(schema.contactMessages)
      .where(where as any)
      .orderBy(desc(schema.contactMessages.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: Number(count || 0),
        page,
        limit,
      },
    });
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
