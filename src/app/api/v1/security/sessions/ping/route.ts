import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminSessionsService } from "@/server/services/admin-sessions.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function normalizeOrigin(v: string) {
  return String(v || "").trim().replace(/\/$/, "");
}

function getExpectedOrigin(request: NextRequest) {
  const proto = (request.headers.get("x-forwarded-proto") || "").split(",")[0]?.trim();
  const xfHost = (request.headers.get("x-forwarded-host") || "").split(",")[0]?.trim();
  const host = xfHost || request.headers.get("host") || new URL(request.url).host;
  const protocol = proto || new URL(request.url).protocol.replace(":", "");
  return `${protocol}://${host}`;
}

export async function POST(request: NextRequest) {
  try {
    const method = String(request.method || "POST").toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const origin = normalizeOrigin(request.headers.get('origin') || '');
      if (origin) {
        const reqOrigin = normalizeOrigin(getExpectedOrigin(request));
        if (origin !== reqOrigin) {
          return NextResponse.json({ success: false, error: { message: "Cross-site request blocked" } }, { status: 403 });
        }
      }
    }

    const session = await auth();
    const perms = Array.isArray((session?.user as any)?.permissions) ? ((session?.user as any).permissions as string[]) : [];

    const hasPermission = (permission: string) => {
      const parts = String(permission).split(".");
      const base = parts.slice(0, -1).join(".");
      const action = parts[parts.length - 1];
      const has = (p: string) => perms.includes(p);
      return (
        has(permission) ||
        (base ? has(`${base}.manage`) : false) ||
        (action === "view" && base ? has(`${base}.create`) || has(`${base}.update`) || has(`${base}.delete`) : false)
      );
    };

    const sectionViewPerms = [
      "dashboard.view",
      "products.view",
      "categories.view",
      "orders.view",
      "refunds.view",
      "returns.view",
      "customers.view",
      "reviews.view",
      "discounts.view",
      "shipping.view",
      "users.view",
      "roles.view",
      "permissions.view",
      "settings.view",
      "security.view",
      "audit.view",
      "system.logs.view",
      "backups.view",
      "health.view",
      "support.view",
      "newsletter.view",
      "notifications.view",
      "emails.view",
    ];

    const canAccessControlPanel = sectionViewPerms.some((p) => hasPermission(p));

    if (!session?.user || !canAccessControlPanel) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const cookieName = adminSessionsService.getCookieName();
    const existingToken = request.cookies.get(cookieName)?.value;
    const token = existingToken || adminSessionsService.generateToken();

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0]?.trim() : request.headers.get("x-real-ip");

    const result = await adminSessionsService.ping({
      userId: (session.user as any).id,
      token,
      ipAddress: ip || null,
      userAgent: request.headers.get("user-agent"),
    });

    if (!result.success) {
      const msg = process.env.NODE_ENV === "production" ? "Internal server error" : result.error.message;
      return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
    }

    if (result.data.revoked) {
      const res = NextResponse.json({ success: false, data: { revoked: true } }, { status: 409 });
      return res;
    }

    const res = NextResponse.json({ success: true, data: { ok: true } });
    if (!existingToken) {
      res.cookies.set({
        name: cookieName,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
