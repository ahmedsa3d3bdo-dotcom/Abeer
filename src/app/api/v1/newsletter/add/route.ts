import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { renderTemplate } from "@/lib/email-templates";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requirePermission(req, "newsletter.manage");
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const confirmed = Boolean(body?.confirmed);

    if (!/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: { message: "Invalid email" } }, { status: 400 });
    }

    const confirmToken = crypto.randomBytes(24).toString("hex");
    const unsubscribeToken = crypto.randomBytes(24).toString("hex");

    const [existing] = await db
      .select()
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.email, email))
      .limit(1);

    if (existing) {
      await db
        .update(schema.newsletterSubscribers)
        .set({
          name: name ?? existing.name,
          status: (confirmed ? "confirmed" : "pending") as any,
          confirmToken: confirmed ? null : confirmToken,
          unsubscribeToken: (existing as any).unsubscribeToken || unsubscribeToken,
          updatedAt: new Date(),
        })
        .where(eq(schema.newsletterSubscribers.id, (existing as any).id));
    } else {
      await db.insert(schema.newsletterSubscribers).values({
        email,
        name,
        status: (confirmed ? "confirmed" : "pending") as any,
        confirmToken: confirmed ? null : confirmToken,
        unsubscribeToken,
        source: "admin",
      });
    }

    if (!confirmed) {
      const origin = req.nextUrl.origin;
      const confirmUrl = `${origin}/api/storefront/newsletter/confirm?token=${confirmToken}`;
      const t = await renderTemplate(
        "newsletter_confirm",
        { confirm_url: confirmUrl, email, name },
        "Confirm your subscription",
        `Click to confirm: ${confirmUrl}`
      );
      await db.insert(schema.emailLogs).values({
        to: email,
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
