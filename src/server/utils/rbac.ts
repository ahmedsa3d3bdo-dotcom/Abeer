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
        const reqOrigin = new URL((request as any).url).origin.replace(/\/$/, '');
        if (origin !== reqOrigin) {
          throw new ForbiddenError('Cross-site request blocked');
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
