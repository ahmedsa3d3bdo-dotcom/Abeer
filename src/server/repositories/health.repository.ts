import { db } from "@/shared/db";
import { healthChecks } from "@/shared/db/schema/system";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "fs/promises";
import { getRedisClient } from "@/lib/redis";

export class HealthRepository {
  async metrics(params?: { windowHours?: number; service?: string }) {
    const hours = Math.max(1, Math.min(168, Number(params?.windowHours ?? 24)));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const filters: any[] = [gte(healthChecks.createdAt, since)];
    if (params?.service) filters.push(eq(healthChecks.service, params.service));
    const where = and(...(filters as any));

    const [agg] = await db
      .select({
        total: sql<number>`count(*)`,
        healthy: sql<number>`sum(case when ${healthChecks.status} = 'healthy' then 1 else 0 end)`,
        degraded: sql<number>`sum(case when ${healthChecks.status} = 'degraded' then 1 else 0 end)`,
        unhealthy: sql<number>`sum(case when ${healthChecks.status} = 'unhealthy' then 1 else 0 end)`,
        responseTimeCount: sql<number>`count(${healthChecks.responseTime})`,
        avgResponseTime: sql<any>`avg(${healthChecks.responseTime})`,
      })
      .from(healthChecks)
      .where(where as any);

    const [last] = await db
      .select({
        status: healthChecks.status,
        responseTime: healthChecks.responseTime,
        error: healthChecks.error,
        createdAt: healthChecks.createdAt,
      })
      .from(healthChecks)
      .where(where as any)
      .orderBy(desc(healthChecks.createdAt))
      .limit(1);

    const total = Number((agg as any)?.total ?? 0);
    const healthy = Number((agg as any)?.healthy ?? 0);
    const degraded = Number((agg as any)?.degraded ?? 0);
    const unhealthy = Number((agg as any)?.unhealthy ?? 0);

    const denominator = Math.max(0, total);
    const up = healthy + degraded;
    const uptimePct = denominator > 0 ? (up / denominator) * 100 : null;

    const avg = (agg as any)?.avgResponseTime;

    const responseTimeCount = Number((agg as any)?.responseTimeCount ?? 0);
    let p95: number | null = null;
    if (responseTimeCount > 0) {
      const idx = Math.max(0, Math.floor(0.95 * (responseTimeCount - 1)));
      const whereWithNotNull = and(where as any, sql`${healthChecks.responseTime} is not null` as any);
      const [p95Row] = await db
        .select({ value: healthChecks.responseTime })
        .from(healthChecks)
        .where(whereWithNotNull as any)
        .orderBy(asc(healthChecks.responseTime))
        .limit(1)
        .offset(idx);
      p95 = (p95Row as any)?.value == null ? null : Number((p95Row as any).value);
    }

    return {
      windowHours: hours,
      since: since.toISOString(),
      service: params?.service ?? null,
      counts: { total, healthy, degraded, unhealthy },
      uptimePct,
      latencyMs: {
        p95,
        avg: avg == null ? null : Number(avg),
      },
      last: last
        ? {
            status: (last as any).status,
            responseTime: (last as any).responseTime,
            error: (last as any).error,
            createdAt: (last as any).createdAt,
          }
        : null,
    };
  }

  async list(params: { page?: number; limit?: number; sort?: "createdAt.desc" | "createdAt.asc"; service?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 10));
    const offset = (page - 1) * limit;
    const orderBy = params.sort === "createdAt.asc" ? healthChecks.createdAt : sql`${healthChecks.createdAt} DESC`;

    const filters: any[] = [];
    if (params.service) filters.push(eq(healthChecks.service, params.service));
    const baseWhere = filters.length ? and(...filters) : null;

    const where = (baseWhere ?? undefined) as any;

    const items = await db.select().from(healthChecks).where(where as any).orderBy(orderBy as any).limit(limit).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(healthChecks).where(where as any);
    return { items, total: count ?? 0 };
  }

  async retention(params: { keepLast?: number; maxAgeDays?: number; service?: string }) {
    const keepLast = Math.min(10_000, Math.max(0, Number(params.keepLast ?? 0)));
    const maxAgeDays = Math.min(3650, Math.max(0, Number(params.maxAgeDays ?? 0)));

    const filters: any[] = [];
    if (params.service) filters.push(eq(healthChecks.service, params.service));
    const baseWhere = filters.length ? and(...filters) : null;

    let deleted = 0;
    if (maxAgeDays > 0) {
      const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
      const where = baseWhere
        ? and(baseWhere as any, sql`${healthChecks.createdAt} < ${cutoff}`)
        : (sql`${healthChecks.createdAt} < ${cutoff}` as any);
      const res = await db.delete(healthChecks).where(where as any);
      deleted += res.rowCount ?? 0;
    }

    if (keepLast > 0) {
      const items = await db
        .select({ id: healthChecks.id })
        .from(healthChecks)
        .where((baseWhere ?? undefined) as any)
        .orderBy(desc(healthChecks.createdAt))
        .limit(keepLast);
      const keepIds = items.map((x) => x.id);
      if (keepIds.length > 0) {
        const notIn = sql`${healthChecks.id} NOT IN (${sql.join(
          keepIds.map((id) => sql`${id}`),
          sql`, `
        )})`;
        const where = baseWhere ? and(baseWhere as any, notIn) : (notIn as any);
        const res = await db.delete(healthChecks).where(where as any);
        deleted += res.rowCount ?? 0;
      }
    }

    return { deleted };
  }

  async run(service = "app", opts?: { httpEndpoints?: string[]; smtp?: boolean }) {
    const startedAt = Date.now();

    const details: Record<string, unknown> = {};
    const errors: string[] = [];

    const dbDegradedMs = Math.max(1, Number(process.env.HEALTH_DB_DEGRADED_MS || 500));
    const dbUnhealthyMs = Math.max(dbDegradedMs, Number(process.env.HEALTH_DB_UNHEALTHY_MS || 2000));
    const httpTimeoutMs = Math.max(1000, Number(process.env.HEALTH_HTTP_TIMEOUT_MS || 5000));

    const check = async <T>(key: string, fn: () => Promise<T>) => {
      const t0 = Date.now();
      try {
        const value = await fn();
        const ms = Date.now() - t0;
        return { ok: true as const, ms, value };
      } catch (e: any) {
        const ms = Date.now() - t0;
        const message = e?.message || String(e);
        return { ok: false as const, ms, error: message };
      }
    };

    const dbRes = await check("db", async () => {
      await db.execute(sql`select 1 as ok` as any);
      return { ok: true };
    });
    const dbStatus = !dbRes.ok ? "unhealthy" : dbRes.ms >= dbUnhealthyMs ? "unhealthy" : dbRes.ms >= dbDegradedMs ? "degraded" : "healthy";
    if (!dbRes.ok) errors.push(`db: ${dbRes.error}`);
    details.db = { status: dbStatus, latencyMs: dbRes.ms, ...(dbRes.ok ? {} : { error: dbRes.error }) };

    const fsRes = await check("fs", async () => {
      const dir = os.tmpdir();
      const p = path.join(dir, `ees-health-${randomUUID()}.txt`);
      const payload = `ok-${Date.now()}`;
      await writeFile(p, payload, "utf8");
      const read = await readFile(p, "utf8");
      await unlink(p);
      if (read !== payload) throw new Error("filesystem read/write mismatch");
      return { ok: true };
    });
    if (!fsRes.ok) errors.push(`fs: ${fsRes.error}`);
    details.fs = { status: fsRes.ok ? "healthy" : "unhealthy", latencyMs: fsRes.ms, ...(fsRes.ok ? {} : { error: fsRes.error }) };

    const redis = await getRedisClient();
    if (redis) {
      const redisRes = await check("redis", async () => {
        const key = `ees:health:${randomUUID()}`;
        await redis.set(key, "1", { PX: 10_000 });
        const v = await redis.get(key);
        if (v !== "1") throw new Error("redis read/write mismatch");
        await redis.del(key);
        return { ok: true };
      });
      if (!redisRes.ok) errors.push(`redis: ${redisRes.error}`);
      details.redis = { status: redisRes.ok ? "healthy" : "unhealthy", latencyMs: redisRes.ms, ...(redisRes.ok ? {} : { error: redisRes.error }) };
    } else {
      details.redis = { status: "skipped" };
    }

    details.process = {
      status: "healthy",
      uptimeSec: Math.round(process.uptime()),
      memory: process.memoryUsage(),
      node: process.version,
      platform: process.platform,
      pid: process.pid,
    };

    const smtpEnabled = Boolean(opts?.smtp);
    if (smtpEnabled) {
      const smtpRes = await check("smtp", async () => {
        const nodemailer = (await import("nodemailer")).default;
        const host = process.env.SMTP_HOST || process.env.GMAIL_SMTP_HOST || "smtp.gmail.com";
        const port = Number(process.env.SMTP_PORT || process.env.GMAIL_SMTP_PORT || 465);
        const secure = port === 465;
        const user = process.env.SMTP_USER || process.env.GMAIL_SMTP_USER || process.env.EMAIL_FROM;
        const pass = process.env.SMTP_PASSWORD || process.env.GMAIL_SMTP_PASS;
        if (!user || !pass) throw new Error("missing SMTP_USER/SMTP_PASSWORD");
        const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
        await transporter.verify();
        return { ok: true, host, port };
      });
      if (!smtpRes.ok) errors.push(`smtp: ${smtpRes.error}`);
      details.smtp = { status: smtpRes.ok ? "healthy" : "unhealthy", latencyMs: smtpRes.ms, ...(smtpRes.ok ? smtpRes.value : { error: smtpRes.error }) };
    } else {
      details.smtp = { status: "skipped" };
    }

    const endpoints = (opts?.httpEndpoints || []).filter(Boolean);
    if (endpoints.length) {
      const results: any[] = [];
      for (const url of endpoints) {
        const httpRes = await check("http", async () => {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), httpTimeoutMs);
          try {
            const res = await fetch(url, { method: "GET", signal: controller.signal, cache: "no-store" } as any);
            const ok = res.ok;
            return { ok, httpStatus: res.status };
          } finally {
            clearTimeout(t);
          }
        });
        const status = httpRes.ok && (httpRes.value as any)?.ok ? "healthy" : "unhealthy";
        if (status !== "healthy") errors.push(`http(${url}): ${(httpRes as any).error || `status ${(httpRes as any).value?.httpStatus}`}`);
        results.push({ url, latencyMs: httpRes.ms, ...(httpRes.ok ? httpRes.value : { error: httpRes.error }), status });
      }
      details.http = results;
    } else {
      details.http = { status: "skipped" };
    }

    const httpStatuses = Array.isArray((details as any).http)
      ? ((details as any).http as any[]).map((x: any) => String(x?.status || "unknown"))
      : [];
    const httpOverall = httpStatuses.length
      ? httpStatuses.some((s) => s !== "healthy")
        ? "unhealthy"
        : "healthy"
      : null;

    const statuses = [details.db, details.fs, details.redis, smtpEnabled ? details.smtp : null, httpOverall ? { status: httpOverall } : null]
      .filter(Boolean)
      .map((x: any) => x.status);
    const overall = statuses.includes("unhealthy") ? "unhealthy" : statuses.includes("degraded") ? "degraded" : "healthy";
    const responseTime = Date.now() - startedAt;

    const [row] = await db
      .insert(healthChecks)
      .values({
        service,
        status: overall as any,
        responseTime,
        details: details as any,
        error: errors.length ? errors.join("; ") : null,
      })
      .returning();
    return row;
  }
}

export const healthRepository = new HealthRepository();
