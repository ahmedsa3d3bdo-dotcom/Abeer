import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const email = req.nextUrl.searchParams.get("email");
  const origin = req.nextUrl.origin;
  try {
    if (token) {
      const [sub] = await db
        .select()
        .from(schema.newsletterSubscribers)
        .where(eq(schema.newsletterSubscribers.unsubscribeToken, token))
        .limit(1);
      if (sub) {
        await db
          .update(schema.newsletterSubscribers)
          .set({ status: "unsubscribed" as any, unsubscribedAt: new Date() })
          .where(eq(schema.newsletterSubscribers.id, sub.id));
        return NextResponse.redirect(`${origin}/?newsletter=unsubscribed`);
      }
      return NextResponse.redirect(`${origin}/?newsletter=invalid`);
    }
    if (email) {
      await db
        .update(schema.newsletterSubscribers)
        .set({ status: "unsubscribed" as any, unsubscribedAt: new Date() })
        .where(eq(schema.newsletterSubscribers.email, email.toLowerCase()));
      return NextResponse.redirect(`${origin}/?newsletter=unsubscribed`);
    }
    return NextResponse.redirect(`${origin}/?newsletter=invalid`);
  } catch {
    return NextResponse.redirect(`${origin}/?newsletter=error`);
  }
}
