import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { discountsService } from "../services/discounts.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
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
  status: z.enum(["draft", "active", "expired", "archived"]).optional(),
  type: z.enum(["percentage", "fixed_amount", "free_shipping"]).optional(),
  scope: z.enum(["all", "products", "categories", "collections", "customer_groups"]).optional(),
  kind: z.enum(["coupon", "scheduled_offer", "bxgy_generic", "bxgy_bundle", "bundle_offer"]).optional(),
  isAutomatic: z.coerce.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  activeNow: z.coerce.boolean().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc", "startsAt.desc", "startsAt.asc"]).optional(),
});

const usageQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const upsertSchemaObject = z.object({
  name: z.string().min(1),
  code: z
    .string()
    .max(50)
    .nullable()
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const s = String(v).trim();
      if (!s) return null;
      return s.toUpperCase();
    }),
  type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
  value: z.string(),
  scope: z.enum(["all", "products", "categories", "collections", "customer_groups"]).default("all"),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  minSubtotal: z.string().nullable().optional(),
  isAutomatic: z.coerce.boolean().default(false).optional(),
  status: z.enum(["draft", "active", "expired", "archived"]).default("draft").optional(),
  productIds: z.array(z.string().uuid()).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  metadata: z.any().optional(),
});

const createSchema = upsertSchemaObject.superRefine((data, ctx) => {
  if (data.isAutomatic && data.code) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Automatic discounts cannot have a code" });
  }
});

const updateSchema = upsertSchemaObject.partial().superRefine((data, ctx) => {
  if (data.isAutomatic && data.code) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Automatic discounts cannot have a code" });
  }
});

export class DiscountsController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "discounts.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await discountsService.list(query as any);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async get(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "discounts.view");
      const result = await discountsService.get(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async create(request: NextRequest) {
    try {
      const session = await requirePermission(request, "discounts.manage");
      const body: any = await validateBody(request, createSchema);
      const payload: any = { ...body };
      if (body.startsAt) payload.startsAt = new Date(body.startsAt);
      if (body.endsAt) payload.endsAt = new Date(body.endsAt);
      const result = await discountsService.create(payload);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      await writeAudit({
        action: "create",
        resource: "discounts",
        resourceId: (result.data as any)?.id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
        changes: payload,
      });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async update(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "discounts.manage");
      const body: any = await validateBody(request, updateSchema);
      const payload: any = { ...body };
      if (body.startsAt !== undefined) payload.startsAt = body.startsAt ? new Date(body.startsAt) : null;
      if (body.endsAt !== undefined) payload.endsAt = body.endsAt ? new Date(body.endsAt) : null;
      const result = await discountsService.update(id, payload);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      await writeAudit({
        action: "update",
        resource: "discounts",
        resourceId: id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
        changes: payload,
      });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async remove(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "discounts.manage");
      const result = await discountsService.remove(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });

      await writeAudit({
        action: "delete",
        resource: "discounts",
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

  static async usage(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "discounts.view");
      const query = validateQuery(request.nextUrl.searchParams, usageQuerySchema);

      const page = Math.max(1, Number((query as any)?.page || 1));
      const limit = Math.min(100, Math.max(1, Number((query as any)?.limit || 20)));
      const offset = (page - 1) * limit;

      const items = await db
        .select({
          orderId: schema.orderDiscounts.orderId,
          orderNumber: schema.orders.orderNumber,
          customerEmail: schema.orders.customerEmail,
          amount: schema.orderDiscounts.amount,
          code: schema.orderDiscounts.code,
          createdAt: schema.orderDiscounts.createdAt,
          totalAmount: schema.orders.totalAmount,
          currency: schema.orders.currency,
          discountType: schema.discounts.type,
          discountMetadata: schema.discounts.metadata,
        })
        .from(schema.orderDiscounts)
        .innerJoin(schema.orders, eq(schema.orderDiscounts.orderId, schema.orders.id))
        .leftJoin(schema.discounts, eq(schema.discounts.id, schema.orderDiscounts.discountId))
        .where(eq(schema.orderDiscounts.discountId, id as any))
        .orderBy(desc(schema.orderDiscounts.createdAt))
        .limit(limit)
        .offset(offset);

      const needsComputed = items.some((it: any) => {
        if (Number(it?.amount ?? 0) !== 0) return false;
        if (String(it?.discountType || "") === "free_shipping") return false;
        const md: any = it?.discountMetadata || null;
        const isOffer = md?.kind === "offer" && md?.offerKind === "standard";
        const isDeal = md?.kind === "deal" && (md?.offerKind === "bxgy_generic" || md?.offerKind === "bxgy_bundle");
        return isOffer || isDeal;
      });

      let computedByOrderId = new Map<string, { offerSavings: number; giftSavings: number }>();
      if (needsComputed) {
        const orderIds = Array.from(new Set(items.map((x: any) => String(x.orderId)).filter(Boolean)));
        if (orderIds.length) {
          const rows = await db
            .select({
              orderId: schema.orderItems.orderId,
              quantity: schema.orderItems.quantity,
              unitPrice: schema.orderItems.unitPrice,
              totalPrice: schema.orderItems.totalPrice,
              baseProductPrice: schema.products.price,
              baseVariantPrice: schema.productVariants.price,
            })
            .from(schema.orderItems)
            .leftJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
            .leftJoin(schema.productVariants, eq(schema.productVariants.id, schema.orderItems.variantId))
            .where(inArray(schema.orderItems.orderId, orderIds as any));

          for (const r of rows as any[]) {
            const oid = String(r.orderId);
            const qty = Number(r.quantity || 0);
            if (!Number.isFinite(qty) || qty <= 0) continue;

            const unit = parseFloat(String(r.unitPrice ?? 0));
            const total = parseFloat(String(r.totalPrice ?? 0));
            const isGift = unit === 0 && total === 0;

            const base = parseFloat(String(r.baseVariantPrice ?? r.baseProductPrice ?? 0));
            if (!Number.isFinite(base) || base <= 0) continue;

            const cur = computedByOrderId.get(oid) || { offerSavings: 0, giftSavings: 0 };

            if (isGift) {
              cur.giftSavings += base * qty;
            } else if (Number.isFinite(unit) && unit > 0 && unit < base) {
              cur.offerSavings += (base - unit) * qty;
            }

            computedByOrderId.set(oid, cur);
          }
        }
      }

      const normalizedItems = items.map((it: any) => {
        const rawAmount = Number(it?.amount ?? 0);
        if (rawAmount !== 0) return it;
        if (String(it?.discountType || "") === "free_shipping") return it;
        const md: any = it?.discountMetadata || null;
        const isOffer = md?.kind === "offer" && md?.offerKind === "standard";
        const isDeal = md?.kind === "deal" && (md?.offerKind === "bxgy_generic" || md?.offerKind === "bxgy_bundle");
        if (!isOffer && !isDeal) return it;

        const agg = computedByOrderId.get(String(it.orderId)) || { offerSavings: 0, giftSavings: 0 };
        const computed = isOffer ? agg.offerSavings : agg.giftSavings;
        const nextAmount = Math.max(0, Number(Number(computed || 0).toFixed(2)));
        return { ...it, amount: nextAmount };
      });

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.orderDiscounts)
        .where(eq(schema.orderDiscounts.discountId, id as any));

      return successResponse({
        items: normalizedItems,
        total: Number(count || 0),
        page,
        limit,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async metrics(request: NextRequest) {
    try {
      await requirePermission(request, "discounts.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);

      const filters: any[] = [];
      if (query.q) {
        const like = `%${query.q}%`;
        filters.push(sql`(${schema.discounts.name} ILIKE ${like} OR ${schema.discounts.code} ILIKE ${like})`);
      }
      if (query.status) filters.push(sql`${schema.discounts.status} = ${query.status}`);
      if (query.type && query.kind !== "bxgy_generic" && query.kind !== "bxgy_bundle") {
        filters.push(sql`${schema.discounts.type} = ${query.type}`);
        if (!query.kind) {
          filters.push(
            sql`NOT (coalesce(${schema.discounts.metadata} ->> 'kind', '') = 'deal' AND coalesce(${schema.discounts.metadata} ->> 'offerKind', '') IN ('bxgy_generic', 'bxgy_bundle'))`,
          );
        }
      }
      if (query.scope) filters.push(sql`${schema.discounts.scope} = ${query.scope}`);
      if (query.kind) {
        if (query.kind === "coupon") {
          filters.push(sql`${schema.discounts.isAutomatic} = false`);
        } else if (query.kind === "scheduled_offer") {
          filters.push(sql`${schema.discounts.isAutomatic} = true`);
          filters.push(sql`coalesce(${schema.discounts.metadata} ->> 'kind', '') = 'offer'`);
          filters.push(sql`coalesce(${schema.discounts.metadata} ->> 'offerKind', '') <> 'bundle'`);
        } else if (query.kind === "bundle_offer") {
          filters.push(sql`${schema.discounts.isAutomatic} = true`);
          filters.push(sql`coalesce(${schema.discounts.metadata} ->> 'kind', '') = 'offer'`);
          filters.push(sql`coalesce(${schema.discounts.metadata} ->> 'offerKind', '') = 'bundle'`);
        } else if (query.kind === "bxgy_generic") {
          filters.push(sql`${schema.discounts.isAutomatic} = true`);
          filters.push(sql`coalesce(${schema.discounts.metadata} ->> 'kind', '') = 'deal'`);
          filters.push(sql`coalesce(${schema.discounts.metadata} ->> 'offerKind', '') = 'bxgy_generic'`);
        } else if (query.kind === "bxgy_bundle") {
          filters.push(sql`${schema.discounts.isAutomatic} = true`);
          filters.push(sql`coalesce(${schema.discounts.metadata} ->> 'kind', '') = 'deal'`);
          filters.push(sql`coalesce(${schema.discounts.metadata} ->> 'offerKind', '') = 'bxgy_bundle'`);
        }
      }
      if (typeof query.isAutomatic === "boolean") filters.push(sql`${schema.discounts.isAutomatic} = ${query.isAutomatic}`);
      if (query.dateFrom) filters.push(sql`${schema.discounts.createdAt} >= ${new Date(query.dateFrom)}`);
      if (query.dateTo) filters.push(sql`${schema.discounts.createdAt} <= ${new Date(query.dateTo)}`);

      const where = filters.length ? sql.join(filters, sql` AND `) : undefined;

      const [{ totalDiscounts }] = await db
        .select({ totalDiscounts: sql<number>`COUNT(*)` })
        .from(schema.discounts)
        .where(where as any);

      const statusCount = async (s: string) => {
        const [row] = await db
          .select({ c: sql<number>`COUNT(*)` })
          .from(schema.discounts)
          .where(sql`${schema.discounts.status} = ${s} AND ${where ? sql`(${where})` : sql`true`}` as any);
        return Number((row as any)?.c || 0);
      };

      const [draftCount, activeCount, expiredCount, archivedCount] = await Promise.all([
        statusCount('draft'),
        statusCount('active'),
        statusCount('expired'),
        statusCount('archived'),
      ]);

      // Active now (time window)
      const now = new Date();
      const [{ activeNowCount }] = await db
        .select({ activeNowCount: sql<number>`COUNT(*)` })
        .from(schema.discounts)
        .where(sql`${schema.discounts.status} = 'active' AND (${schema.discounts.startsAt} IS NULL OR ${schema.discounts.startsAt} <= ${now}) AND (${schema.discounts.endsAt} IS NULL OR ${schema.discounts.endsAt} >= ${now}) AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ totalUsage }] = await db
        .select({ totalUsage: sql<number>`COALESCE(SUM(${schema.discounts.usageCount}), 0)` })
        .from(schema.discounts)
        .where(where as any);

      // Sum discount given from order_discounts and order_item_discounts joined to discounts (if discountId present)
      const [{ amountOrders }] = await db
        .select({ amountOrders: sql<string>`COALESCE(SUM(${schema.orderDiscounts.amount}), '0')` })
        .from(schema.orderDiscounts)
        .innerJoin(schema.discounts, sql`${schema.orderDiscounts.discountId} = ${schema.discounts.id}`)
        .where(where as any);

      const [{ amountOrderItems }] = await db
        .select({ amountOrderItems: sql<string>`COALESCE(SUM(${schema.orderItemDiscounts.amount}), '0')` })
        .from(schema.orderItemDiscounts)
        .innerJoin(schema.discounts, sql`${schema.orderItemDiscounts.discountId} = ${schema.discounts.id}`)
        .where(where as any);

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ amountOrders30d }] = await db
        .select({ amountOrders30d: sql<string>`COALESCE(SUM(${schema.orderDiscounts.amount}), '0')` })
        .from(schema.orderDiscounts)
        .innerJoin(schema.discounts, sql`${schema.orderDiscounts.discountId} = ${schema.discounts.id}`)
        .where(sql`${schema.orderDiscounts.createdAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ amountOrderItems30d }] = await db
        .select({ amountOrderItems30d: sql<string>`COALESCE(SUM(${schema.orderItemDiscounts.amount}), '0')` })
        .from(schema.orderItemDiscounts)
        .innerJoin(schema.discounts, sql`${schema.orderItemDiscounts.discountId} = ${schema.discounts.id}`)
        .where(sql`${schema.orderItemDiscounts.createdAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);

      const currencySetting = await settingsRepository.findByKey("currency");
      const currency = currencySetting?.value || "CAD";

      const totalDiscountGiven = Number(amountOrders || 0) + Number(amountOrderItems || 0);
      const totalDiscountGiven30d = Number(amountOrders30d || 0) + Number(amountOrderItems30d || 0);

      return successResponse({
        totalDiscounts: Number(totalDiscounts || 0),
        draftCount,
        activeCount,
        expiredCount,
        archivedCount,
        activeNowCount: Number(activeNowCount || 0),
        totalUsage: Number(totalUsage || 0),
        totalDiscountGiven,
        totalDiscountGiven30d,
        currency,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
