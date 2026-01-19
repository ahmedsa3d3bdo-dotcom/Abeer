import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { renderTemplate } from "@/lib/email-templates";
import { enforceSecurity } from "@/server/utils/security-guards";
import { notificationsService } from "@/server/services/notifications.service";

export const runtime = "nodejs";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: NextRequest) {
  try {
    const security = await enforceSecurity(req, "newsletter");
    if (security) return security;

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const name = typeof body?.name === "string" ? body.name.trim() : null;

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: { message: "Invalid email" } }, { status: 400 });
    }

    // Upsert subscriber in newsletter_subscribers with pending status and tokens
    const confirmToken = crypto.randomBytes(24).toString("hex");
    const unsubscribeToken = crypto.randomBytes(24).toString("hex");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const ua = req.headers.get("user-agent") || "";

    const [existing] = await db
      .select()
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.email, email))
      .limit(1);

    let subscriberId: string | null = existing ? String(existing.id) : null;

    if (existing) {
      // If already confirmed and not unsubscribed, treat as success
      if (existing.status === "confirmed") {
        return NextResponse.json({ success: true, already: true });
      }
      await db
        .update(schema.newsletterSubscribers)
        .set({
          name: name || existing.name,
          status: "pending" as any,
          confirmToken,
          unsubscribeToken: existing.unsubscribeToken || unsubscribeToken,
          source: "storefront",
          consentIp: ip,
          consentUserAgent: ua,
          updatedAt: new Date(),
        })
        .where(eq(schema.newsletterSubscribers.id, existing.id));
    } else {
      const [row] = await db.insert(schema.newsletterSubscribers).values({
        email,
        name: name || undefined,
        status: "pending" as any,
        confirmToken,
        unsubscribeToken,
        source: "storefront",
        consentIp: ip,
        consentUserAgent: ua,
        metadata: { source: "storefront_newsletter" } as any,
      }).returning({ id: schema.newsletterSubscribers.id });
      subscriberId = row?.id ? String(row.id) : null;
    }

    // Notify admins
    try {
      if (subscriberId) {
        await notificationsService.sendToRoles(
          {
            roleSlugs: ["super_admin", "admin"],
            type: "newsletter_subscribed" as any,
            title: "New newsletter subscription",
            message: email,
            actionUrl: "/dashboard/marketing/newsletter",
            metadata: {
              entity: "newsletterSubscriber",
              entityId: subscriberId,
              email,
            },
          },
          undefined,
        );
      }
    } catch {}

    // Log confirmation email with link
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

    return NextResponse.json({ success: true, doubleOptIn: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || "Failed to subscribe" } }, { status: 500 });
  }
}
