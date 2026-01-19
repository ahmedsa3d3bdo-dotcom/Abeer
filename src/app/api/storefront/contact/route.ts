import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { renderTemplate } from "@/lib/email-templates";
import { enforceSecurity } from "@/server/utils/security-guards";
import { notificationsService } from "@/server/services/notifications.service";

function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

export async function POST(req: NextRequest) {
  try {
    // Basic IP rate limiting (5 req / 5 min)
    const security = await enforceSecurity(req, "contact");
    if (security) return security;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").slice(0, 200);
    const email = String(body?.email || "").trim().toLowerCase();
    const subject = String(body?.subject || "Contact Form").slice(0, 200);
    const message = String(body?.message || "").slice(0, 5000);

    if (!isValidEmail(email) || message.length < 10) {
      return NextResponse.json({ success: false, error: { message: "Invalid input" } }, { status: 400 });
    }

    const ua = req.headers.get("user-agent") || "";

    // Store structured message
    const [created] = await db.insert(schema.contactMessages).values({
      name,
      email,
      subject,
      message,
      status: "new" as any,
      priority: "normal" as any,
      channel: "web",
      metadata: { ip, ua } as any,
    }).returning({ id: schema.contactMessages.id });

    // Notify admins
    try {
      if (created?.id) {
        await notificationsService.sendToRoles(
          {
            roleSlugs: ["super_admin", "admin"],
            type: "contact_message" as any,
            title: "New contact message",
            message: `${subject || "(no subject)"} • ${email}`,
            actionUrl: `/dashboard/support/messages/${created.id}`,
            metadata: {
              entity: "contactMessage",
              entityId: String(created.id),
              email,
            },
          },
          undefined,
        );
      }
    } catch {}

    // Internal notification (template fallback)
    {
      const vars = { name, email, subject, message };
      const t = await renderTemplate(
        "contact_internal_notification",
        vars,
        `[Contact] ${subject}`,
        `From: ${name || "(no name)"} <${email}>\n\n${message}`
      );
      await db.insert(schema.emailLogs).values({
        to: "support@store.local",
        from: email,
        subject: t.subject,
        body: t.body,
        status: "pending" as any,
        metadata: { template: "contact_internal_notification" } as any,
      });
    }

    // Autoresponder to user (template fallback)
    {
      const vars = { name, email, subject, message };
      const t = await renderTemplate(
        "contact_autoresponder",
        vars,
        "We received your message",
        `Hi ${name || "there"},\n\nThanks for reaching out! Our team will get back to you within 24 hours.\n\nYour message: ${message.substring(0, 4000)}`
      );
      await db.insert(schema.emailLogs).values({
        to: email,
        from: "support@store.local",
        subject: t.subject,
        body: t.body,
        status: "pending" as any,
        metadata: { template: "contact_autoresponder" } as any,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || "Failed" } }, { status: 500 });
  }
}
