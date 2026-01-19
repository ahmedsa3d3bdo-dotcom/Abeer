import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { renderTemplate } from "@/lib/email-templates";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const origin = req.nextUrl.origin;
  if (!token) {
    return NextResponse.redirect(`${origin}/?newsletter=invalid`);
  }
  try {
    const [sub] = await db
      .select()
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.confirmToken, token))
      .limit(1);

    if (!sub) {
      return NextResponse.redirect(`${origin}/?newsletter=invalid`);
    }

    await db
      .update(schema.newsletterSubscribers)
      .set({ status: "confirmed" as any, confirmedAt: new Date(), confirmToken: null as any })
      .where(eq(schema.newsletterSubscribers.id, sub.id));

    // Send welcome email
    const unsubscribeUrl = `${origin}/api/storefront/newsletter/unsubscribe?token=${sub.unsubscribeToken}`;
    const t = await renderTemplate(
      "newsletter_welcome",
      { email: sub.email, name: sub.name, unsubscribe_url: unsubscribeUrl },
      "Welcome to our newsletter",
      `Welcome! You can unsubscribe anytime: ${unsubscribeUrl}`
    );
    await db.insert(schema.emailLogs).values({
      to: sub.email,
      from: "newsletter@store.local",
      subject: t.subject,
      body: t.body,
      status: "pending" as any,
      metadata: { template: "newsletter_welcome" } as any,
    });

    return NextResponse.redirect(`${origin}/?newsletter=confirmed`);
  } catch {
    return NextResponse.redirect(`${origin}/?newsletter=error`);
  }
}
