import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { adminSessionsService } from "@/server/services/admin-sessions.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
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
    const token = request.cookies.get(cookieName)?.value;

    if (token) {
      await adminSessionsService.logout({
        token,
        actor: {
          userId: (session.user as any)?.id,
          ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
          userAgent: request.headers.get("user-agent"),
        },
      });
    }

    const res = NextResponse.json({ success: true, data: { ok: true } });
    res.cookies.set({
      name: cookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
