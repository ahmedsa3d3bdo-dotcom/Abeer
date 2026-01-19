import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { inArray, eq } from "drizzle-orm";
import crypto from "crypto";
import { renderTemplate } from "@/lib/email-templates";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requirePermission(req, "newsletter.manage");
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (!ids.length) {
      return NextResponse.json({ success: false, error: { message: "No ids provided" } }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(schema.newsletterSubscribers)
      .where(inArray(schema.newsletterSubscribers.id, ids));

    const origin = req.nextUrl.origin;
    for (const sub of rows) {
      let token = (sub as any).confirmToken ?? crypto.randomBytes(24).toString("hex");
      if (!(sub as any).confirmToken) {
        await db
          .update(schema.newsletterSubscribers)
          .set({ confirmToken: token, status: (((sub as any).status === "confirmed") ? "confirmed" : "pending") as any })
          .where(eq(schema.newsletterSubscribers.id, (sub as any).id));
      }
      const confirmUrl = `${origin}/api/storefront/newsletter/confirm?token=${token}`;
      const t = await renderTemplate(
        "newsletter_confirm",
        { confirm_url: confirmUrl, email: (sub as any).email, name: (sub as any).name },
        "Confirm your subscription",
        `Click to confirm: ${confirmUrl}`
      );
      await db.insert(schema.emailLogs).values({
        to: (sub as any).email,
        from: "newsletter@store.local",
        subject: t.subject,
        body: t.body,
        status: "pending" as any,
        metadata: { template: "newsletter_confirm" } as any,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
