import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";

const templates = [
  {
    name: "Newsletter Confirm",
    slug: "newsletter_confirm",
    subject: "Confirm your subscription",
    body: `
<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f8fafc;padding:24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0">
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px 0;font-size:22px;color:#0f172a">Confirm your subscription</h1>
        <p style="margin:0 0 16px 0;color:#334155">Hi {{name}}, thanks for subscribing with {{email}}.</p>
        <p style="margin:0 0 24px 0;color:#334155">Please confirm your email address by clicking the button below:</p>
        <p style="margin:0 0 24px 0">
          <a href="{{confirm_url}}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">Confirm subscription</a>
        </p>
        <p style="margin:0;color:#64748b">If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="{{confirm_url}}" style="color:#0ea5e9">{{confirm_url}}</a>
        </p>
      </td></tr>
    </table>
  </body>
</html>
    `,
  },
  {
    name: "Newsletter Welcome",
    slug: "newsletter_welcome",
    subject: "Welcome to our newsletter",
    body: `
<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f8fafc;padding:24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0">
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px 0;font-size:22px;color:#0f172a">Welcome, {{name}}!</h1>
        <p style="margin:0 0 16px 0;color:#334155">You're all set. You'll receive updates at {{email}}.</p>
        <p style="margin:0 0 24px 0;color:#334155">We’ll share drops, offers, and guides. You can unsubscribe anytime using the link below.</p>
        <p style="margin:0;color:#64748b">Unsubscribe: <a href="{{unsubscribe_url}}" style="color:#0ea5e9">{{unsubscribe_url}}</a></p>
      </td></tr>
    </table>
  </body>
</html>
    `,
  },
  {
    name: "Contact Autoresponder",
    slug: "contact_autoresponder",
    subject: "We received your message",
    body: `
<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f8fafc;padding:24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0">
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px 0;font-size:22px;color:#0f172a">Thanks for contacting us</h1>
        <p style="margin:0 0 16px 0;color:#334155">Hi {{name}}, we received your message and will reply within 24 hours.</p>
        <p style="margin:0 0 8px 0;color:#334155"><strong>Subject:</strong> {{subject}}</p>
        <p style="margin:0 0 16px 0;color:#334155;white-space:pre-wrap">{{message}}</p>
        <p style="margin:0;color:#64748b">If you need to update details, reply to this email.</p>
      </td></tr>
    </table>
  </body>
</html>
    `,
  },
  {
    name: "Contact Internal Notification",
    slug: "contact_internal_notification",
    subject: "[Contact] {{subject}}",
    body: `
<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f8fafc;padding:24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0">
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px 0;font-size:20px;color:#0f172a">New Contact Message</h1>
        <p style="margin:0 0 8px 0;color:#334155"><strong>From:</strong> {{name}} &lt;{{email}}&gt;</p>
        <p style="margin:0 0 8px 0;color:#334155"><strong>Subject:</strong> {{subject}}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
        <pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;background:#f1f5f9;padding:12px;border-radius:8px">{{message}}</pre>
      </td></tr>
    </table>
  </body>
</html>
    `,
  },
];

export async function POST(req: NextRequest) {
  try {
    await requirePermission(req, "emails.manage");
    const upsert = req.nextUrl.searchParams.get("update") === "1";

    for (const t of templates) {
      const [existing] = await db
        .select()
        .from(schema.emailTemplates)
        .where(eq(schema.emailTemplates.slug, t.slug))
        .limit(1);

      if (!existing) {
        await db.insert(schema.emailTemplates).values({
          name: t.name,
          slug: t.slug,
          subject: t.subject,
          body: t.body,
          variables: {},
          isActive: true,
        });
      } else if (upsert) {
        await db
          .update(schema.emailTemplates)
          .set({ name: t.name, subject: t.subject, body: t.body, isActive: true })
          .where(eq(schema.emailTemplates.id, (existing as any).id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed to seed templates");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
