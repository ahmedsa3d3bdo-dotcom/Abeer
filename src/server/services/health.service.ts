import { healthRepository } from "../repositories/health.repository";
import { success, failure } from "../types";
import { writeAudit } from "../utils/audit";
import type { ActorContext } from "./role.service";
import { settingsRepository } from "../repositories/settings.repository";
import { db } from "@/shared/db";
import { sql } from "drizzle-orm";
import { sendMail } from "../utils/mailer";
import { getRedisClient } from "@/lib/redis";
import { notificationsService } from "./notifications.service";

class HealthService {
  private readonly scheduleSettingKey = "health.schedule";

  ensureInternalSchedulerStarted() {
    const enabled =
      process.env.HEALTH_INTERNAL_SCHEDULER === "true" ||
      process.env.HEALTH_INTERNAL_SCHEDULER === "1" ||
      process.env.NODE_ENV !== "production";

    if (!enabled) return;

    const g = globalThis as any;
    if (g.__healthInternalSchedulerStarted) return;
    g.__healthInternalSchedulerStarted = true;

    const intervalMs = Math.max(10_000, Number(process.env.HEALTH_INTERNAL_SCHEDULER_INTERVAL_MS || 60_000));
    g.__healthInternalSchedulerInterval = setInterval(() => {
      this.runScheduledHealthCheck("cron").catch(() => {});
    }, intervalMs);
  }

  private parseAlertEmails(schedule: any) {
    const fromSchedule = Array.isArray(schedule?.notifyEmails)
      ? schedule.notifyEmails.map((x: any) => String(x).trim()).filter(Boolean)
      : [];
    if (fromSchedule.length) return fromSchedule;
    const fromEnv = String(process.env.HEALTH_ALERT_EMAILS || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return fromEnv;
  }

  private async maybeSendAlert(schedule: any, healthCheck: any) {
    const status = String(healthCheck?.status || "");
    const shouldNotify = status === "unhealthy" || (schedule?.notifyOnDegraded && status === "degraded");
    if (!shouldNotify) return;

    const emails = this.parseAlertEmails(schedule);

    const now = new Date();
    const cooldownMin = Math.max(0, Number(schedule?.notifyCooldownMin ?? 60));
    const lastAlertAt = schedule?.lastAlertAt ? new Date(schedule.lastAlertAt) : null;
    const lastAlertStatus = schedule?.lastAlertStatus ? String(schedule.lastAlertStatus) : null;

    if (lastAlertStatus === status && lastAlertAt) {
      const mins = (now.getTime() - lastAlertAt.getTime()) / 60000;
      if (mins < cooldownMin) return;
    }

    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    const healthUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/dashboard/health` : "";

    if (emails.length) {
      const subject = `[EES] Health check ${status.toUpperCase()} (${String(healthCheck?.service || "app")})`;
      const text = [
        `Status: ${status}`,
        `Service: ${String(healthCheck?.service || "app")}`,
        `Response time: ${healthCheck?.responseTime ?? "-"} ms`,
        `Checked at: ${healthCheck?.createdAt || healthCheck?.checkedAt || now.toISOString()}`,
        healthCheck?.error ? `Error: ${healthCheck.error}` : "",
        healthUrl ? `Dashboard: ${healthUrl}` : "",
        "",
        "Details:",
        JSON.stringify(healthCheck?.details || {}, null, 2),
      ]
        .filter(Boolean)
        .join("\n");

      for (const to of emails) {
        await sendMail({ to, subject, text });
      }
    }

    if (status === "unhealthy") {
      const service = String(healthCheck?.service || "app");
      const title = `Health check UNHEALTHY (${service}) - ${now.toISOString()}`;
      const message = [
        `Service: ${service}`,
        `Latency: ${healthCheck?.responseTime ?? "-"} ms`,
        healthCheck?.error ? `Error: ${String(healthCheck.error)}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await notificationsService.sendToRoles({
        roleSlugs: ["admin", "super_admin"],
        type: "system_alert",
        title,
        message,
        actionUrl: healthUrl || "/dashboard/health",
        metadata: {
          source: "health",
          healthCheckId: (healthCheck as any)?.id ?? null,
          status,
          service,
        },
      });
    }

    await settingsRepository.upsertByKey(this.scheduleSettingKey, {
      value: JSON.stringify({ ...schedule, lastAlertAt: now.toISOString(), lastAlertStatus: status }),
      type: "json",
      description: "Automatic health check schedule",
      isPublic: false,
    });
  }

  private parseTimeHHmm(v: string): { hour: number; minute: number } | null {
    const m = String(v || "").trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!m) return null;
    return { hour: Number(m[1]), minute: Number(m[2]) };
  }

  private getZonedParts(date: Date, timeZone: string) {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = p.value;
    }
    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute),
      second: Number(map.second),
    };
  }

  private getZonedWeekday(date: Date, timeZone: string): number {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
    const w = fmt.format(date);
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[w] ?? 0;
  }

  private zonedKey(date: Date, timeZone: string) {
    const p = this.getZonedParts(date, timeZone);
    const y = String(p.year).padStart(4, "0");
    const m = String(p.month).padStart(2, "0");
    const d = String(p.day).padStart(2, "0");
    const hh = String(p.hour).padStart(2, "0");
    const mm = String(p.minute).padStart(2, "0");
    return `${y}-${m}-${d} ${hh}:${mm}`;
  }

  private zonedDateKey(date: Date, timeZone: string) {
    const p = this.getZonedParts(date, timeZone);
    const y = String(p.year).padStart(4, "0");
    const m = String(p.month).padStart(2, "0");
    const d = String(p.day).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  async getSchedule() {
    const row = await settingsRepository.findByKey(this.scheduleSettingKey);
    const defaults = {
      enabled: false,
      intervalMinutes: 5 as number,
      service: "app",
      smtp: false,
      httpEndpoints: [] as string[],
      notifyEmails: [] as string[],
      notifyOnDegraded: false,
      notifyCooldownMin: 60 as number,
      keepLast: 200 as number,
      maxAgeDays: 30 as number,
      lastRunAt: null as string | null,
      lastHealthCheckId: null as string | null,
      lastAlertAt: null as string | null,
      lastAlertStatus: null as string | null,
    };
    if (!row?.value) return defaults;
    try {
      const parsed = JSON.parse(row.value);
      const merged: any = { ...defaults, ...(parsed || {}) };
      if (merged.intervalMinutes == null) {
        merged.intervalMinutes = merged.frequency === "weekly" ? 10080 : 1440;
      }
      return merged;
    } catch {
      return defaults;
    }
  }

  async updateSchedule(
    input: Partial<{
      enabled: boolean;
      intervalMinutes: number;
      service: string;
      smtp: boolean;
      httpEndpoints: string[];
      notifyEmails: string[];
      notifyOnDegraded: boolean;
      notifyCooldownMin: number;
      keepLast: number;
      maxAgeDays: number;
    }>,
    actor?: ActorContext,
  ) {
    const current = await this.getSchedule();
    const next: any = { ...current, ...(input || {}) };

    next.enabled = Boolean(next.enabled);
    next.intervalMinutes = Math.max(1, Math.min(1440, Number(next.intervalMinutes ?? 5)));
    next.service = String(next.service || "app");
    next.smtp = Boolean(next.smtp);
    next.httpEndpoints = Array.isArray(next.httpEndpoints) ? next.httpEndpoints.map((x: any) => String(x)).filter(Boolean) : [];
    next.notifyEmails = Array.isArray(next.notifyEmails)
      ? next.notifyEmails.map((x: any) => String(x).trim()).filter(Boolean)
      : [];
    next.notifyOnDegraded = Boolean(next.notifyOnDegraded);
    next.notifyCooldownMin = Math.max(0, Math.min(24 * 60, Number(next.notifyCooldownMin ?? 60)));
    next.keepLast = Math.max(0, Math.min(10_000, Number(next.keepLast ?? 200)));
    next.maxAgeDays = Math.max(0, Math.min(3650, Number(next.maxAgeDays ?? 30)));

    const saved = await settingsRepository.upsertByKey(this.scheduleSettingKey, {
      value: JSON.stringify(next),
      type: "json",
      description: "Automatic health check schedule",
      isPublic: false,
    });

    await writeAudit({
      action: "update",
      resource: "health.schedule",
      resourceId: saved.id,
      userId: actor?.userId,
      ipAddress: actor?.ip ?? undefined,
      userAgent: actor?.userAgent ?? undefined,
      changes: input as any,
    });
    return success(next);
  }

  private async updateScheduleRuntimePatch(patch: Partial<{ lastRunAt: string | null; lastHealthCheckId: string | null }>) {
    const current = await this.getSchedule();
    const next = { ...current, ...patch };
    await settingsRepository.upsertByKey(this.scheduleSettingKey, {
      value: JSON.stringify(next),
      type: "json",
      description: "Automatic health check schedule",
      isPublic: false,
    });
  }

  private async tryAcquireAdvisoryLock(lockId: number) {
    try {
      const res: any = await db.execute(sql.raw(`SELECT pg_try_advisory_lock(${lockId}) AS locked`));
      const rows = (res as any).rows ?? (res as any);
      return Boolean(rows?.[0]?.locked);
    } catch {
      return false;
    }
  }

  private async releaseAdvisoryLock(lockId: number) {
    try {
      await db.execute(sql.raw(`SELECT pg_advisory_unlock(${lockId})`));
    } catch {}
  }

  private async tryAcquireRedisLock(key: string, ttlMs: number) {
    const redis = await getRedisClient();
    if (!redis) return { ok: false as const, token: null as string | null, redis: null as any };
    const token = `${process.pid}:${Date.now()}:${Math.random()}`;
    try {
      const res = await redis.set(key, token, { NX: true, PX: Math.max(1, Math.trunc(ttlMs)) });
      if (res !== "OK") return { ok: false as const, token: null as string | null, redis };
      return { ok: true as const, token, redis };
    } catch {
      return { ok: false as const, token: null as string | null, redis };
    }
  }

  private async releaseRedisLock(key: string, token: string | null) {
    if (!token) return;
    const redis = await getRedisClient();
    if (!redis) return;
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await redis.eval(script, { keys: [key], arguments: [token] } as any);
    } catch {}
  }

  private isScheduleDue(now: Date, schedule: any) {
    const intervalMinutes = Math.max(1, Math.min(1440, Number(schedule?.intervalMinutes ?? 5)));
    const lastRunAt = schedule.lastRunAt ? new Date(schedule.lastRunAt) : null;
    if (!lastRunAt) return true;
    const diffMs = now.getTime() - lastRunAt.getTime();
    return diffMs >= intervalMinutes * 60_000;
  }

  async metrics(params: { service?: string; windowHours?: number }) {
    try {
      const data = await healthRepository.metrics(params);
      return success(data);
    } catch (e: any) {
      return failure("HEALTH_METRICS_FAILED", e?.message || "Failed to compute health metrics");
    }
  }

  async runScheduledHealthCheck(trigger: "cron" | "manual", actor?: ActorContext) {
    const schedule = await this.getSchedule();
    if (!schedule.enabled && trigger !== "manual") {
      return success({ skipped: true, reason: "disabled" });
    }

    const now = new Date();
    if (trigger !== "manual" && !this.isScheduleDue(now, schedule)) {
      return success({ skipped: true, reason: "not_due" });
    }

    const lockTtlMs = Math.max(30_000, Math.min(15 * 60_000, Number(process.env.HEALTH_LOCK_TTL_MS || 5 * 60_000)));
    const redisLockKey = `ees:health:schedule:lock:${String(schedule.service || "app")}`;

    const redisLock = await this.tryAcquireRedisLock(redisLockKey, lockTtlMs);

    const lockId = 93472832;
    const pgLocked = redisLock.ok ? false : await this.tryAcquireAdvisoryLock(lockId);
    if (!redisLock.ok && !pgLocked) return success({ skipped: true, reason: "locked" });

    try {
      const item = await healthRepository.run(String(schedule.service || "app"), {
        httpEndpoints: Array.isArray(schedule.httpEndpoints) ? schedule.httpEndpoints : [],
        smtp: Boolean(schedule.smtp),
      });
      await this.updateScheduleRuntimePatch({ lastRunAt: now.toISOString(), lastHealthCheckId: (item as any)?.id ?? null });
      await healthRepository.retention({ keepLast: schedule.keepLast, maxAgeDays: schedule.maxAgeDays, service: String(schedule.service || "app") });
      try {
        await this.maybeSendAlert(schedule, item);
      } catch (e: any) {
        console.error("Health alert sending failed:", e);
      }
      if (actor?.userId) {
        await writeAudit({ action: "create", resource: "health_check", resourceId: (item as any)?.id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, changes: { trigger } as any });
      }
      return success({ healthCheck: item, ranAt: now.toISOString() });
    } catch (e: any) {
      return failure("RUN_HEALTH_FAILED", e?.message || "Failed to run health check");
    } finally {
      if (pgLocked) await this.releaseAdvisoryLock(lockId);
      if (redisLock.ok) await this.releaseRedisLock(redisLockKey, redisLock.token);
    }
  }

  async list(params: { page?: number; limit?: number; sort?: "createdAt.desc" | "createdAt.asc"; service?: string }) {
    try {
      const res = await healthRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_HEALTH_FAILED", e?.message || "Failed to list health checks");
    }
  }

  async run(service?: string, actor?: ActorContext) {
    try {
      const item = await healthRepository.run(service);
      await writeAudit({ action: "create", resource: "health_check", resourceId: item.id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, changes: { service } });
      return success(item);
    } catch (e: any) {
      return failure("RUN_HEALTH_FAILED", e?.message || "Failed to run health check");
    }
  }
}

export const healthService = new HealthService();
