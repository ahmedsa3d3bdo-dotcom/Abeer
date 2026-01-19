import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(req, "support.manage");
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body?.status as any;
    const priority = body?.priority as any;
    await db
      .update(schema.contactMessages)
      .set({ status, priority, updatedAt: new Date() })
      .where(eq(schema.contactMessages.id, id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
