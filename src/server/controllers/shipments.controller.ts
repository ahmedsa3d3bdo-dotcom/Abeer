import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { shipmentsService } from "../services/shipments.service";
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
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(),
});

const updateSchema = z.object({
  status: z.string().optional(),
  trackingNumber: z.string().nullable().optional(),
  carrier: z.string().nullable().optional(),
  shippingMethodId: z.string().uuid().nullable().optional(),
  shippedAt: z.coerce.date().nullable().optional(),
  deliveredAt: z.coerce.date().nullable().optional(),
  estimatedDeliveryAt: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export class ShipmentsController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "shipping.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await shipmentsService.list(query);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async get(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "shipping.view");
      const result = await shipmentsService.get(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async update(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "shipping.manage");
      const body = await validateBody(request, updateSchema);
      const result = await shipmentsService.update(id, body);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      await writeAudit({
        action: "update",
        resource: "shipments",
        resourceId: id,
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

  static async remove(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "shipping.manage");
      const result = await shipmentsService.remove(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });

      await writeAudit({
        action: "delete",
        resource: "shipments",
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
      await requirePermission(request, "shipping.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);

      const filters: any[] = [];
      if (query.q) {
        const like = `%${query.q}%`;
        filters.push(
          sql`(${schema.shipments.trackingNumber} ILIKE ${like} OR ${schema.shipments.carrier} ILIKE ${like} OR EXISTS (
            SELECT 1 FROM ${schema.orders}
            WHERE ${schema.orders.id} = ${schema.shipments.orderId}
              AND (${schema.orders.orderNumber} ILIKE ${like})
          ))`,
        );
      }
      if (query.status) filters.push(sql`${schema.shipments.status} = ${query.status}`);
      if (query.dateFrom) filters.push(sql`${schema.shipments.createdAt} >= ${new Date(query.dateFrom)}`);
      if (query.dateTo) filters.push(sql`${schema.shipments.createdAt} <= ${new Date(query.dateTo)}`);
      const where = filters.length ? sql.join(filters, sql` AND `) : undefined;

      const [{ totalShipments }] = await db
        .select({ totalShipments: sql<number>`COUNT(*)` })
        .from(schema.shipments)
        .where(where as any);

      const statusCount = async (s: string) => {
        const [row] = await db
          .select({ c: sql<number>`COUNT(*)` })
          .from(schema.shipments)
          .where(sql`${schema.shipments.status} = ${s} AND ${where ? sql`(${where})` : sql`true`}` as any);
        return Number((row as any)?.c || 0);
      };

      const [pendingCount, processingCount, inTransitCount, outForDeliveryCount, deliveredCount, failedCount, returnedCount] = await Promise.all([
        statusCount('pending'),
        statusCount('processing'),
        statusCount('in_transit'),
        statusCount('out_for_delivery'),
        statusCount('delivered'),
        statusCount('failed'),
        statusCount('returned'),
      ]);

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ shipped30d }] = await db
        .select({ shipped30d: sql<number>`COUNT(*)` })
        .from(schema.shipments)
        .where(sql`${schema.shipments.shippedAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ delivered30d }] = await db
        .select({ delivered30d: sql<number>`COUNT(*)` })
        .from(schema.shipments)
        .where(sql`${schema.shipments.deliveredAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);

      return successResponse({
        totalShipments: Number(totalShipments || 0),
        pendingCount,
        processingCount,
        inTransitCount,
        outForDeliveryCount,
        deliveredCount,
        failedCount,
        returnedCount,
        shipped30d: Number(shipped30d || 0),
        delivered30d: Number(delivered30d || 0),
      });
    } catch (e) {
       return handleRouteError(e, request);
    }
  }
}
