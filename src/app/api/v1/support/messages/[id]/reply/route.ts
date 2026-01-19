import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { renderTemplate } from "@/lib/email-templates";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(req, "support.manage");
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const templateSlug: string | undefined = body?.templateSlug || undefined;
    const customSubject: string | undefined = body?.subject || undefined;
    const customBody: string | undefined = body?.body || undefined;
    const variables: Record<string, any> = body?.variables || {};

    const [msg] = await db.select().from(schema.contactMessages).where(eq(schema.contactMessages.id, id)).limit(1);
    if (!msg) return NextResponse.json({ success: false, error: { message: "Not found" } }, { status: 404 });

    let subject = customSubject || `Re: ${msg.subject || "your inquiry"}`;
    let bodyHtml = customBody || `Hi ${msg.name || "there"},\n\nThanks for your message.`;

    if (templateSlug) {
      const t = await renderTemplate(templateSlug, { ...variables, name: msg.name, email: msg.email, subject: msg.subject, message: msg.message }, subject, bodyHtml);
      subject = t.subject;
      bodyHtml = t.body;
    }

    await db.insert(schema.emailLogs).values({
      to: (msg as any).email,
      from: "support@store.local",
      subject,
      body: bodyHtml,
      status: "pending" as any,
      metadata: { source: "admin_reply", messageId: id } as any,
    });

    await db.update(schema.contactMessages).set({ status: "open" as any, respondedAt: new Date(), updatedAt: new Date() }).where(eq(schema.contactMessages.id, id));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
