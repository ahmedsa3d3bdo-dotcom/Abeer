import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";

export type OfferDiscount = {
  id: string;
  name: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  metadata?: any;
  productIds: string[];
  categoryIds: string[];
};

function isActiveNow(d: any, now: Date) {
  if (String(d?.status || "") !== "active") return false;
  if (d.startsAt && new Date(d.startsAt) > now) return false;
  if (d.endsAt && new Date(d.endsAt) < now) return false;
  return true;
}

export class StorefrontOffersService {
  async listActivePromotions(now = new Date()): Promise<OfferDiscount[]> {
    const rows = await db
      .select({
        id: schema.discounts.id,
        name: schema.discounts.name,
        type: schema.discounts.type,
        value: schema.discounts.value,
        status: schema.discounts.status,
        startsAt: schema.discounts.startsAt,
        endsAt: schema.discounts.endsAt,
        isAutomatic: schema.discounts.isAutomatic,
        metadata: schema.discounts.metadata,
      })
      .from(schema.discounts)
      .where(
        sql`${schema.discounts.isAutomatic} = true and ${schema.discounts.status} = 'active' and (${schema.discounts.startsAt} is null or ${schema.discounts.startsAt} <= ${now}) and (${schema.discounts.endsAt} is null or ${schema.discounts.endsAt} >= ${now})`,
      );

    const active = rows.filter((r: any) => isActiveNow(r, now));

    const ids = active.map((r) => r.id);
    let productMap: Record<string, string[]> = {};
    let categoryMap: Record<string, string[]> = {};
    if (ids.length) {
      const prodRows = await db
        .select({ did: schema.discountProducts.discountId, pid: schema.discountProducts.productId })
        .from(schema.discountProducts)
        .where(sql`${schema.discountProducts.discountId} in ${ids}`);
      for (const r of prodRows) {
        (productMap[r.did] ||= []).push(r.pid);
      }
      const catRows = await db
        .select({ did: schema.discountCategories.discountId, cid: schema.discountCategories.categoryId })
        .from(schema.discountCategories)
        .where(sql`${schema.discountCategories.discountId} in ${ids}`);
      for (const r of catRows) {
        (categoryMap[r.did] ||= []).push(r.cid);
      }

      const allCategoryIds = Array.from(new Set(catRows.map((r) => r.cid)));
      if (allCategoryIds.length) {
        const cidToDid = new Map<string, string[]>();
        for (const r of catRows) {
          const cid = String(r.cid);
          cidToDid.set(cid, [...(cidToDid.get(cid) || []), String(r.did)]);
        }

        const prodInCats = await db
          .select({ categoryId: schema.productCategories.categoryId, productId: schema.productCategories.productId })
          .from(schema.productCategories)
          .where(sql`${schema.productCategories.categoryId} in ${allCategoryIds}`);

        for (const r of prodInCats) {
          const dids = cidToDid.get(String(r.categoryId)) || [];
          for (const did of dids) {
            (productMap[did] ||= []).push(String(r.productId));
          }
        }
      }
    }

    return active.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      value: String(r.value),
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      metadata: r.metadata,
      productIds: Array.from(
        new Set(
          (productMap[r.id] || []).length
            ? productMap[r.id]
            : (() => {
                const md: any = r.metadata || null;
                if (md?.kind === "deal" && md?.offerKind === "bxgy_bundle") {
                  const spec = md?.bxgyBundle || md?.bundleBxgy || {};
                  const buy = Array.isArray(spec?.buy) ? spec.buy : [];
                  const get = Array.isArray(spec?.get) ? spec.get : [];
                  const ids = [...buy, ...get].map((x: any) => String(x?.productId || "")).filter(Boolean);
                  return ids;
                }
                return [] as string[];
              })(),
        ),
      ),
      categoryIds: categoryMap[r.id] || [],
    }));
  }

  async listActiveOffers(now = new Date()): Promise<OfferDiscount[]> {
    const promos = await this.listActivePromotions(now);
    return promos.filter((r: any) => {
      const md: any = r?.metadata || null;
      return md?.kind === "offer";
    });
  }

  async listActiveDisplayPromotions(now = new Date()): Promise<OfferDiscount[]> {
    const promos = await this.listActivePromotions(now);
    return promos.filter((r: any) => {
      const md: any = r?.metadata || null;
      return md?.kind === "offer" || md?.kind === "deal";
    });
  }

  async listActivePriceOffers(now = new Date()): Promise<OfferDiscount[]> {
    const promos = await this.listActivePromotions(now);
    return promos.filter((r: any) => {
      const md: any = r?.metadata || null;
      return md?.kind === "offer" && md?.offerKind === "standard";
    });
  }

  computeDiscountedUnitPrice(params: {
    baseUnitPrice: number;
    offer: OfferDiscount;
  }): number {
    const base = Number(params.baseUnitPrice || 0);
    const offer = params.offer;
    const v = parseFloat(String(offer.value || "0"));

    if (!Number.isFinite(base) || base <= 0) return base;
    if (!Number.isFinite(v) || v <= 0) return base;

    if (offer.type === "percentage") {
      const next = base - (base * v) / 100;
      return Math.max(0, Number(next.toFixed(2)));
    }
    if (offer.type === "fixed_amount") {
      const next = base - v;
      return Math.max(0, Number(next.toFixed(2)));
    }
    return base;
  }

  pickBestOfferForProduct(params: {
    offers: OfferDiscount[];
    productId: string;
    categoryIds: string[];
    baseUnitPrice: number;
  }): { offer: OfferDiscount; discountedUnitPrice: number } | null {
    const { offers, productId, categoryIds, baseUnitPrice } = params;
    if (!offers.length) return null;

    const catSet = new Set((categoryIds || []).map(String));

    let best: OfferDiscount | null = null;
    let bestPrice = baseUnitPrice;

    for (const o of offers) {
      const targetsProducts = Array.isArray(o.productIds) && o.productIds.length > 0;
      const targetsCategories = Array.isArray(o.categoryIds) && o.categoryIds.length > 0;

      const matchesProduct = targetsProducts ? o.productIds.includes(productId) : false;
      const matchesCategory = targetsCategories ? o.categoryIds.some((cid) => catSet.has(String(cid))) : false;

      const applies = !targetsProducts && !targetsCategories ? true : matchesProduct || matchesCategory;
      if (!applies) continue;

      const discounted = this.computeDiscountedUnitPrice({ baseUnitPrice, offer: o });
      if (discounted < bestPrice) {
        bestPrice = discounted;
        best = o;
      }
    }

    if (!best || bestPrice >= baseUnitPrice) return null;
    return { offer: best, discountedUnitPrice: bestPrice };
  }
}

export const storefrontOffersService = new StorefrontOffersService();
