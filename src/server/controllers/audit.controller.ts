import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditService } from "../services/audit.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";
import { handleRouteError, successResponse } from "../utils/response";
import { validateQuery } from "../utils/validation";
import { requirePermission } from "../utils/rbac";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  userId: z.string().uuid().optional(),
  user: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(),
});

export class AuditController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "audit.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const actionRaw = query.action ? String(query.action).trim().toLowerCase() : "";
      const action = actionRaw && schema.auditActionEnum.enumValues.includes(actionRaw as any) ? actionRaw : undefined;
      const result = await auditService.list({ ...query, action } as any);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async exportCsv(request: NextRequest) {
    try {
      await requirePermission(request, "audit.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await auditService.list({ ...query, page: 1, limit: 5000 });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      const rows = result.data.items;
      const header = ["id","userId","userEmail","action","resource","resourceId","ipAddress","userAgent","createdAt"];
      const lines = [header.join(",")].concat(
        rows.map((r: any) => {
          const vals = [r.id, r.userId || "", r.userEmail || "", r.action, r.resource, r.resourceId || "", r.ipAddress || "", (r.userAgent || "").replace(/\n|\r|,/g, " "), new Date(r.createdAt).toISOString()];
          return vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
        }),
      );
      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-logs.csv"`,
        },
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async exportJson(request: NextRequest) {
    try {
      await requirePermission(request, "audit.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await auditService.list({ ...query, page: 1, limit: 5000 });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return new NextResponse(JSON.stringify(result.data.items), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="audit-logs.json"`,
        },
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async metrics(request: NextRequest) {
    try {
      await requirePermission(request, "audit.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);

      const actionRaw = query.action ? String(query.action).trim().toLowerCase() : "";
      const action = actionRaw && schema.auditActionEnum.enumValues.includes(actionRaw as any) ? actionRaw : undefined;

      const filters: any[] = [];
      if (query.q) {
        const like = `%${query.q}%`;
        filters.push(sql`(${schema.auditLogs.ipAddress} ILIKE ${like} OR ${schema.auditLogs.userAgent} ILIKE ${like})`);
      }
      if (query.resource) {
        const likeResource = `%${String(query.resource).trim()}%`;
        filters.push(sql`${schema.auditLogs.resource} ILIKE ${likeResource}`);
      }
      if (action) filters.push(sql`${schema.auditLogs.action} = ${action}`);
      if (query.user) {
        const likeUser = `%${query.user}%`;
        filters.push(sql`EXISTS (SELECT 1 FROM ${schema.users} WHERE ${schema.users.id} = ${schema.auditLogs.userId} AND ${schema.users.email} ILIKE ${likeUser})`);
      }
      if (query.dateFrom) filters.push(sql`${schema.auditLogs.createdAt} >= ${new Date(query.dateFrom)}`);
      if (query.dateTo) filters.push(sql`${schema.auditLogs.createdAt} <= ${new Date(query.dateTo)}`);
      const where = filters.length ? sql.join(filters, sql` AND `) : undefined;

      const [{ totalLogs }] = await db
        .select({ totalLogs: sql<number>`COUNT(*)` })
        .from(schema.auditLogs)
        .where(where as any);

      const countAction = async (a: string) => {
        const [row] = await db
          .select({ c: sql<number>`COUNT(*)` })
          .from(schema.auditLogs)
          .where(sql`${schema.auditLogs.action} = ${a} AND ${where ? sql`(${where})` : sql`true`}` as any);
        return Number((row as any)?.c || 0);
      };

      const [createCount, updateCount, deleteCount, loginCount, logoutCount] = await Promise.all([
        countAction('create'),
        countAction('update'),
        countAction('delete'),
        countAction('login'),
        countAction('logout'),
      ]);

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ last30dCount }] = await db
        .select({ last30dCount: sql<number>`COUNT(*)` })
        .from(schema.auditLogs)
        .where(sql`${schema.auditLogs.createdAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ distinctUsers }] = await db
        .select({ distinctUsers: sql<number>`COUNT(DISTINCT ${schema.auditLogs.userId})` })
        .from(schema.auditLogs)
        .where(where as any);

      const [{ distinctResources }] = await db
        .select({ distinctResources: sql<number>`COUNT(DISTINCT ${schema.auditLogs.resource})` })
        .from(schema.auditLogs)
        .where(where as any);

      return successResponse({
        totalLogs: Number(totalLogs || 0),
        createCount,
        updateCount,
        deleteCount,
        loginCount,
        logoutCount,
        last30dCount: Number(last30dCount || 0),
        distinctUsers: Number(distinctUsers || 0),
        distinctResources: Number(distinctResources || 0),
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
