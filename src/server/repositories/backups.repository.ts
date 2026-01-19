import { db } from "@/shared/db";
import { backups } from "@/shared/db/schema/system";
import { and, eq, sql } from "drizzle-orm";
import { stat } from "fs/promises";

export class BackupsRepository {
  async list(params: { page?: number; limit?: number; sort?: "createdAt.desc" | "createdAt.asc" }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 10));
    const offset = (page - 1) * limit;
    const orderBy = params.sort === "createdAt.asc" ? backups.createdAt : sql`${backups.createdAt} DESC`;

    const items = await db.select().from(backups).orderBy(orderBy as any).limit(limit).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(backups);
    return { items, total: count ?? 0 };
  }

  async findById(id: string) {
    const [row] = await db.select().from(backups).where(eq(backups.id, id)).limit(1);
    return row || null;
  }

  async createManual(input: { name?: string; createdBy?: string | null; fileName: string; filePath: string; status?: string; type?: string; metadata?: Record<string, unknown> }) {
    const [row] = await db
      .insert(backups)
      .values({
        name: input.name || "Manual Backup",
        fileName: input.fileName,
        filePath: input.filePath,
        fileSize: 0,
        status: (input.status || "pending") as any,
        type: input.type || "manual",
        createdBy: (input.createdBy as any) ?? null,
        metadata: input.metadata ?? null,
        completedAt: null,
      })
      .returning();
    return row;
  }

  async update(id: string, patch: Partial<{ status: string; fileSize: number; completedAt: Date | null }>) {
    const [row] = await db.update(backups).set(patch as any).where(eq(backups.id, id)).returning();
    return row || null;
  }

  async delete(id: string) {
    const res = await db.delete(backups).where(eq(backups.id, id));
    return res.rowCount ? res.rowCount > 0 : false;
  }

  async finalize(id: string, size?: number) {
    let finalSize = typeof size === "number" ? size : 0;
    if (finalSize === 0) {
      const rec = await this.findById(id);
      if (rec?.filePath) {
        try {
          const st = await stat(rec.filePath).catch(() => null as any);
          if (st) finalSize = st.size || 0;
        } catch {}
      }
    }
    const row = await this.update(id, { status: "completed", fileSize: finalSize, completedAt: new Date() } as any);
    return row;
  }

  async cleanupRetention(params: { keepLast?: number; maxAgeDays?: number }) {
    // delete older backups beyond keepLast, and older than maxAgeDays
    const all = await db.select().from(backups).orderBy(sql`${backups.createdAt} DESC` as any);
    let toDelete: string[] = [];
    if (typeof params.keepLast === "number" && params.keepLast >= 0) {
      toDelete = toDelete.concat(all.slice(params.keepLast).map((b: any) => b.id));
    }
    if (typeof params.maxAgeDays === "number" && params.maxAgeDays > 0) {
      const cutoff = new Date(Date.now() - params.maxAgeDays * 86400000);
      toDelete = toDelete.concat(all.filter((b: any) => new Date(b.createdAt) < cutoff).map((b: any) => b.id));
    }
    // unique ids
    toDelete = Array.from(new Set(toDelete));
    if (!toDelete.length) return { deleted: 0, items: [] as Array<{ id: string; filePath: string; fileName: string }> };
    const items = all
      .filter((b: any) => toDelete.includes(b.id))
      .map((b: any) => ({ id: b.id as string, filePath: b.filePath as string, fileName: b.fileName as string }));
    const res = await db.delete(backups).where(sql`${backups.id} IN ${toDelete}` as any);
    const count = res.rowCount ? Number(res.rowCount) : toDelete.length;
    return { deleted: count, items };
  }
 }

export const backupsRepository = new BackupsRepository();
