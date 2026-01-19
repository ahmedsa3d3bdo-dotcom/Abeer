import { NextRequest, NextResponse } from "next/server";
import { renderTemplate } from "@/lib/email-templates";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requirePermission(req, "emails.manage");
    const body = await req.json().catch(() => ({}));
    const slug = String(body?.slug || "").trim();
    if (!slug) return NextResponse.json({ success: false, error: { message: "Missing template slug" } }, { status: 400 });
    const variables: Record<string, any> = body?.variables || {};
    const fallbackSubject = String(body?.subject || "");
    const fallbackBody = String(body?.body || "");
    const rendered = await renderTemplate(slug, variables, fallbackSubject, fallbackBody);
    return NextResponse.json({ success: true, data: rendered });
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
