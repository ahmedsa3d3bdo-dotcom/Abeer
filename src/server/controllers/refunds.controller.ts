import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { refundsService } from "../services/refunds.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";
import { settingsRepository } from "../repositories/settings.repository";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";
import { validateBody, validateQuery } from "../utils/validation";
import { writeAudit } from "../utils/audit";

function normalizeIp(v: string | null) {
  if (!v) return undefined;
  const first = v.split(",")[0]?.trim();
  return first || undefined;
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected", "processed"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc", "processedAt.desc", "processedAt.asc"]).optional(),
});

const itemSchema = z.object({
  orderItemId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  amount: z.string(),
  reason: z.string().nullable().optional(),
});

const upsertSchema = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid().nullable().optional(),
  amount: z.string(),
  currency: z.string().length(3).default("CAD").optional(),
  reason: z.string().nullable().optional(),
  status: z.enum(["pending", "approved", "rejected", "processed"]).optional(),
  items: z.array(itemSchema).optional(),
});

export class RefundsController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "refunds.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await refundsService.list(query as any);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async get(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "refunds.view");
      const result = await refundsService.get(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async create(request: NextRequest) {
    try {
      const session = await requirePermission(request, "refunds.manage");
      const body = await validateBody(request, upsertSchema);
      const result = await refundsService.create(body as any);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      await writeAudit({
        action: "create",
        resource: "refunds",
        resourceId: (result.data as any)?.id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
        changes: body as any,
      });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async update(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "refunds.manage");
      const body = await validateBody(request, upsertSchema.partial());
      const patch: any = { ...body };
      if (body.status === "approved") {
        patch.approvedBy = (session?.user?.id as string | undefined) ?? null;
      }
      if (body.status === "processed") {
        patch.processedAt = new Date();
      }
      const result = await refundsService.update(id, patch);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      await writeAudit({
        action: "update",
        resource: "refunds",
        resourceId: id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
        changes: patch,
      });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async remove(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "refunds.manage");
      const result = await refundsService.remove(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });

      await writeAudit({
        action: "delete",
        resource: "refunds",
        resourceId: id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
      });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async metrics(request: NextRequest) {
    try {
      await requirePermission(request, "refunds.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);

      const filters: any[] = [];
      if (query.q) {
        const like = `%${query.q}%`;
        filters.push(sql`(${schema.refunds.refundNumber} ILIKE ${like}) OR EXISTS (
          SELECT 1 FROM ${schema.orders}
          WHERE ${schema.orders.id} = ${schema.refunds.orderId}
            AND (${schema.orders.orderNumber} ILIKE ${like})
        )`);
      }
      if (query.status) filters.push(sql`${schema.refunds.status} = ${query.status}`);
      if (query.dateFrom) filters.push(sql`${schema.refunds.createdAt} >= ${new Date(query.dateFrom)}`);
      if (query.dateTo) filters.push(sql`${schema.refunds.createdAt} <= ${new Date(query.dateTo)}`);
      const where = filters.length ? sql.join(filters, sql` AND `) : undefined;

      const [{ totalRefunds, totalAmount, avgAmount } = { totalRefunds: 0, totalAmount: "0", avgAmount: "0" }] = await db
        .select({
          totalRefunds: sql<number>`COUNT(*)`,
          totalAmount: sql<string>`COALESCE(SUM(${schema.refunds.amount}), '0')`,
          avgAmount: sql<string>`COALESCE(AVG(${schema.refunds.amount}), '0')`,
        })
        .from(schema.refunds)
        .where(where as any);

      const [{ approvedCount }] = await db
        .select({ approvedCount: sql<number>`COUNT(*)` })
        .from(schema.refunds)
        .where(sql`${schema.refunds.status} = 'approved' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ processedCount }] = await db
        .select({ processedCount: sql<number>`COUNT(*)` })
        .from(schema.refunds)
        .where(sql`${schema.refunds.status} = 'processed' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ rejectedCount }] = await db
        .select({ rejectedCount: sql<number>`COUNT(*)` })
        .from(schema.refunds)
        .where(sql`${schema.refunds.status} = 'rejected' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ pendingCount }] = await db
        .select({ pendingCount: sql<number>`COUNT(*)` })
        .from(schema.refunds)
        .where(sql`${schema.refunds.status} = 'pending' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ last30dCount, last30dAmount }] = await db
        .select({
          last30dCount: sql<number>`COUNT(*)`,
          last30dAmount: sql<string>`COALESCE(SUM(${schema.refunds.amount}), '0')`,
        })
        .from(schema.refunds)
        .where(sql`${schema.refunds.createdAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);

      const currencySetting = await settingsRepository.findByKey("currency");
      const currency = currencySetting?.value || "CAD";

      return successResponse({
        totalRefunds: Number(totalRefunds || 0),
        totalAmount: Number(totalAmount || 0),
        avgAmount: Number(avgAmount || 0),
        approvedCount: Number(approvedCount || 0),
        processedCount: Number(processedCount || 0),
        pendingCount: Number(pendingCount || 0),
        rejectedCount: Number(rejectedCount || 0),
        last30dCount: Number(last30dCount || 0),
        last30dAmount: Number(last30dAmount || 0),
        currency,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
