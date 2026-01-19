import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { returnsService } from "../services/returns.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";
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
  status: z.enum(["requested", "approved", "rejected", "received", "refunded", "cancelled"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z
    .enum([
      "createdAt.desc",
      "createdAt.asc",
      "approvedAt.desc",
      "approvedAt.asc",
      "receivedAt.desc",
      "receivedAt.asc",
    ])
    .optional(),
});

const itemSchema = z.object({
  orderItemId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().nullable().optional(),
});

const upsertSchema = z.object({
  orderId: z.string().uuid(),
  rmaNumber: z.string().max(50).optional(),
  status: z
    .enum(["requested", "approved", "rejected", "received", "refunded", "cancelled"]) 
    .default("requested")
    .optional(),
  reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(itemSchema).optional(),
});

export class ReturnsController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "returns.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await returnsService.list(query as any);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async get(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "returns.view");
      const result = await returnsService.get(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async create(request: NextRequest) {
    try {
      const session = await requirePermission(request, "returns.manage");
      const body = await validateBody(request, upsertSchema);
      const result = await returnsService.create(body as any);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      await writeAudit({
        action: "create",
        resource: "returns",
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
      const session = await requirePermission(request, "returns.manage");
      const body = await validateBody(request, upsertSchema.partial());
      const patch: any = { ...body };
      if (body.status === "approved") {
        patch.approvedBy = (session?.user?.id as string | undefined) ?? null;
        patch.approvedAt = new Date();
      }
      if (body.status === "received") {
        patch.receivedAt = new Date();
      }
      const result = await returnsService.update(id, patch);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      await writeAudit({
        action: "update",
        resource: "returns",
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
      const session = await requirePermission(request, "returns.manage");
      const result = await returnsService.remove(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });

      await writeAudit({
        action: "delete",
        resource: "returns",
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
      await requirePermission(request, "returns.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);

      const filters: any[] = [];
      if (query.q) {
        const like = `%${query.q}%`;
        filters.push(sql`(${schema.returns.rmaNumber} ILIKE ${like}) OR EXISTS (
          SELECT 1 FROM ${schema.orders}
          WHERE ${schema.orders.id} = ${schema.returns.orderId}
            AND (${schema.orders.orderNumber} ILIKE ${like})
        )`);
      }
      if (query.status) filters.push(sql`${schema.returns.status} = ${query.status}`);
      if (query.dateFrom) filters.push(sql`${schema.returns.createdAt} >= ${new Date(query.dateFrom)}`);
      if (query.dateTo) filters.push(sql`${schema.returns.createdAt} <= ${new Date(query.dateTo)}`);
      const where = filters.length ? sql.join(filters, sql` AND `) : undefined;

      const [{ totalReturns }] = await db
        .select({ totalReturns: sql<number>`COUNT(*)` })
        .from(schema.returns)
        .where(where as any);

      const statusCount = async (s: string) => {
        const [row] = await db
          .select({ c: sql<number>`COUNT(*)` })
          .from(schema.returns)
          .where(sql`${schema.returns.status} = ${s} AND ${where ? sql`(${where})` : sql`true`}` as any);
        return Number((row as any)?.c || 0);
      };

      const [requestedCount, approvedCount, receivedCount, refundedCount, rejectedCount, cancelledCount] = await Promise.all([
        statusCount('requested'),
        statusCount('approved'),
        statusCount('received'),
        statusCount('refunded'),
        statusCount('rejected'),
        statusCount('cancelled'),
      ]);

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ last30dCount }] = await db
        .select({ last30dCount: sql<number>`COUNT(*)` })
        .from(schema.returns)
        .where(sql`${schema.returns.createdAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);

      return successResponse({
        totalReturns: Number(totalReturns || 0),
        requestedCount,
        approvedCount,
        receivedCount,
        refundedCount,
        rejectedCount,
        cancelledCount,
        last30dCount: Number(last30dCount || 0),
      });
    } catch (e) {
       return handleRouteError(e, request);
    }
  }
}
