import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { siteConfig } from "@/config/site";
import { auth } from "@/auth";

function requestId() {
  try {
    return (globalThis as any)?.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function hasPermission(perms: string[], permission: string) {
  const parts = String(permission).split(".");
  const base = parts.slice(0, -1).join(".");
  const action = parts[parts.length - 1];

  const has = (p: string) => perms.includes(p);

  return (
    has(permission) ||
    (base ? has(`${base}.manage`) : false) ||
    (action === "view" && base ? has(`${base}.create`) || has(`${base}.update`) || has(`${base}.delete`) : false)
  );
}

const DASHBOARD_ROUTE_PERMS: Array<{ prefix: string; perm: string }> = [
  { prefix: "/dashboard", perm: "dashboard.view" },
  { prefix: "/dashboard/default", perm: "dashboard.view" },
  { prefix: "/dashboard/products", perm: "products.view" },
  { prefix: "/dashboard/categories", perm: "categories.view" },
  { prefix: "/dashboard/orders", perm: "orders.view" },
  { prefix: "/dashboard/refunds", perm: "refunds.view" },
  { prefix: "/dashboard/returns", perm: "returns.view" },
  { prefix: "/dashboard/customers", perm: "customers.view" },
  { prefix: "/dashboard/reviews", perm: "reviews.view" },
  { prefix: "/dashboard/discounts", perm: "discounts.view" },
  { prefix: "/dashboard/shipping/methods", perm: "shipping.view" },
  { prefix: "/dashboard/shipping/shipments", perm: "shipping.view" },
  { prefix: "/dashboard/users", perm: "users.view" },
  { prefix: "/dashboard/roles", perm: "roles.view" },
  { prefix: "/dashboard/permissions", perm: "permissions.view" },
  { prefix: "/dashboard/settings", perm: "settings.view" },
  { prefix: "/dashboard/security", perm: "security.view" },
  { prefix: "/dashboard/audit-logs", perm: "audit.view" },
  { prefix: "/dashboard/system/logs", perm: "system.logs.view" },
  { prefix: "/dashboard/system/metrics", perm: "system.metrics.view" },
  { prefix: "/dashboard/backups", perm: "backups.view" },
  { prefix: "/dashboard/health", perm: "health.view" },
  { prefix: "/dashboard/support/messages", perm: "support.view" },
  { prefix: "/dashboard/marketing/newsletter", perm: "newsletter.view" },
  { prefix: "/dashboard/notifications", perm: "notifications.view" },
  { prefix: "/dashboard/emails/templates", perm: "emails.view" },
  { prefix: "/dashboard/emails/logs", perm: "emails.view" },
];

function getFirstAllowedDashboardRoute(perms: string[]) {
  for (const r of DASHBOARD_ROUTE_PERMS) {
    if (r.perm === "dashboard.view") continue;
    if (hasPermission(perms, r.perm)) return r;
  }
  return null;
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
  ],
};

/**
 * Lightweight proxy: Only CORS handling for API routes.
 * Route protection is handled in server components/layouts using `auth()`.
 */
export default async function proxy(req: NextRequest) {
  const { nextUrl } = req;

  const requestHeaders = new Headers(req.headers);
  if (!requestHeaders.get("x-request-id")) {
    requestHeaders.set("x-request-id", requestId());
  }

  // 1) API: CORS preflight/headers
  if (nextUrl.pathname.startsWith("/api")) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Max-Age", "86400");

    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  // 2) Optional admin subdomain support: admin.yourdomain.com -> /dashboard
  const host = req.headers.get("host") || "";
  const adminSub = siteConfig.adminSubdomain;
  const isAdminSubdomain = host.startsWith(`${adminSub}.`);
  if (isAdminSubdomain) {
    // Ensure all admin-subdomain requests resolve under /dashboard
    if (!nextUrl.pathname.startsWith("/dashboard")) {
      const url = new URL(`/dashboard${nextUrl.pathname}`, nextUrl);
      url.search = nextUrl.search;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
  }

  // 3) Protect admin routes (/dashboard) – role-based check via NextAuth session
  if (nextUrl.pathname.startsWith("/dashboard")) {
    const session = await auth();
    const login = siteConfig.routes?.login || "/login-v2";

    if (!session?.user) {
      return NextResponse.redirect(new URL(login, nextUrl));
    }

    const roles = ((session.user as any)?.roles as string[] | undefined) ?? [];
    if (!roles.includes("super_admin")) {
      const perms = Array.isArray((session.user as any)?.permissions) ? ((session.user as any).permissions as string[]) : [];
      const canAccessDashboard = hasPermission(perms, "dashboard.view") || !!getFirstAllowedDashboardRoute(perms);
      if (!canAccessDashboard) {
        return NextResponse.redirect(new URL("/unauthorized", nextUrl));
      }
      const match = DASHBOARD_ROUTE_PERMS
        .slice()
        .sort((a, b) => b.prefix.length - a.prefix.length)
        .find((r) => nextUrl.pathname.startsWith(r.prefix));

      if (match && !hasPermission(perms, match.perm)) {
        const isDashboardLanding =
          match.perm === "dashboard.view" &&
          (nextUrl.pathname === "/dashboard" || nextUrl.pathname === "/dashboard/" || nextUrl.pathname.startsWith("/dashboard/default"));
        if (isDashboardLanding) {
          const fallback = getFirstAllowedDashboardRoute(perms);
          if (fallback) {
            const url = new URL(fallback.prefix, nextUrl);
            return NextResponse.redirect(url);
          }
        }
        return NextResponse.redirect(new URL("/unauthorized", nextUrl));
      }
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}
