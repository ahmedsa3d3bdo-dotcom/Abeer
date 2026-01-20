import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/rate-limit";
import { securityService } from "../services/security.service";
import { securityAlertsService } from "../services/security-alerts.service";
import { writeAudit } from "./audit";

type SecurityTarget = "contact" | "newsletter" | "login" | "register" | "reviewsPost" | "helpfulVote" | "reportReview";

type OriginScope = "publicForms" | "auth" | "reviews";

function requestOriginFromHeaders(request: NextRequest) {
  const url = request.nextUrl;
  const xfProtoRaw = String(request.headers.get("x-forwarded-proto") || "");
  const xfHostRaw = String(request.headers.get("x-forwarded-host") || "");
  const forwardedProto = xfProtoRaw.split(",")[0]?.trim();
  const forwardedHost = xfHostRaw.split(",")[0]?.trim();
  const proto = forwardedProto || url.protocol.replace(/:$/, "");
  const host = forwardedHost || String(request.headers.get("host") || url.host);
  return `${proto}://${host}`;
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : request.headers.get("x-real-ip") || "unknown";
  return ip || "unknown";
}

function normalizeOrigin(v: string) {
  return String(v || "").trim().replace(/\/$/, "");
}

function originHost(v: string) {
  try {
    return new URL(v).host;
  } catch {
    return null;
  }
}

function normalizeAllowItem(v: string) {
  const raw = String(v || "").trim();
  if (!raw) return null;
  const normalized = normalizeOrigin(raw);
  const h = originHost(normalized);
  if (h) return { kind: "origin" as const, value: normalized, host: h };
  const hostOnly = raw.replace(/^\s*\[|\]\s*$/g, "").trim();
  if (!hostOnly) return null;
  return { kind: "host" as const, value: hostOnly.toLowerCase(), host: hostOnly.toLowerCase() };
}

function isAllowedByList(normalizedOrigin: string, allowList: string[]) {
  const originH = originHost(normalizedOrigin);
  const parsed = allowList.map(normalizeAllowItem).filter(Boolean) as Array<{ kind: "origin" | "host"; value: string; host: string }>;
  for (const item of parsed) {
    if (item.kind === "origin") {
      if (item.value === normalizedOrigin) return true;
    } else {
      if (originH && originH.toLowerCase() === item.host) return true;
    }
  }
  return false;
}

function extractOriginFromReferer(referer: string) {
  try {
    const u = new URL(referer);
    return u.origin;
  } catch {
    return null;
  }
}

function isLoopbackHost(host: string) {
  const h = String(host || "")
    .trim()
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function sameOriginOrLoopbackEquivalent(a: string, b: string) {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    if (ua.origin === ub.origin) return true;
    if (ua.protocol !== ub.protocol) return false;
    const pa = ua.port || (ua.protocol === "https:" ? "443" : "80");
    const pb = ub.port || (ub.protocol === "https:" ? "443" : "80");
    if (pa !== pb) return false;
    return isLoopbackHost(ua.hostname) && isLoopbackHost(ub.hostname);
  } catch {
    return false;
  }
}

function originScopeForTarget(target: SecurityTarget): OriginScope {
  if (target === "contact" || target === "newsletter") return "publicForms";
  if (target === "login" || target === "register") return "auth";
  return "reviews";
}

export async function enforceSecurity(request: NextRequest, target: SecurityTarget) {
  const settings = await securityService.getSettingsCached();

  const scope = originScopeForTarget(target);
  const shouldCheckOrigin =
    settings.originCheck.enabled &&
    ((scope === "publicForms" && settings.originCheck.enforceOnPublicForms) ||
      (scope === "auth" && settings.originCheck.enforceOnAuth) ||
      (scope === "reviews" && settings.originCheck.enforceOnReviews));

  if (shouldCheckOrigin) {
    const headerOrigin = request.headers.get("origin");
    const refererOrigin = extractOriginFromReferer(request.headers.get("referer") || "");
    const origin = headerOrigin || refererOrigin || "";
    const normalized = normalizeOrigin(origin);

    const hasOriginContext = Boolean(headerOrigin || refererOrigin);

    if (hasOriginContext) {
      if (!normalized) {
        await writeAudit({
          action: "create",
          resource: "security",
          ipAddress: getClientIp(request),
          userAgent: request.headers.get("user-agent") || undefined,
          metadata: { kind: "origin_invalid", target, scope },
        });
        return NextResponse.json({ success: false, error: { message: "Invalid origin" } }, { status: 403 });
      }

      const allowList = Array.isArray(settings.originCheck.allowedOrigins)
        ? settings.originCheck.allowedOrigins.map(normalizeOrigin).filter(Boolean)
        : [];

      const fallback = normalizeOrigin(requestOriginFromHeaders(request));
      const allowed = allowList.length ? isAllowedByList(normalized, allowList) : sameOriginOrLoopbackEquivalent(normalized, fallback);

      if (!allowed) {
        await writeAudit({
          action: "create",
          resource: "security",
          ipAddress: getClientIp(request),
          userAgent: request.headers.get("user-agent") || undefined,
          metadata: {
            kind: "origin_block",
            target,
            scope,
            origin: normalized,
            allowListCount: allowList.length,
          },
        });
        void securityAlertsService.recordOriginBlock();
        return NextResponse.json({ success: false, error: { message: "Origin not allowed" } }, { status: 403 });
      }
    }
  }

  if (settings.rateLimit.enabled) {
    const rule: any = (settings.rateLimit as any)?.[target];
    const limit = Number(rule?.limit);
    const windowSec = Number(rule?.windowSec);

    if (Number.isFinite(limit) && Number.isFinite(windowSec) && limit > 0 && windowSec > 0) {
      const ip = getClientIp(request);
      const windowMs = Math.max(1, Math.trunc(windowSec * 1000));
      const limited = await rateLimit({ key: `security:${target}:${ip}`, limit: Math.trunc(limit), windowMs });
      if (!limited.ok) {
        await writeAudit({
          action: "create",
          resource: "security",
          ipAddress: getClientIp(request),
          userAgent: request.headers.get("user-agent") || undefined,
          metadata: {
            kind: "rate_limit_block",
            target,
            limit: Math.trunc(limit),
            windowSec: Math.trunc(windowSec),
          },
        });
        void securityAlertsService.recordRateLimitBlock();
        const res = NextResponse.json(
          { success: false, error: { message: "Too many requests. Please try again later." } },
          { status: 429 }
        );
        const retryAfter = Math.max(1, Math.ceil((limited.resetAt - Date.now()) / 1000));
        res.headers.set("Retry-After", String(retryAfter));
        return res;
      }
    }
  }

  return null;
}
