import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, gte, lte, like, desc } from "drizzle-orm";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "newsletter.view");
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const email = searchParams.get("email");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filters: any[] = [];
    if (status) filters.push(eq(schema.newsletterSubscribers.status as any, status as any));
    if (email) filters.push(like(schema.newsletterSubscribers.email, `%${email}%`));
    if (from) filters.push(gte(schema.newsletterSubscribers.createdAt as any, new Date(from)));
    if (to) filters.push(lte(schema.newsletterSubscribers.createdAt as any, new Date(to)));

    const where = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select({
        email: schema.newsletterSubscribers.email,
        name: schema.newsletterSubscribers.name,
        status: schema.newsletterSubscribers.status,
        source: schema.newsletterSubscribers.source,
        createdAt: schema.newsletterSubscribers.createdAt,
        confirmedAt: schema.newsletterSubscribers.confirmedAt,
        unsubscribedAt: schema.newsletterSubscribers.unsubscribedAt,
      })
      .from(schema.newsletterSubscribers)
      .where(where as any)
      .orderBy(desc(schema.newsletterSubscribers.createdAt));

    const header = ["email","name","status","source","created_at","confirmed_at","unsubscribed_at"];
    const csv = [header.join(",")]
      .concat(
        rows.map((r) => [
          r.email,
          r.name ?? "",
          String(r.status),
          r.source ?? "",
          r.createdAt?.toISOString?.() ?? "",
          r.confirmedAt?.toISOString?.() ?? "",
          r.unsubscribedAt?.toISOString?.() ?? "",
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      )
      .join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=subscribers.csv`,
      },
    });
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
