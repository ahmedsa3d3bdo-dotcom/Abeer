import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, gte, lte, like, desc, sql } from "drizzle-orm";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "support.view");
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const email = searchParams.get("email");
    const q = searchParams.get("q");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

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

    const rows = await db
      .select({
        createdAt: schema.contactMessages.createdAt,
        status: schema.contactMessages.status,
        priority: schema.contactMessages.priority,
        name: schema.contactMessages.name,
        email: schema.contactMessages.email,
        subject: schema.contactMessages.subject,
        message: schema.contactMessages.message,
      })
      .from(schema.contactMessages)
      .where(where as any)
      .orderBy(desc(schema.contactMessages.createdAt));

    const header = ["created_at","status","priority","name","email","subject","message"];
    const csv = [header.join(",")]
      .concat(
        rows.map((r) => [
          r.createdAt?.toISOString?.() ?? "",
          String(r.status),
          String(r.priority),
          r.name ?? "",
          r.email,
          r.subject ?? "",
          (r.message || "").replace(/\n/g, " ").slice(0, 10000),
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      )
      .join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=contact_messages.csv`,
      },
    });
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
