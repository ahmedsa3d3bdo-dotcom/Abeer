import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { adminSessionsService } from "@/server/services/admin-sessions.service";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "security.manage");
    const body = await request.json().catch(() => ({}));
    const sessionId = String(body?.sessionId || "").trim();
    if (!sessionId) {
      return NextResponse.json({ success: false, error: { message: "Missing sessionId" } }, { status: 400 });
    }

    const result = await adminSessionsService.revoke({
      sessionId,
      actor: {
        userId: (session.user as any)?.id,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
