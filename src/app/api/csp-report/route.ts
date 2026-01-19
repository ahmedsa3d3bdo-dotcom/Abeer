import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { writeSystemLog } from "@/server/utils/system-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function normalizeIp(v: string | null) {
  if (!v) return undefined;
  const first = v.split(",")[0]?.trim();
  return first || undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = normalizeIp(forwarded) || normalizeIp(request.headers.get("x-real-ip")) || undefined;

    await writeSystemLog({
      level: "warn",
      source: "csp",
      message: "CSP violation report",
      path: "/api/csp-report",
      method: "POST",
      statusCode: 204,
      ipAddress,
      userAgent: request.headers.get("user-agent") || undefined,
      metadata: {
        report: body,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
