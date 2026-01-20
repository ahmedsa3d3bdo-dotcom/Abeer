import { auth } from "@/auth";
import { ForbiddenError, UnauthorizedError } from "../types";

export async function requirePermission(request: Request, permission: string) {
  // CSRF hardening: for cookie-authenticated requests, require same-origin for
  // state-changing methods when the browser sends an Origin header.
  try {
    const method = String((request as any)?.method || "GET").toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const origin = String(request.headers.get('origin') || '').trim().replace(/\/$/, '');
      if (origin) {
        const url = new URL((request as any).url);
        const xfProtoRaw = String(request.headers.get("x-forwarded-proto") || "");
        const xfHostRaw = String(request.headers.get("x-forwarded-host") || "");
        const forwardedProto = xfProtoRaw.split(",")[0]?.trim();
        const forwardedHost = xfHostRaw.split(",")[0]?.trim();
        const reqProto = forwardedProto || url.protocol.replace(/:$/, "");
        const reqHost = forwardedHost || String(request.headers.get("host") || url.host);
        const reqOrigin = `${reqProto}://${reqHost}`.replace(/\/$/, "");

        if (origin !== reqOrigin) {
          // Common reverse-proxy case: browser is https:// but upstream request is http://
          // when x-forwarded-proto is not correctly forwarded. Allow if host matches.
          try {
            const o = new URL(origin);
            const r = new URL(reqOrigin);
            const sameHost = o.host === r.host;
            const protoMismatchIsProxy = o.protocol === "https:" && r.protocol === "http:";
            if (!(sameHost && protoMismatchIsProxy)) {
              throw new ForbiddenError("Cross-site request blocked");
            }
            // Allowed proxy mismatch (https browser -> http upstream)
          } catch {
            throw new ForbiddenError("Cross-site request blocked");
          }
        }
      }
    }
  } catch {
    // ignore parsing errors
  }

  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  const roles = ((session.user as any).roles as string[] | undefined) ?? [];
  if (roles.includes("super_admin")) return session;
  const perms = (session.user as any).permissions as string[] | undefined;
  if (!Array.isArray(perms)) {
    throw new ForbiddenError("Missing required permission: " + permission);
  }

  const parts = String(permission).split(".");
  const base = parts.slice(0, -1).join(".");
  const action = parts[parts.length - 1];

  const has = (p: string) => perms.includes(p);

  const ok =
    has(permission) ||
    (base ? has(`${base}.manage`) : false) ||
    (action === "view" && base ? has(`${base}.create`) || has(`${base}.update`) || has(`${base}.delete`) : false);

  if (!ok) {
    throw new ForbiddenError("Missing required permission: " + permission);
  }
  return session;
}
