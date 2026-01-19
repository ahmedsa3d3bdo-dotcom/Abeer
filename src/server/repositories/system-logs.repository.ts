import { db } from "@/shared/db";
import { systemLogs } from "@/shared/db/schema/system";
import { and, eq, sql } from "drizzle-orm";

export interface ListSystemLogsParams {
  page?: number;
  limit?: number;
  q?: string;
  level?: string;
  source?: string;
  path?: string;
  requestId?: string;
  user?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "createdAt.desc" | "createdAt.asc";
}

export class SystemLogsRepository {
  async list(params: ListSystemLogsParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 10));
    const offset = (page - 1) * limit;

    const filters: any[] = [];

    if (params.level) filters.push(eq(systemLogs.level, params.level));
    if (params.source) filters.push(eq(systemLogs.source, params.source));
    if (params.path) filters.push(sql`${systemLogs.path} ILIKE ${`%${params.path}%`}`);
    if (params.requestId) filters.push(sql`${systemLogs.requestId} ILIKE ${`%${params.requestId}%`}`);
    if (params.user) filters.push(sql`${systemLogs.userEmail} ILIKE ${`%${params.user}%`}`);

    if (params.dateFrom) filters.push(sql`${systemLogs.createdAt} >= ${new Date(params.dateFrom)}`);
    if (params.dateTo) filters.push(sql`${systemLogs.createdAt} <= ${new Date(params.dateTo)}`);

    if (params.q) {
      const like = `%${params.q}%`;
      filters.push(
        sql`(
          ${systemLogs.message} ILIKE ${like}
          OR ${systemLogs.stack} ILIKE ${like}
          OR ${systemLogs.path} ILIKE ${like}
          OR ${systemLogs.userEmail} ILIKE ${like}
          OR ${systemLogs.requestId} ILIKE ${like}
          OR (${systemLogs.metadata}::text) ILIKE ${like}
        )`,
      );
    }

    const where = filters.length ? and(...filters) : (undefined as any);
    const orderBy = params.sort === "createdAt.asc" ? systemLogs.createdAt : sql`${systemLogs.createdAt} DESC`;

    const items = await db
      .select({
        id: systemLogs.id,
        level: systemLogs.level,
        source: systemLogs.source,
        message: systemLogs.message,
        stack: systemLogs.stack,
        requestId: systemLogs.requestId,
        path: systemLogs.path,
        method: systemLogs.method,
        statusCode: systemLogs.statusCode,
        userId: systemLogs.userId,
        userEmail: systemLogs.userEmail,
        ipAddress: systemLogs.ipAddress,
        userAgent: systemLogs.userAgent,
        metadata: systemLogs.metadata,
        createdAt: systemLogs.createdAt,
      })
      .from(systemLogs)
      .where(where)
      .orderBy(orderBy as any)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(systemLogs).where(where);

    return { items, total: count ?? 0 };
  }

  async findById(id: string) {
    const [row] = await db.select().from(systemLogs).where(eq(systemLogs.id, id as any)).limit(1);
    return row || null;
  }

  async create(input: {
    level: string;
    source: string;
    message: string;
    stack?: string | null;
    requestId?: string | null;
    path?: string | null;
    method?: string | null;
    statusCode?: number | null;
    userId?: string | null;
    userEmail?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const [row] = await db
      .insert(systemLogs)
      .values({
        level: input.level,
        source: input.source,
        message: input.message,
        stack: input.stack ?? null,
        requestId: input.requestId ?? null,
        path: input.path ?? null,
        method: input.method ?? null,
        statusCode: input.statusCode ?? null,
        userId: (input.userId as any) ?? null,
        userEmail: input.userEmail ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: (input.metadata as any) ?? null,
      } as any)
      .returning();

    return row;
  }

  async purgeOlderThan(cutoff: Date) {
    const res: any = await db.delete(systemLogs).where(sql`${systemLogs.createdAt} < ${cutoff}` as any);
    return res?.rowCount ? Number(res.rowCount) : 0;
  }
}

export const systemLogsRepository = new SystemLogsRepository();
