import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { adminSessionsService } from "@/server/services/admin-sessions.service";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "security.manage");

    const sp = request.nextUrl.searchParams;
    const page = Number(sp.get("page") || 1) || 1;
    const limit = Number(sp.get("limit") || 20) || 20;
    const q = sp.get("q") || "";
    const includeRevoked = sp.get("includeRevoked") === "1";
    const activeWithinSec = sp.get("activeWithinSec") ? Number(sp.get("activeWithinSec")) : undefined;

    const result = await adminSessionsService.list({
      page,
      limit,
      q: q || undefined,
      includeRevoked,
      activeWithinSec: typeof activeWithinSec === "number" && Number.isFinite(activeWithinSec) ? activeWithinSec : undefined,
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
