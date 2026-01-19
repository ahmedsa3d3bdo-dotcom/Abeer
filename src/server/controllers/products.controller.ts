import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { productsService } from "../services/products.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";
import { settingsRepository } from "@/server/repositories/settings.repository";
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
  stockStatus: z.string().optional(),
  isFeatured: z.coerce.boolean().optional(),
  onSale: z.coerce.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(),
});

const upsertSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  sku: z.string().optional(),
  description: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price"),
  costPerItem: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid cost per item")
    .nullable()
    .optional(),
  compareAtPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid compare at price")
    .nullable()
    .optional(),
  status: z.string().optional(),
  stockStatus: z.string().optional(),
  trackInventory: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  allowReviews: z.coerce.boolean().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  stockQuantity: z.coerce.number().int().min(0).optional(),
  addStockQuantity: z.coerce.number().int().min(0).optional(),
});

export class ProductsController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "products.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await productsService.list(query);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async create(request: NextRequest) {
    try {
      const session = await requirePermission(request, "products.create");
      const body = await validateBody(request, upsertSchema);
      const result = await productsService.create(body);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      await writeAudit({
        action: "create",
        resource: "products",
        resourceId: (result.data as any)?.id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
        changes: body as any,
        metadata: { name: (result.data as any)?.name, slug: (result.data as any)?.slug },
      });

      return successResponse(result.data, 201);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async get(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "products.view");
      const result = await productsService.get(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async update(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "products.update");
      const body = await validateBody(request, upsertSchema);
      const result = await productsService.update(id, body);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      await writeAudit({
        action: "update",
        resource: "products",
        resourceId: id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
        changes: body as any,
        metadata: { name: (result.data as any)?.name, slug: (result.data as any)?.slug },
      });

      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async remove(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "products.delete");
      const result = await productsService.remove(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });

      await writeAudit({
        action: "delete",
        resource: "products",
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
      await requirePermission(request, "products.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);

      const filters: any[] = [];
      if (query.q) {
        const like = `%${query.q}%`;
        filters.push(sql`(${schema.products.name} ILIKE ${like} OR ${schema.products.slug} ILIKE ${like} OR ${schema.products.sku} ILIKE ${like})`);
      }
      if (query.status && query.status !== "all") filters.push(sql`${schema.products.status} = ${query.status}`);
      if (query.stockStatus && query.stockStatus !== "all") filters.push(sql`${schema.products.stockStatus} = ${query.stockStatus}`);
      if (typeof query.isFeatured === "boolean") filters.push(sql`${schema.products.isFeatured} = ${query.isFeatured}`);
      if (typeof (query as any).onSale === "boolean") {
        const saleCond = sql`${schema.products.compareAtPrice} is not null and ${schema.products.compareAtPrice} > ${schema.products.price}`;
        filters.push((query as any).onSale ? (saleCond as any) : (sql`NOT (${saleCond})` as any));
      }
      if (query.dateFrom) filters.push(sql`${schema.products.createdAt} >= ${new Date(query.dateFrom)}`);
      if (query.dateTo) filters.push(sql`${schema.products.createdAt} <= ${new Date(query.dateTo)}`);
      const where = filters.length ? sql.join(filters, sql` AND `) : undefined;

      const [{ totalProducts }] = await db
        .select({ totalProducts: sql<number>`count(*)` })
        .from(schema.products)
        .where(where as any);

      const [{ activeProducts }] = await db
        .select({ activeProducts: sql<number>`count(*)` })
        .from(schema.products)
        .where(sql`${schema.products.status} = 'active' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ featuredProducts }] = await db
        .select({ featuredProducts: sql<number>`count(*)` })
        .from(schema.products)
        .where(sql`${schema.products.isFeatured} = true AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ lowStockProducts }] = await db
        .select({ lowStockProducts: sql<number>`count(*)` })
        .from(schema.products)
        .where(sql`${schema.products.stockStatus} = 'low_stock' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ outOfStockProducts }] = await db
        .select({ outOfStockProducts: sql<number>`count(*)` })
        .from(schema.products)
        .where(sql`${schema.products.stockStatus} = 'out_of_stock' AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ avgPrice }] = await db
        .select({ avgPrice: sql<string>`COALESCE(AVG(${schema.products.price}), '0')` })
        .from(schema.products)
        .where(where as any);

      // Identify product IDs in the current filter scope for revenue calculation
      const idsRows = await db.select({ id: schema.products.id }).from(schema.products).where(where as any);
      const productIds = idsRows.map((r: any) => r.id);
      let revenue30d = 0;
      let unitsSold30d = 0;
      if (productIds.length) {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [agg] = await db
          .select({
            revenue30d: sql<string>`COALESCE(SUM(${schema.orderItems.totalPrice}), '0')`,
            unitsSold30d: sql<number>`COALESCE(SUM(${schema.orderItems.quantity}), 0)`,
          })
          .from(schema.orderItems)
          .innerJoin(schema.orders, sql`${schema.orderItems.orderId} = ${schema.orders.id}` as any)
          .where(sql`${schema.orderItems.productId} IN ${productIds} AND ${schema.orders.createdAt} >= ${since}`);
        revenue30d = Number((agg as any)?.revenue30d || 0);
        unitsSold30d = Number((agg as any)?.unitsSold30d || 0);
      }

      const currencySetting = await settingsRepository.findByKey("currency");
      const currency = currencySetting?.value || "CAD";

      const activeRate = totalProducts ? Math.round((Number(activeProducts || 0) / Number(totalProducts || 0)) * 100) : 0;

      return successResponse({
        totalProducts: Number(totalProducts || 0),
        activeProducts: Number(activeProducts || 0),
        featuredProducts: Number(featuredProducts || 0),
        lowStockProducts: Number(lowStockProducts || 0),
        outOfStockProducts: Number(outOfStockProducts || 0),
        avgPrice: Number(avgPrice || 0),
        revenue30d,
        unitsSold30d,
        activeRate,
        currency,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
