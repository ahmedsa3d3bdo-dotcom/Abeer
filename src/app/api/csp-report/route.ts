import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { writeSystemLog } from "@/server/utils/system-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const g = globalThis as any;
const LAST_CSP_LOG: Map<string, number> = g.__lastCspLog ?? new Map<string, number>();
g.__lastCspLog = LAST_CSP_LOG;

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

    const key = ipAddress || "unknown";
    const now = Date.now();
    const last = LAST_CSP_LOG.get(key) || 0;
    if (now - last < 60_000) {
      return new NextResponse(null, { status: 204 });
    }
    LAST_CSP_LOG.set(key, now);

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
