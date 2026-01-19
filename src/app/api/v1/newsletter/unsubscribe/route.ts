import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { inArray, eq } from "drizzle-orm";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requirePermission(req, "newsletter.manage");
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    const emails: string[] = Array.isArray(body?.emails) ? body.emails : [];

    if (!ids.length && !emails.length) {
      return NextResponse.json({ success: false, error: { message: "No ids or emails provided" } }, { status: 400 });
    }

    if (ids.length) {
      await db
        .update(schema.newsletterSubscribers)
        .set({ status: "unsubscribed" as any, unsubscribedAt: new Date() })
        .where(inArray(schema.newsletterSubscribers.id, ids));
    }
    if (emails.length) {
      for (const email of emails) {
        await db
          .update(schema.newsletterSubscribers)
          .set({ status: "unsubscribed" as any, unsubscribedAt: new Date() })
          .where(eq(schema.newsletterSubscribers.email, email.toLowerCase()));
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
