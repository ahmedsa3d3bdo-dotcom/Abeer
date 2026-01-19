import { backupsRepository } from "../repositories/backups.repository";
import { success, failure, type ServiceResult } from "../types";
import { writeAudit } from "../utils/audit";
import type { ActorContext } from "./role.service";
import { getBackupsDir } from "../utils/paths";
import { mkdir, stat, writeFile, readFile, unlink } from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { gzip } from "zlib";
import { promisify } from "util";
import { execFile } from "child_process";
import { db } from "@/shared/db";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { settingsRepository } from "../repositories/settings.repository";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { getRedisClient } from "@/lib/redis";

const gzipAsync = promisify(gzip);
const execFileAsync = promisify(execFile);

class BackupsService {
  private readonly scheduleSettingKey = "backups.schedule";

  ensureInternalSchedulerStarted() {
    const enabled =
      process.env.BACKUP_INTERNAL_SCHEDULER === "true" ||
      process.env.BACKUP_INTERNAL_SCHEDULER === "1" ||
      process.env.NODE_ENV !== "production";

    if (!enabled) return;

    const g = globalThis as any;
    if (g.__backupsInternalSchedulerStarted) return;
    g.__backupsInternalSchedulerStarted = true;

    const intervalMs = Math.max(10_000, Number(process.env.BACKUP_INTERNAL_SCHEDULER_INTERVAL_MS || 60_000));
    g.__backupsInternalSchedulerInterval = setInterval(() => {
      this.runScheduledBackup("cron").catch(() => {});
    }, intervalMs);
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
      frequency: "daily" as "daily" | "weekly",
      weekday: 0 as number,
      time: "02:00",
      timeZone: "Africa/Cairo",
      keepLast: 10 as number,
      maxAgeDays: 30 as number,
      lastRunAt: null as string | null,
      lastBackupId: null as string | null,
    };
    if (!row?.value) return defaults;
    try {
      const parsed = JSON.parse(row.value);
      return { ...defaults, ...(parsed || {}) };
    } catch {
      return defaults;
    }
  }

  async updateSchedule(input: Partial<{ enabled: boolean; frequency: "daily" | "weekly"; weekday: number; time: string; timeZone: string; keepLast: number; maxAgeDays: number }>, actor?: ActorContext) {
    const current = await this.getSchedule();
    const next: any = { ...current, ...(input || {}) };

    next.enabled = Boolean(next.enabled);
    next.frequency = next.frequency === "weekly" ? "weekly" : "daily";
    next.weekday = Math.max(0, Math.min(6, Number(next.weekday ?? 0)));
    next.timeZone = String(next.timeZone || "America/Toronto");
    const t = this.parseTimeHHmm(String(next.time || ""));
    if (!t) return failure("VALIDATION_ERROR", "time must be in HH:MM format");
    next.time = `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
    next.keepLast = Math.max(0, Math.min(200, Number(next.keepLast ?? 10)));
    next.maxAgeDays = Math.max(0, Math.min(3650, Number(next.maxAgeDays ?? 0)));

    const saved = await settingsRepository.upsertByKey(this.scheduleSettingKey, {
      value: JSON.stringify(next),
      type: "json",
      description: "Automatic backup schedule",
      isPublic: false,
    });

    await writeAudit({ action: "update", resource: "backup.schedule", resourceId: saved.id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, changes: input as any });
    return success(next);
  }

  private async updateScheduleRuntimePatch(patch: Partial<{ lastRunAt: string | null; lastBackupId: string | null }>) {
    const current = await this.getSchedule();
    const next = { ...current, ...patch };
    await settingsRepository.upsertByKey(this.scheduleSettingKey, {
      value: JSON.stringify(next),
      type: "json",
      description: "Automatic backup schedule",
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
    const tz = String(schedule.timeZone || "UTC");
    const time = this.parseTimeHHmm(String(schedule.time || ""));
    if (!time) return false;
    const nowKey = this.zonedKey(now, tz);
    const today = this.zonedDateKey(now, tz);
    const scheduleKey = `${today} ${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
    if (nowKey < scheduleKey) return false;

    if (schedule.frequency === "weekly") {
      const wd = this.getZonedWeekday(now, tz);
      if (wd !== Number(schedule.weekday ?? 0)) return false;
    }

    const lastRunAt = schedule.lastRunAt ? new Date(schedule.lastRunAt) : null;
    if (!lastRunAt) return true;
    const lastKey = this.zonedKey(lastRunAt, tz);
    return lastKey < scheduleKey;
  }

  async runScheduledBackup(trigger: "cron" | "manual", actor?: ActorContext) {
    const schedule = await this.getSchedule();
    if (!schedule.enabled && trigger !== "manual") {
      return success({ skipped: true, reason: "disabled" });
    }

    const now = new Date();
    if (trigger !== "manual" && !this.isScheduleDue(now, schedule)) {
      return success({ skipped: true, reason: "not_due" });
    }

    const lockTtlMs = Math.max(60_000, Math.min(60 * 60_000, Number(process.env.BACKUP_LOCK_TTL_MS || 30 * 60_000)));
    const redisLockKey = "ees:backups:schedule:lock";
    const redisLock = await this.tryAcquireRedisLock(redisLockKey, lockTtlMs);

    const lockId = 93472831;
    const pgLocked = redisLock.ok ? false : await this.tryAcquireAdvisoryLock(lockId);
    if (!redisLock.ok && !pgLocked) return success({ skipped: true, reason: "locked" });

    try {
      const backupRes = await this.create({ name: "Automatic Backup" }, actor);
      if (!backupRes.success) return backupRes;

      await this.updateScheduleRuntimePatch({ lastRunAt: now.toISOString(), lastBackupId: (backupRes.data as any)?.id ?? null });
      await this.retention({ keepLast: schedule.keepLast, maxAgeDays: schedule.maxAgeDays });
      return success({ backup: backupRes.data, ranAt: now.toISOString() });
    } finally {
      if (pgLocked) await this.releaseAdvisoryLock(lockId);
      if (redisLock.ok) await this.releaseRedisLock(redisLockKey, redisLock.token);
    }
  }

  async list(params: { page?: number; limit?: number; sort?: "createdAt.desc" | "createdAt.asc" }) {
    try {
      const res = await backupsRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_BACKUPS_FAILED", e?.message || "Failed to list backups");
    }
  }

  async create(input: { name?: string }, actor?: ActorContext) {
    try {
      const dir = getBackupsDir();
      await mkdir(dir, { recursive: true });

      // Try pg_dump first (best practice for Postgres)
      const url = this.getDatabaseUrl();
      let fileName = `backup-${Date.now()}.dump`;
      let filePath = path.join(dir, fileName);
      let usedPgDump = false;
      if (url) {
        const pgDumpBin = process.env.PG_DUMP_PATH || (process.platform === "win32" ? "pg_dump.exe" : "pg_dump");
        try {
          await execFileAsync(pgDumpBin, ["--no-owner", "--no-privileges", "-Fc", "-Z", "9", "-f", filePath, "-d", url], { env: process.env });
          const st = await stat(filePath);
          usedPgDump = true;
          const item = await backupsRepository.createManual({ name: input.name || "Manual Backup", createdBy: actor?.userId ?? null, fileName, filePath, status: "completed", type: input.name === "Automatic Backup" ? "auto" : "manual", metadata: { method: "pg_dump" } });
          await backupsRepository.finalize(item.id, st.size);
          const latest = await backupsRepository.findById(item.id);
          await writeAudit({ action: "create", resource: "backup", resourceId: item.id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, metadata: { method: "pg_dump", fileName, filePath, fileSize: st.size } as any });
          return success(latest);
        } catch {
          // fall back
        }
      }

      // Fallback: JSON snapshot of all user tables
      fileName = `backup-${Date.now()}.json.gz`;
      filePath = path.join(dir, fileName);
      const snapshot = await this.buildJsonSnapshot();
      const gz = await gzipAsync(Buffer.from(JSON.stringify(snapshot)));
      await writeFile(filePath, gz);
      const st = await stat(filePath);
      const item = await backupsRepository.createManual({ name: input.name || "Manual Backup", createdBy: actor?.userId ?? null, fileName, filePath, status: "completed", type: input.name === "Automatic Backup" ? "auto" : "manual", metadata: { method: "json" } });
      await backupsRepository.finalize(item.id, st.size);
      const latest = await backupsRepository.findById(item.id);
      await writeAudit({
        action: "create",
        resource: "backup",
        resourceId: item.id,
        userId: actor?.userId,
        ipAddress: actor?.ip ?? undefined,
        userAgent: actor?.userAgent ?? undefined,
        changes: { name: input.name ?? "" } as any,
        metadata: { method: usedPgDump ? "pg_dump" : "json", fileName: (latest as any)?.fileName, filePath: (latest as any)?.filePath, fileSize: (latest as any)?.fileSize, status: (latest as any)?.status } as any,
      });
      return success(latest);
    } catch (e: any) {
      return failure("CREATE_BACKUP_FAILED", e?.message || "Failed to create backup");
    }
  }

  async upload(
    input: { name?: string; file: File; originalName: string },
    actor?: ActorContext,
  ): Promise<ServiceResult<any>> {
    try {
      const orig = input.originalName || "backup";
      const lower = orig.toLowerCase();
      const ext = lower.endsWith(".json.gz") ? ".json.gz" : path.extname(lower);
      const allowed = new Set([".dump", ".json", ".gz", ".json.gz"]);
      if (!allowed.has(ext)) return failure("UNSUPPORTED_FILE", "Supported backup formats: .dump, .json, .json.gz");
      if (ext === ".gz" && !lower.endsWith(".json.gz")) return failure("UNSUPPORTED_FILE", "Supported backup formats: .dump, .json, .json.gz");
      const size = (input.file as any).size as number | undefined;
      const maxBytes = Math.max(1, Number(process.env.BACKUP_UPLOAD_MAX_BYTES || 200 * 1024 * 1024));
      if (typeof size === "number" && size > maxBytes) {
        return failure("FILE_TOO_LARGE", `Max backup upload size is ${Math.floor(maxBytes / (1024 * 1024))}MB`);
      }

      const dir = getBackupsDir();
      await mkdir(dir, { recursive: true });
      const fileName = `uploaded-${Date.now()}-${randomUUID()}${ext}`;
      const filePath = path.join(dir, fileName);
      try {
        const s = (input.file as any).stream?.();
        if (s) {
          await pipeline(Readable.fromWeb(s as any), createWriteStream(filePath, { flags: "wx" }));
        } else {
          const buf = Buffer.from(await input.file.arrayBuffer());
          if (buf.length > maxBytes) return failure("FILE_TOO_LARGE", `Max backup upload size is ${Math.floor(maxBytes / (1024 * 1024))}MB`);
          await writeFile(filePath, buf);
        }
      } catch (e) {
        try {
          await unlink(filePath).catch(() => {});
        } catch {}
        throw e;
      }
      const st = await stat(filePath);
      if (st.size > maxBytes) {
        try {
          await unlink(filePath).catch(() => {});
        } catch {}
        return failure("FILE_TOO_LARGE", `Max backup upload size is ${Math.floor(maxBytes / (1024 * 1024))}MB`);
      }

      const item = await backupsRepository.createManual({
        name: input.name || "Uploaded Backup",
        createdBy: actor?.userId ?? null,
        fileName,
        filePath,
        status: "completed",
        type: "uploaded",
        metadata: { originalName: orig, mime: (input.file as any).type || null, size: st.size },
      });
      await backupsRepository.finalize(item.id, st.size);
      const latest = await backupsRepository.findById(item.id);
      await writeAudit({
        action: "create",
        resource: "backup",
        resourceId: item.id,
        userId: actor?.userId,
        ipAddress: actor?.ip ?? undefined,
        userAgent: actor?.userAgent ?? undefined,
        metadata: { method: "upload", fileName, filePath, fileSize: st.size } as any,
      });
      return success(latest);
    } catch (e: any) {
      return failure("UPLOAD_BACKUP_FAILED", e?.message || "Failed to upload backup");
    }
  }

  async remove(id: string, actor?: ActorContext): Promise<ServiceResult<{ id: string }>> {
    try {
      const existing = await backupsRepository.findById(id);
      const ok = await backupsRepository.delete(id);
      if (!ok) return failure("NOT_FOUND", "Backup not found");
      // try unlink file
      if (existing?.filePath) {
        try {
          await unlink(existing.filePath).catch(() => {});
        } catch {}
      }
      await writeAudit({ action: "delete", resource: "backup", resourceId: id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined });
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_BACKUP_FAILED", e?.message || "Failed to delete backup");
    }
  }

  async finalize(id: string) {
    try {
      const row = await backupsRepository.finalize(id);
      if (!row) return failure("NOT_FOUND", "Backup not found");
      return success(row);
    } catch (e: any) {
      return failure("FINALIZE_BACKUP_FAILED", e?.message || "Failed to finalize backup");
    }
  }

  async retention(params: { keepLast?: number; maxAgeDays?: number }) {
    try {
      const result = await backupsRepository.cleanupRetention(params);
      for (const item of (result as any).items || []) {
        try {
          await unlink(item.filePath).catch(() => {});
        } catch {}
      }
      return success(result);
    } catch (e: any) {
      return failure("RETENTION_FAILED", e?.message || "Failed to cleanup backups");
    }
  }

  async findById(id: string) {
    try {
      const row = await backupsRepository.findById(id);
      if (!row) return failure("NOT_FOUND", "Backup not found");
      return success(row);
    } catch (e: any) {
      return failure("GET_BACKUP_FAILED", e?.message || "Failed to get backup");
    }
  }

  async restore(id: string, actor?: ActorContext) {
    try {
      const found = await backupsRepository.findById(id);
      if (!found) return failure("NOT_FOUND", "Backup not found");
      // If it's a pg_dump file, use pg_restore
      if (found.fileName.endsWith(".dump")) {
        const url = this.getDatabaseUrl();
        if (!url) return failure("NO_DB_URL", "DATABASE_URL not set");
        const pgRestoreBin = process.env.PG_RESTORE_PATH || (process.platform === "win32" ? "pg_restore.exe" : "pg_restore");
        // --clean: drop objects before recreating; --if-exists avoids errors; --no-owner avoids role issues
        await execFileAsync(pgRestoreBin, ["--clean", "--if-exists", "--no-owner", "--no-privileges", "-d", url, found.filePath], { env: process.env });
        await writeAudit({ action: "update", resource: "backup.restore", resourceId: id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, metadata: { method: "pg_restore" } });
        return success({ method: "pg_restore" });
      }

      // Otherwise treat as JSON fallback format
      const buf = await readFile(found.filePath);
      let jsonStr: string;
      try {
        const zlib = await import("zlib");
        const gunzip = promisify(zlib.gunzip);
        const out = await gunzip(buf);
        jsonStr = out.toString("utf-8");
      } catch {
        jsonStr = buf.toString("utf-8");
      }
      const snapshot = JSON.parse(jsonStr);
      const restored = await this.restoreFromJson(snapshot);
      await writeAudit({ action: "update", resource: "backup.restore", resourceId: id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, metadata: { method: "json", ...restored } });
      return success(restored);
    } catch (e: any) {
      return failure("RESTORE_FAILED", e?.message || "Failed to restore backup");
    }
  }

  private getDatabaseUrl(): string | undefined {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    const host = process.env.DB_HOST;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const dbName = process.env.DB_NAME;
    const port = process.env.DB_PORT;
    if (!host || !user || !password || !dbName) return undefined;
    const ssl = process.env.DB_SSL === "true";
    const qp = ssl ? "?sslmode=require" : "";
    const p = port ? `:${port}` : "";
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}${p}/${dbName}${qp}`;
  }

  private async buildJsonSnapshot() {
    const tablesRes: any = await db.execute(sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name;`);
    const rows: Array<{ table_schema: string; table_name: string }> = (tablesRes as any).rows ?? (tablesRes as any);
    const tables: Record<string, any[]> = {};
    for (const t of rows) {
      if (t.table_schema === "public" && (t.table_name === "__drizzle_migrations" || t.table_name === "__applied_migrations")) {
        continue;
      }
      const full = `"${t.table_schema}"."${t.table_name}"`;
      const dataRes: any = await db.execute(sql.raw(`SELECT * FROM ${full}`));
      const data = (dataRes as any).rows ?? (dataRes as any);
      tables[`${t.table_schema}.${t.table_name}`] = data || [];
    }
    return { version: 1, createdAt: new Date().toISOString(), app: "studio-admin", tables };
  }

  private async restoreFromJson(snapshot: any) {
    if (!snapshot?.tables) return { restoredTables: 0, rows: 0 };
    const tableNames = Object.keys(snapshot.tables);
    const inputTables = tableNames
      .map((name) => {
        const [schemaName, tableName] = name.split(".");
        return { name, schemaName, tableName };
      })
      .filter((t) => t.schemaName && t.tableName)
      .filter((t) => !(t.schemaName === "public" && t.tableName.startsWith("__")));

    const inputSet = new Set(inputTables.map((t) => t.name));

    const depsRes: any = await db.execute(sql.raw(`
      SELECT
        nsp_child.nspname  AS child_schema,
        rel_child.relname  AS child_table,
        nsp_parent.nspname AS parent_schema,
        rel_parent.relname AS parent_table
      FROM pg_constraint con
      JOIN pg_class rel_child ON rel_child.oid = con.conrelid
      JOIN pg_namespace nsp_child ON nsp_child.oid = rel_child.relnamespace
      JOIN pg_class rel_parent ON rel_parent.oid = con.confrelid
      JOIN pg_namespace nsp_parent ON nsp_parent.oid = rel_parent.relnamespace
      WHERE con.contype = 'f'
        AND nsp_child.nspname NOT IN ('pg_catalog','information_schema')
        AND nsp_parent.nspname NOT IN ('pg_catalog','information_schema')
    `));
    const depsRows: Array<{ child_schema: string; child_table: string; parent_schema: string; parent_table: string }> =
      (depsRes as any).rows ?? (depsRes as any);

    const nodes = Array.from(inputSet);
    const indeg = new Map<string, number>(nodes.map((n) => [n, 0]));
    const out = new Map<string, Set<string>>(nodes.map((n) => [n, new Set()]));

    for (const r of depsRows || []) {
      const child = `${r.child_schema}.${r.child_table}`;
      const parent = `${r.parent_schema}.${r.parent_table}`;
      if (!inputSet.has(child) || !inputSet.has(parent)) continue;
      if (out.get(parent)?.has(child)) continue;
      out.get(parent)?.add(child);
      indeg.set(child, (indeg.get(child) ?? 0) + 1);
    }

    const queue = nodes.filter((n) => (indeg.get(n) ?? 0) === 0).sort();
    const ordered: string[] = [];
    while (queue.length) {
      const n = queue.shift()!;
      ordered.push(n);
      for (const child of out.get(n) ?? []) {
        indeg.set(child, (indeg.get(child) ?? 0) - 1);
        if ((indeg.get(child) ?? 0) === 0) {
          queue.push(child);
          queue.sort();
        }
      }
    }

    // If there are cycles, keep the partial topo order (still valuable), then append the remaining nodes.
    // This avoids losing correct ordering like `users` before `announcements`.
    const orderedSet = new Set(ordered);
    const remaining = nodes.filter((n) => !orderedSet.has(n)).sort();
    const restoreOrder = [...ordered, ...remaining];
    const restoreTables = restoreOrder.map((name) => {
      const [schemaName, tableName] = name.split(".");
      return { name, schemaName, tableName };
    });

    let restoredTables = 0;
    let totalRows = 0;
    let firstError: string | undefined;

    try {
      await db.transaction(async (tx) => {
        // Prefer a single TRUNCATE across all tables to ensure we don't leave behind seeded rows.
        let truncatedAll = false;
        {
          const sp = "sp_truncate_all";
          await tx.execute(sql.raw(`SAVEPOINT ${sp}`));
          try {
            const truncateTargets = restoreTables.map((t) => `"${t.schemaName}"."${t.tableName}"`).join(", ");
            if (truncateTargets.length > 0) {
              await tx.execute(sql.raw(`TRUNCATE TABLE ${truncateTargets} RESTART IDENTITY CASCADE`));
            }
            await tx.execute(sql.raw(`RELEASE SAVEPOINT ${sp}`));
            truncatedAll = true;
          } catch {
            await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${sp}`));
            await tx.execute(sql.raw(`RELEASE SAVEPOINT ${sp}`));
          }
        }

        if (!truncatedAll) {
          // Fallback: per-table truncation
          for (let i = 0; i < restoreTables.length; i++) {
            const t = restoreTables[restoreTables.length - 1 - i];
            const full = `"${t.schemaName}"."${t.tableName}"`;
            const sp = `sp_truncate_${i}`;
            await tx.execute(sql.raw(`SAVEPOINT ${sp}`));
            try {
              await tx.execute(sql.raw(`TRUNCATE TABLE ${full} RESTART IDENTITY CASCADE`));
              await tx.execute(sql.raw(`RELEASE SAVEPOINT ${sp}`));
              continue;
            } catch {
              await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${sp}`));
              await tx.execute(sql.raw(`RELEASE SAVEPOINT ${sp}`));
            }

            const sp2 = `sp_delete_${i}`;
            await tx.execute(sql.raw(`SAVEPOINT ${sp2}`));
            try {
              await tx.execute(sql.raw(`DELETE FROM ${full}`));
              await tx.execute(sql.raw(`RELEASE SAVEPOINT ${sp2}`));
            } catch (e: any) {
              await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${sp2}`));
              await tx.execute(sql.raw(`RELEASE SAVEPOINT ${sp2}`));
              if (String(e?.message || "").includes("does not exist")) {
                continue;
              }
              throw e;
            }
          }
        }

        let pending = [...restoreTables];
        let pass = 0;
        let lastFkError: string | undefined;
        while (pending.length > 0) {
          pass++;
          let progress = false;
          const nextPending: typeof pending = [];

          for (let i = 0; i < pending.length; i++) {
            const t = pending[i];
            const full = `"${t.schemaName}"."${t.tableName}"`;
            const savepoint = `sp_${pass}_${i}`;
            await tx.execute(sql.raw(`SAVEPOINT ${savepoint}`));
            try {
              const rows: any[] = snapshot.tables[t.name] || [];
              let colsRows: Array<{ column_name: string; data_type: string; column_default: string | null; is_identity: string | null }> = [];
              try {
                const colsRes: any = await tx.execute(
                  sql`SELECT column_name, data_type, column_default, is_identity FROM information_schema.columns WHERE table_schema = ${t.schemaName} AND table_name = ${t.tableName} ORDER BY ordinal_position`,
                );
                colsRows = (colsRes as any).rows ?? (colsRes as any);
              } catch {
                await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${savepoint}`));
                await tx.execute(sql.raw(`RELEASE SAVEPOINT ${savepoint}`));
                continue;
              }
              if (!colsRows || colsRows.length === 0) {
                await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${savepoint}`));
                await tx.execute(sql.raw(`RELEASE SAVEPOINT ${savepoint}`));
                continue;
              }

              const pkRes: any = await tx.execute(
                sql`SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_schema = ${t.schemaName}
                      AND tc.table_name = ${t.tableName}
                    ORDER BY kcu.ordinal_position`,
              );
              const pkRows: Array<{ column_name: string }> = (pkRes as any).rows ?? (pkRes as any);
              const pkCols = (pkRows || []).map((r) => r.column_name).filter(Boolean);

              const colSet = new Set((colsRows || []).map((c) => c.column_name));
              const seqCols = (colsRows || [])
                .filter((c) => c.is_identity === 'YES' || (c.column_default || '').toLowerCase().startsWith('nextval('))
                .map((c) => c.column_name);

              let inserted = 0;
              for (const r of rows) {
                const cols = Object.keys(r).filter((k) => colSet.has(k));
                if (cols.length === 0) continue;
                const valuesSql = cols.map((c) => this.toSqlLiteral(r[c])).join(",");
                const insertBase = `INSERT INTO ${full} ("${cols.join("\",\"")}") VALUES (${valuesSql})`;

                const canUpsert = pkCols.length > 0 && pkCols.every((c) => cols.includes(c));
                let query = insertBase;
                if (canUpsert) {
                  const nonPkCols = cols.filter((c) => !pkCols.includes(c));
                  if (nonPkCols.length === 0) {
                    query = `${insertBase} ON CONFLICT ("${pkCols.join("\",\"")}") DO NOTHING`;
                  } else {
                    const setSql = nonPkCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ");
                    query = `${insertBase} ON CONFLICT ("${pkCols.join("\",\"")}") DO UPDATE SET ${setSql}`;
                  }
                }

                await tx.execute(sql.raw(query));
                inserted++;
              }

              for (const c of seqCols) {
                const reg = `"${t.schemaName}"."${t.tableName}"`;
                const resetSql = `SELECT setval(pg_get_serial_sequence('${reg}', '${c}'), GREATEST((SELECT COALESCE(MAX("${c}"), 0) FROM ${full}), 1), true)`;
                const spReset = `sp_seq_${pass}_${i}_${c}`.replace(/[^a-zA-Z0-9_]/g, "_");
                await tx.execute(sql.raw(`SAVEPOINT ${spReset}`));
                try {
                  await tx.execute(sql.raw(resetSql));
                  await tx.execute(sql.raw(`RELEASE SAVEPOINT ${spReset}`));
                } catch {
                  await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${spReset}`));
                  await tx.execute(sql.raw(`RELEASE SAVEPOINT ${spReset}`));
                }
              }

              await tx.execute(sql.raw(`RELEASE SAVEPOINT ${savepoint}`));
              restoredTables++;
              totalRows += inserted;
              progress = true;
            } catch (e: any) {
              const msg = e?.message || String(e);
              const code = e?.code;
              await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${savepoint}`)).catch(() => {});
              await tx.execute(sql.raw(`RELEASE SAVEPOINT ${savepoint}`)).catch(() => {});

              if (code === "23503" || msg.includes("violates foreign key constraint")) {
                lastFkError = `Failed inserting into ${t.name}: ${msg}`;
                nextPending.push(t);
                continue;
              }

              firstError = firstError ?? `Failed inserting into ${t.name}: ${msg}`;
              throw e;
            }
          }

          if (!progress) {
            throw new Error(lastFkError || firstError || "Failed to restore backup");
          }
          pending = nextPending;
        }

        // Reset business-number sequences after restore.
        // TRUNCATE ... RESTART IDENTITY can reset OWNED BY sequences back to their initial value,
        // which can cause duplicate number generation (enrollments/bookings/etc.) post-restore.
        const businessSeqResets: Array<{ name: string; sql: string }> = [
          {
            name: "membership_number_seq",
            sql: `SELECT setval('membership_number_seq', GREATEST((SELECT COALESCE(MAX(NULLIF(split_part(membership_number, '-', 4), '')), '0')::bigint FROM members WHERE membership_number LIKE 'EEA-%'), 10000), true)`,
          },
          {
            name: "payment_number_seq",
            sql: `SELECT setval('payment_number_seq', GREATEST((SELECT COALESCE(MAX(NULLIF(split_part(payment_number, '-', 3), '')), '0')::bigint FROM payments WHERE payment_number LIKE 'PAY-%'), 1), true)`,
          },
          {
            name: "refund_number_seq",
            sql: `SELECT setval('refund_number_seq', GREATEST((SELECT COALESCE(MAX(NULLIF(split_part(refund_number, '-', 3), '')), '0')::bigint FROM refunds WHERE refund_number LIKE 'REF-%'), 1), true)`,
          },
          {
            name: "invoice_number_seq",
            sql: `SELECT setval('invoice_number_seq', GREATEST((SELECT COALESCE(MAX(NULLIF(split_part(invoice_number, '-', 3), '')), '0')::bigint FROM invoices WHERE invoice_number LIKE 'INV-%'), 1), true)`,
          },
          {
            name: "trip_booking_number_seq",
            sql: `SELECT setval('trip_booking_number_seq', GREATEST((SELECT COALESCE(MAX(NULLIF(split_part(booking_number, '-', 3), '')), '0')::bigint FROM trip_bookings WHERE booking_number LIKE 'TRB-%'), 1), true)`,
          },
          {
            name: "job_application_number_seq",
            sql: `SELECT setval('job_application_number_seq', GREATEST((SELECT COALESCE(MAX(NULLIF(split_part(application_number, '-', 3), '')), '0')::bigint FROM job_applications WHERE application_number LIKE 'APP-%'), 1), true)`,
          },
          {
            name: "training_enrollment_number_seq",
            sql: `SELECT setval('training_enrollment_number_seq', GREATEST((SELECT COALESCE(MAX(NULLIF(split_part(enrollment_number, '-', 3), '')), '0')::bigint FROM training_enrollments WHERE enrollment_number LIKE 'TEN-%'), 1), true)`,
          },
          {
            name: "course_enrollment_number_seq",
            sql: `SELECT setval('course_enrollment_number_seq', GREATEST((SELECT COALESCE(MAX(NULLIF(split_part(enrollment_number, '-', 3), '')), '0')::bigint FROM course_enrollments WHERE enrollment_number LIKE 'LEN-%'), 1), true)`,
          },
          {
            name: "event_registration_number_seq",
            sql: `SELECT setval('event_registration_number_seq', GREATEST((SELECT COALESCE(MAX(NULLIF(split_part(registration_number, '-', 3), '')), '0')::bigint FROM event_registrations WHERE registration_number LIKE 'EVR-%'), 1), true)`,
          },
          {
            name: "service_request_number_seq",
            sql: `SELECT setval('service_request_number_seq', GREATEST((SELECT COALESCE(MAX(NULLIF(split_part(request_number, '-', 3), '')), '0')::bigint FROM service_requests WHERE request_number LIKE 'SRV-%'), 1), true)`,
          },
        ];

        for (let i = 0; i < businessSeqResets.length; i++) {
          const { name, sql: stmt } = businessSeqResets[i];
          const sp = `sp_business_seq_${i}_${name}`.replace(/[^a-zA-Z0-9_]/g, "_");
          await tx.execute(sql.raw(`SAVEPOINT ${sp}`));
          try {
            await tx.execute(sql.raw(stmt));
            await tx.execute(sql.raw(`RELEASE SAVEPOINT ${sp}`));
          } catch {
            await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${sp}`)).catch(() => {});
            await tx.execute(sql.raw(`RELEASE SAVEPOINT ${sp}`)).catch(() => {});
          }
        }

      });
    } catch (e) {
      if (firstError) {
        throw new Error(firstError);
      }
      throw e;
    }
    return { restoredTables, rows: totalRows };
  }

  private toSqlLiteral(v: any): string {
    if (v === null || typeof v === "undefined") return "NULL";
    if (typeof v === "number" || typeof v === "bigint") return String(v);
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    if (v instanceof Date) return `'${this.escapeString(v.toISOString())}'`;
    if (typeof v === "object") {
      // JSON value
      const json = JSON.stringify(v);
      return `'${this.escapeString(json)}'::jsonb`;
    }
    // fallback string
    return `'${this.escapeString(String(v))}'`;
  }

  private escapeString(s: string): string {
    return s.replace(/'/g, "''");
  }
}

export const backupsService = new BackupsService();
