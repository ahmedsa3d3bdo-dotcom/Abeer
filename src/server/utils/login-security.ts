import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getRedisClient, redisGetTtlMs } from "@/lib/redis";
import { securityService } from "../services/security.service";
import { securityAlertsService } from "../services/security-alerts.service";
import { writeAudit } from "./audit";

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function emailHint(email: string) {
  const e = normalizeEmail(email);
  const at = e.indexOf("@");
  if (at <= 1) return e ? "***" : "";
  const first = e.slice(0, 1);
  const domain = e.slice(at);
  return `${first}***${domain}`;
}

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : request.headers.get("x-real-ip") || "unknown";
  return ip || "unknown";
}

type LoginLockoutResult = {
  locked: boolean;
  retryAfterSec: number | null;
  scope: "ip" | "email" | "both" | null;
};

export async function checkLoginLockout(params: { ip: string; email: string }): Promise<LoginLockoutResult> {
  const redis = await getRedisClient();
  if (!redis) return { locked: false, retryAfterSec: null, scope: null };

  const ipKey = `security:login_lock:ip:${params.ip}`;
  const emailKey = `security:login_lock:email:${normalizeEmail(params.email)}`;

  try {
    const [ipExists, emailExists] = await Promise.all([redis.exists(ipKey), redis.exists(emailKey)]);
    if (!ipExists && !emailExists) return { locked: false, retryAfterSec: null, scope: null };

    const ttlIpMs = ipExists ? await redisGetTtlMs(ipKey) : null;
    const ttlEmailMs = emailExists ? await redisGetTtlMs(emailKey) : null;
    const ttlMs = Math.max(ttlIpMs ?? 0, ttlEmailMs ?? 0);
    const retryAfterSec = ttlMs > 0 ? Math.max(1, Math.ceil(ttlMs / 1000)) : null;

    const scope = ipExists && emailExists ? "both" : ipExists ? "ip" : "email";
    return { locked: true, retryAfterSec, scope };
  } catch {
    return { locked: false, retryAfterSec: null, scope: null };
  }
}

export async function respondLoginLocked(params: { request: NextRequest; ip: string; email: string }) {
  const locked = await checkLoginLockout({ ip: params.ip, email: params.email });
  if (!locked.locked) return null;

  await writeAudit({
    action: "create",
    resource: "security",
    ipAddress: params.ip,
    userAgent: params.request.headers.get("user-agent") || undefined,
    metadata: {
      kind: "login_lockout",
      phase: "blocked",
      scope: locked.scope,
      emailHint: emailHint(params.email),
    },
  });

  const res = NextResponse.json(
    { success: false, error: { message: "Too many login attempts. Please try again later." } },
    { status: 429 },
  );
  if (locked.retryAfterSec) res.headers.set("Retry-After", String(locked.retryAfterSec));
  return res;
}

export async function recordLoginFailure(params: { request: NextRequest; ip: string; email: string }) {
  const settings = await securityService.getSettingsCached();
  const threshold = Math.max(1, Number(settings.monitoring.alerts.repeatedLoginFailures.threshold5m || 20));
  const lockoutMinutes = Math.max(1, Number(process.env.SECURITY_LOGIN_LOCKOUT_MINUTES || 15));
  const lockoutMs = lockoutMinutes * 60_000;
  const windowMs = 5 * 60_000;

  void securityAlertsService.recordLoginFailure();

  await writeAudit({
    action: "create",
    resource: "security",
    ipAddress: params.ip,
    userAgent: params.request.headers.get("user-agent") || undefined,
    metadata: {
      kind: "login_failed",
      emailHint: emailHint(params.email),
    },
  });

  const redis = await getRedisClient();
  if (!redis) return;

  const ipFailKey = `security:login_fail:ip:${params.ip}`;
  const emailFailKey = `security:login_fail:email:${normalizeEmail(params.email)}`;

  try {
    const [ipCount, emailCount] = await Promise.all([redis.incr(ipFailKey), redis.incr(emailFailKey)]);
    if (ipCount === 1) await redis.pExpire(ipFailKey, windowMs);
    if (emailCount === 1) await redis.pExpire(emailFailKey, windowMs);

    const shouldLock = ipCount >= threshold || emailCount >= threshold;
    if (shouldLock) {
      const ipLockKey = `security:login_lock:ip:${params.ip}`;
      const emailLockKey = `security:login_lock:email:${normalizeEmail(params.email)}`;

      await Promise.all([
        redis.set(ipLockKey, "1", { PX: lockoutMs }),
        redis.set(emailLockKey, "1", { PX: lockoutMs }),
      ]);

      await writeAudit({
        action: "create",
        resource: "security",
        ipAddress: params.ip,
        userAgent: params.request.headers.get("user-agent") || undefined,
        metadata: {
          kind: "login_lockout",
          phase: "triggered",
          threshold5m: threshold,
          lockoutMinutes,
          emailHint: emailHint(params.email),
        },
      });
    }
  } catch {}
}

export async function clearLoginFailures(params: { ip: string; email: string }) {
  const redis = await getRedisClient();
  if (!redis) return;

  const keys = [
    `security:login_fail:ip:${params.ip}`,
    `security:login_fail:email:${normalizeEmail(params.email)}`,
  ];

  try {
    await redis.del(keys);
  } catch {}
}
