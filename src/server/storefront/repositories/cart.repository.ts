import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { storefrontOffersService } from "../services/offers.service";

/**
 * Storefront Cart Repository
 * Handles data access for shopping cart operations
 */

export class StorefrontCartRepository {
  private normalizeDiscountCode(code: string) {
    return String(code || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  private async getGiftSuppressions(cartId: string): Promise<Record<string, any>> {
    const [row] = await db
      .select({ giftSuppressions: schema.carts.giftSuppressions })
      .from(schema.carts)
      .where(eq(schema.carts.id, cartId))
      .limit(1);
    return ((row as any)?.giftSuppressions as any) || {};
  }

  private suppressionKey(discountId: string, productId: string) {
    return `${String(discountId)}:${String(productId)}`;
  }

  private async setGiftSuppression(cartId: string, discountId: string, productId: string, suppressed: boolean) {
    const key = this.suppressionKey(discountId, productId);
    if (suppressed) {
      await (db as any).execute(sql`
        update ${schema.carts}
        set gift_suppressions = coalesce(gift_suppressions, '{}'::jsonb) || jsonb_build_object(${key}, true)
        where ${schema.carts.id} = ${cartId}
      `);
      return;
    }
    await (db as any).execute(sql`
      update ${schema.carts}
      set gift_suppressions = coalesce(gift_suppressions, '{}'::jsonb) - ${key}
      where ${schema.carts.id} = ${cartId}
    `);
  }

  private async clearGiftSuppressionsForDiscount(cartId: string, discountId: string) {
    const cur = await this.getGiftSuppressions(cartId);
    const prefix = `${String(discountId)}:`;
    const keys = Object.keys(cur || {}).filter((k) => k.startsWith(prefix));
    if (!keys.length) return;
    const next: Record<string, any> = { ...(cur || {}) };
    for (const k of keys) delete next[k];
    await db
      .update(schema.carts)
      .set({ giftSuppressions: next as any, updatedAt: new Date() } as any)
      .where(eq(schema.carts.id, cartId));
  }

  private async ensureBxgyBundleGifts(cartId: string) {
    const now = new Date();
    const promos = await db
      .select()
      .from(schema.discounts)
      .where(
        sql`${schema.discounts.isAutomatic} = true and ${schema.discounts.status} = 'active' and (${schema.discounts.startsAt} is null or ${schema.discounts.startsAt} <= ${now}) and (${schema.discounts.endsAt} is null or ${schema.discounts.endsAt} >= ${now}) and coalesce(${schema.discounts.metadata} ->> 'kind', '') = 'deal' and coalesce(${schema.discounts.metadata} ->> 'offerKind', '') = 'bxgy_bundle'`,
      );
    if (!promos.length) return;

    const items = await db
      .select({
        id: schema.cartItems.id,
        productId: schema.cartItems.productId,
        variantId: schema.cartItems.variantId,
        quantity: schema.cartItems.quantity,
        unitPrice: schema.cartItems.unitPrice,
        isGift: schema.cartItems.isGift,
        giftDiscountId: schema.cartItems.giftDiscountId,
      })
      .from(schema.cartItems)
      .where(eq(schema.cartItems.cartId, cartId));

    const suppressions = await this.getGiftSuppressions(cartId);

    for (const disc of promos as any[]) {
      const discId = String(disc.id);
      const md: any = disc.metadata || null;
      const spec = md?.bxgyBundle || md?.bundleBxgy || {};
      const buyList: any[] = Array.isArray(spec?.buy) ? spec.buy : [];
      const getList: any[] = Array.isArray(spec?.get) ? spec.get : [];
      if (!buyList.length || !getList.length) continue;

      // Compute applications based on non-gift quantities
      const qtyByProduct = new Map<string, number>();
      for (const it of items as any[]) {
        if (it.isGift) continue;
        const pid = it.productId ? String(it.productId) : "";
        if (!pid) continue;
        qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + Number(it.quantity || 0));
      }

      let applications = Number.POSITIVE_INFINITY;
      for (const line of buyList) {
        const pid = String(line?.productId || "");
        const req = Number(line?.quantity || 0);
        if (!pid || !Number.isFinite(req) || req <= 0) {
          applications = 0;
          break;
        }
        const have = qtyByProduct.get(pid) || 0;
        applications = Math.min(applications, Math.floor(have / req));
      }
      if (!Number.isFinite(applications) || applications <= 0) {
        // Not qualified: remove any existing gifts for this discount and clear suppressions
        const giftIds = (items as any[])
          .filter((it) => Boolean(it.isGift) && String(it.giftDiscountId || "") === discId)
          .map((it) => it.id);
        if (giftIds.length) {
          await db.delete(schema.cartItems).where(inArray(schema.cartItems.id, giftIds));
        }
        await this.clearGiftSuppressionsForDiscount(cartId, discId);
        continue;
      }

      for (const line of getList) {
        const productId = String(line?.productId || "");
        const per = Number(line?.quantity || 0);
        if (!productId || !Number.isFinite(per) || per <= 0) continue;
        const desiredQty = per * applications;
        if (desiredQty <= 0) continue;

        const key = this.suppressionKey(discId, productId);
        if (suppressions && suppressions[key]) {
          // If suppressed, remove any currently-present gifts for this product/discount.
          const existingGiftIds = (items as any[])
            .filter(
              (it) =>
                Boolean(it.isGift) &&
                String(it.giftDiscountId || "") === discId &&
                String(it.productId || "") === productId,
            )
            .map((it) => it.id);
          if (existingGiftIds.length) {
            await db.delete(schema.cartItems).where(inArray(schema.cartItems.id, existingGiftIds));
          }
          continue;
        }

        const existingGift = (items as any[]).find(
          (it) =>
            Boolean(it.isGift) &&
            String(it.giftDiscountId || "") === discId &&
            String(it.productId || "") === productId,
        );
        const existingQty = existingGift ? Number(existingGift.quantity || 0) : 0;

        if (!existingGift) {
          const [prod] = await db
            .select({ name: schema.products.name, sku: schema.products.sku, price: schema.products.price })
            .from(schema.products)
            .where(eq(schema.products.id, productId as any))
            .limit(1);
          if (!prod?.name) continue;

          const unitPrice = parseFloat(String((prod as any).price || 0));
          if (!Number.isFinite(unitPrice)) continue;

          await db.insert(schema.cartItems).values({
            cartId: cartId as any,
            productId: productId as any,
            variantId: null,
            productName: String(prod.name),
            variantName: null,
            sku: String(prod.sku || productId),
            quantity: desiredQty,
            unitPrice: "0.00",
            totalPrice: "0.00",
            isGift: true,
            giftDiscountId: discId as any,
          } as any);
        } else {
          const existingUnit = parseFloat(String((existingGift as any).unitPrice || 0));
          const existingTotal = parseFloat(String((existingGift as any).totalPrice || 0));
          const shouldNormalize =
            existingQty !== desiredQty ||
            (Number.isFinite(existingUnit) && Number(existingUnit.toFixed(2)) !== 0) ||
            (Number.isFinite(existingTotal) && Number(existingTotal.toFixed(2)) !== 0);

          if (!shouldNormalize) continue;
          await db
            .update(schema.cartItems)
            .set({ quantity: desiredQty, unitPrice: "0.00", totalPrice: "0.00" } as any)
            .where(eq(schema.cartItems.id, existingGift.id));
        }
      }
    }
  }

  private async getCartItemsForDiscount(cartId: string) {
    return await db
      .select({
        productId: schema.cartItems.productId,
        quantity: schema.cartItems.quantity,
        unitPrice: schema.cartItems.unitPrice,
      })
      .from(schema.cartItems)
      .where(and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.isGift, false)));
  }

  private async getQualifyingProductIds(disc: any): Promise<Set<string> | null> {
    if (disc.scope === "all") return null;
    if (disc.scope === "customer_groups") return null;
    if (disc.scope === "products") {
      const rows = await db
        .select({ pid: schema.discountProducts.productId })
        .from(schema.discountProducts)
        .where(eq(schema.discountProducts.discountId, disc.id));
      return new Set(rows.map((r) => r.pid));
    }
    if (disc.scope === "categories") {
      const rows = await db
        .select({ cid: schema.discountCategories.categoryId })
        .from(schema.discountCategories)
        .where(eq(schema.discountCategories.discountId, disc.id));
      const catIds = rows.map((r) => r.cid);
      if (!catIds.length) return new Set<string>();
      const prodRows = await db
        .select({ pid: schema.productCategories.productId })
        .from(schema.productCategories)
        .where(sql`${schema.productCategories.categoryId} in ${catIds}`);
      return new Set(prodRows.map((r) => r.pid));
    }
    return new Set<string>();
  }

  private async getTargetProductIdsFromRelations(discountId: string): Promise<Set<string> | null> {
    const prodRows = await db
      .select({ pid: schema.discountProducts.productId })
      .from(schema.discountProducts)
      .where(eq(schema.discountProducts.discountId, discountId));
    const productIds = prodRows.map((r) => String(r.pid)).filter(Boolean);

    const catRows = await db
      .select({ cid: schema.discountCategories.categoryId })
      .from(schema.discountCategories)
      .where(eq(schema.discountCategories.discountId, discountId));
    const categoryIds = catRows.map((r) => String(r.cid)).filter(Boolean);

    let fromCategories: string[] = [];
    if (categoryIds.length) {
      const prodInCats = await db
        .select({ pid: schema.productCategories.productId })
        .from(schema.productCategories)
        .where(sql`${schema.productCategories.categoryId} in ${categoryIds}`);
      fromCategories = prodInCats.map((r) => String(r.pid)).filter(Boolean);
    }

    const all = Array.from(new Set([...productIds, ...fromCategories]));
    if (!all.length) return null;
    return new Set(all);
  }

  private async evaluateDiscount(items: any[], disc: any): Promise<number> {
    const md: any = disc.metadata || null;
    if (md?.kind === "deal" && md?.offerKind === "bxgy_generic") {
      const bxgy = md?.bxgy || md?.bxgyGeneric || {};
      const buyQty = Number(bxgy?.buyQty || 0);
      const getQty = Number(bxgy?.getQty || 0);
      if (!Number.isFinite(buyQty) || !Number.isFinite(getQty) || buyQty <= 0 || getQty <= 0) return 0;

      const targets = await this.getTargetProductIdsFromRelations(String(disc.id));
      const eligibleGroups: Array<{ unit: number; qty: number }> = [];
      let eligibleQty = 0;
      for (const it of items) {
        const pid = it.productId ? String(it.productId) : "";
        if (!pid) continue;
        if (targets && !targets.has(pid)) continue;
        const unit = parseFloat(String(it.unitPrice));
        const qty = Number(it.quantity || 0);
        if (!Number.isFinite(unit) || unit <= 0 || !Number.isFinite(qty) || qty <= 0) continue;
        eligibleGroups.push({ unit, qty });
        eligibleQty += qty;
      }
      if (eligibleQty < buyQty + getQty) return 0;

      const applications = Math.floor(eligibleQty / (buyQty + getQty));
      const freeUnits = applications * getQty;
      if (freeUnits <= 0) return 0;

      eligibleGroups.sort((a, b) => a.unit - b.unit);
      let remaining = freeUnits;
      let discount = 0;
      for (const g of eligibleGroups) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, g.qty);
        discount += take * g.unit;
        remaining -= take;
      }
      return Number(discount.toFixed(2));
    }

    if (md?.kind === "deal" && md?.offerKind === "bxgy_bundle") {
      const spec = md?.bxgyBundle || md?.bundleBxgy || {};
      const buyList: any[] = Array.isArray(spec?.buy) ? spec.buy : [];
      const getList: any[] = Array.isArray(spec?.get) ? spec.get : [];
      if (!buyList.length || !getList.length) return 0;

      const qtyByProduct = new Map<string, number>();
      const groupsByProduct = new Map<string, Array<{ unit: number; qty: number }>>();
      for (const it of items) {
        const pid = it.productId ? String(it.productId) : "";
        if (!pid) continue;
        const unit = parseFloat(String(it.unitPrice));
        const qty = Number(it.quantity || 0);
        if (!Number.isFinite(unit) || unit <= 0 || !Number.isFinite(qty) || qty <= 0) continue;
        qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + qty);
        const arr = groupsByProduct.get(pid) || [];
        arr.push({ unit, qty });
        groupsByProduct.set(pid, arr);
      }

      let applications = Number.POSITIVE_INFINITY;
      for (const line of buyList) {
        const pid = String(line?.productId || "");
        const req = Number(line?.quantity || 0);
        if (!pid || !Number.isFinite(req) || req <= 0) return 0;
        const have = qtyByProduct.get(pid) || 0;
        applications = Math.min(applications, Math.floor(have / req));
      }
      if (!Number.isFinite(applications) || applications <= 0) return 0;

      let discount = 0;
      for (const line of getList) {
        const pid = String(line?.productId || "");
        const per = Number(line?.quantity || 0);
        if (!pid || !Number.isFinite(per) || per <= 0) return 0;
        let free = per * applications;
        if (free <= 0) continue;
        const groups = (groupsByProduct.get(pid) || []).slice().sort((a, b) => a.unit - b.unit);
        for (const g of groups) {
          if (free <= 0) break;
          const take = Math.min(free, g.qty);
          discount += take * g.unit;
          free -= take;
        }
      }
      return Number(discount.toFixed(2));
    }

    const valueNum = parseFloat(String(disc.value || "0"));
    const qualifying = await this.getQualifyingProductIds(disc);

    let qSubtotal = 0;
    let qQty = 0;
    for (const it of items) {
      const qualifies = !qualifying || (it.productId ? qualifying.has(it.productId) : false);
      if (qualifies) {
        const unit = parseFloat(String(it.unitPrice));
        const qty = Number(it.quantity);
        qSubtotal += unit * qty;
        qQty += qty;
      }
    }
    if (qSubtotal <= 0) return 0;

    const minSubtotal = disc.minSubtotal ? parseFloat(String(disc.minSubtotal)) : 0;
    if (minSubtotal > 0 && qSubtotal < minSubtotal) return 0;

    if (md && md.offerKind === "bundle" && md.bundle?.requiredQty) {
      if (qQty < Number(md.bundle.requiredQty)) return 0;
    }

    if (disc.type === "percentage") return (qSubtotal * valueNum) / 100;
    if (disc.type === "fixed_amount") return Math.min(valueNum, qSubtotal);
    if (disc.type === "free_shipping") return 0;
    return 0;
  }

  private isDiscountActiveNow(disc: any, now: Date) {
    if (String(disc.status || "") !== "active") return false;
    if (disc.startsAt && new Date(disc.startsAt) > now) return false;
    if (disc.endsAt && new Date(disc.endsAt) < now) return false;
    return true;
  }

  async applyDiscountCode(cartId: string, rawCode: string) {
    const code = this.normalizeDiscountCode(rawCode);
    if (!code) throw new Error("Invalid discount code");

    const now = new Date();
    const [disc] = await db
      .select()
      .from(schema.discounts)
      .where(sql`${schema.discounts.code} ILIKE ${code}`)
      .limit(1);
    if (!disc?.id) throw new Error("Invalid discount code");

    if (Boolean((disc as any)?.isAutomatic)) {
      throw new Error("This discount is automatic and can't be applied as a code");
    }

    if (disc.scope === "collections") {
      throw new Error("This discount is limited to collections and can't be applied yet");
    }
    if (!this.isDiscountActiveNow(disc, now)) throw new Error("This discount is not active");

    const limit = (disc as any)?.usageLimit as number | null;
    const used = Number((disc as any)?.usageCount || 0);
    if (limit != null && used >= limit) throw new Error("This discount has reached its usage limit");

    const items = await this.getCartItemsForDiscount(cartId);
    if (!items.length) throw new Error("Cart is empty");
    const amount = await this.evaluateDiscount(items, disc);
    if (amount <= 0 && disc.type !== "free_shipping") {
      throw new Error("This discount is not applicable to your cart");
    }

    await db
      .update(schema.carts)
      .set({
        appliedDiscountId: disc.id,
        appliedDiscountCode: code,
        updatedAt: new Date(),
      })
      .where(eq(schema.carts.id, cartId));

    await this.recalculateTotals(cartId);
    return { id: disc.id, code };
  }

  async clearDiscount(cartId: string) {
    await db
      .update(schema.carts)
      .set({ appliedDiscountId: null, appliedDiscountCode: null, updatedAt: new Date() })
      .where(eq(schema.carts.id, cartId));
    await this.recalculateTotals(cartId);
  }

  async computeBestDiscount(cartId: string): Promise<{ amount: number; applied?: { id: string; code: string; type: string; value: string; isAutomatic?: boolean } }> {
    const now = new Date();
    const [cart] = await db
      .select({
        appliedDiscountId: schema.carts.appliedDiscountId,
        appliedDiscountCode: schema.carts.appliedDiscountCode,
      })
      .from(schema.carts)
      .where(eq(schema.carts.id, cartId))
      .limit(1);

    if (cart?.appliedDiscountId || cart?.appliedDiscountCode) {
      const items = await this.getCartItemsForDiscount(cartId);
      if (!items.length) return { amount: 0 };

      let disc: any | null = null;
      if (cart.appliedDiscountId) {
        const [row] = await db
          .select()
          .from(schema.discounts)
          .where(eq(schema.discounts.id, cart.appliedDiscountId as any))
          .limit(1);
        disc = row || null;
      } else if (cart.appliedDiscountCode) {
        const [row] = await db
          .select()
          .from(schema.discounts)
          .where(sql`${schema.discounts.code} ILIKE ${cart.appliedDiscountCode}`)
          .limit(1);
        disc = row || null;
      }

      if (!disc?.id) {
        await this.clearDiscount(cartId);
        return { amount: 0 };
      }

      if (Boolean((disc as any)?.isAutomatic)) {
        await this.clearDiscount(cartId);
        return { amount: 0 };
      }

      if (disc.scope === "collections") {
        await this.clearDiscount(cartId);
        return { amount: 0 };
      }

      const limit = (disc as any)?.usageLimit as number | null;
      const used = Number((disc as any)?.usageCount || 0);
      if (!this.isDiscountActiveNow(disc, now) || (limit != null && used >= limit)) {
        await this.clearDiscount(cartId);
        return { amount: 0 };
      }

      const amount = await this.evaluateDiscount(items, disc);
      return {
        amount: Number(amount.toFixed(2)),
        applied: {
          id: disc.id,
          code: this.normalizeDiscountCode(String(cart.appliedDiscountCode || disc.code || disc.name || "")),
          type: String(disc.type),
          value: String(disc.value),
          isAutomatic: Boolean((disc as any)?.isAutomatic),
        },
      };
    }

    const auto = await this.computeAutomaticDiscount(cartId);
    if (auto.amount > 0 && auto.applied?.id) {
      return {
        amount: auto.amount,
        applied: {
          id: auto.applied.id,
          code: String(auto.applied.name),
          type: String(auto.applied.type),
          value: String(auto.applied.value),
          isAutomatic: true,
        },
      };
    }
    return { amount: 0 };
  }

  /**
   * Get or create cart for user or session
   */
  async getOrCreate(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) {
      throw new Error("Either userId or sessionId is required");
    }

    // Try to find existing cart
    let cart;
    if (userId) {
      [cart] = await db
        .select()
        .from(schema.carts)
        .where(
          and(
            eq(schema.carts.userId, userId),
            eq(schema.carts.status, "active")
          )
        )
        .limit(1);
    } else if (sessionId) {
      [cart] = await db
        .select()
        .from(schema.carts)
        .where(
          and(
            eq(schema.carts.sessionId, sessionId),
            eq(schema.carts.status, "active")
          )
        )
        .limit(1);
    }

    // Create new cart if not found
    if (!cart) {
      [cart] = await db
        .insert(schema.carts)
        .values({
          userId: userId || null,
          sessionId: sessionId || null,
          status: "active",
          subtotal: "0.00",
          taxAmount: "0.00",
          shippingAmount: "0.00",
          discountAmount: "0.00",
          totalAmount: "0.00",
        })
        .returning();
    }

    return cart;
  }

  /**
   * Get cart with items
   */
  async getWithItems(cartId: string) {
    const [cart] = await db
      .select()
      .from(schema.carts)
      .where(eq(schema.carts.id, cartId))
      .limit(1);

    if (!cart) {
      return null;
    }

    const items = await db
      .select({
        id: schema.cartItems.id,
        productId: schema.cartItems.productId,
        variantId: schema.cartItems.variantId,
        productName: schema.cartItems.productName,
        variantName: schema.cartItems.variantName,
        sku: schema.cartItems.sku,
        quantity: schema.cartItems.quantity,
        unitPrice: schema.cartItems.unitPrice,
        totalPrice: schema.cartItems.totalPrice,
        isGift: schema.cartItems.isGift,
        giftDiscountId: schema.cartItems.giftDiscountId,
        image: sql<string>`coalesce(
          (
            select pv.image
            from ${schema.productVariants} pv
            where pv.id = ${schema.cartItems.variantId}
            limit 1
          ),
          (
            select pi.url
            from ${schema.productImages} pi
            where pi.product_id = ${schema.cartItems.productId}
            order by pi.is_primary desc, pi.sort_order asc
            limit 1
          ),
          (
            select pv2.image
            from ${schema.productVariants} pv2
            where pv2.product_id = ${schema.cartItems.productId} and pv2.is_active = true and pv2.image is not null
            order by pv2.sort_order asc
            limit 1
          )
        )`,
        maxQuantity: sql<number>`(
          case
            when ${schema.cartItems.variantId} is not null then
              coalesce((
                select pv.stock_quantity
                from ${schema.productVariants} pv
                where pv.id = ${schema.cartItems.variantId}
              ), 0)
            else
              coalesce((
                select sum(inv.available_quantity)::int
                from ${schema.inventory} inv
                where inv.product_id = ${schema.cartItems.productId}
              ), 0)
          end
        )`,
      })
      .from(schema.cartItems)
      .where(eq(schema.cartItems.cartId, cartId))
      .orderBy(schema.cartItems.createdAt);

    return {
      ...cart,
      items,
    };
  }

  /**
   * Add item to cart
   */
  async addItem(params: {
    cartId: string;
    productId: string;
    variantId?: string;
    productName: string;
    variantName?: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    isGift?: boolean;
    giftDiscountId?: string;
  }) {
    const isGift = Boolean(params.isGift);

    const effectiveUnitPrice = isGift ? 0 : params.unitPrice;
    const totalPrice = effectiveUnitPrice * params.quantity;

    // Check if item already exists
    const existingItem = await db
      .select()
      .from(schema.cartItems)
      .where(
        and(
          eq(schema.cartItems.cartId, params.cartId),
          eq(schema.cartItems.productId, params.productId),
          params.variantId
            ? eq(schema.cartItems.variantId, params.variantId)
            : isNull(schema.cartItems.variantId),
          eq(schema.cartItems.isGift, isGift),
          isGift
            ? (params.giftDiscountId
                ? eq(schema.cartItems.giftDiscountId, params.giftDiscountId as any)
                : isNull(schema.cartItems.giftDiscountId))
            : isNull(schema.cartItems.giftDiscountId),
        )
      )
      .limit(1);

    let item;
    if (existingItem.length > 0) {
      // Update quantity
      const newQuantity = existingItem[0].quantity + params.quantity;
      [item] = await db
        .update(schema.cartItems)
        .set({
          quantity: newQuantity,
          unitPrice: effectiveUnitPrice.toFixed(2),
          totalPrice: (effectiveUnitPrice * newQuantity).toFixed(2),
        })
        .where(eq(schema.cartItems.id, existingItem[0].id))
        .returning();
    } else {
      // Insert new item
      [item] = await db
        .insert(schema.cartItems)
        .values({
          cartId: params.cartId,
          productId: params.productId,
          variantId: params.variantId || null,
          productName: params.productName,
          variantName: params.variantName || null,
          sku: params.sku,
          quantity: params.quantity,
          unitPrice: effectiveUnitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
          isGift: Boolean(params.isGift),
          giftDiscountId: params.giftDiscountId ? (params.giftDiscountId as any) : null,
        })
        .returning();
    }

    // Recalculate cart totals
    await this.recalculateTotals(params.cartId);

    return item;
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(itemId: string, quantity: number): Promise<string> {
    const [item] = await db
      .select()
      .from(schema.cartItems)
      .where(eq(schema.cartItems.id, itemId))
      .limit(1);

    if (!item) {
      throw new Error("Cart item not found");
    }

    if (Boolean((item as any).isGift)) {
      const nextQty = Math.max(0, Math.min(Number(item.quantity || 0), Number(quantity || 0)));
      if (nextQty <= 0) {
        await db.delete(schema.cartItems).where(eq(schema.cartItems.id, itemId));
        if ((item as any).giftDiscountId && item.productId) {
          try {
            await this.setGiftSuppression(String(item.cartId), String((item as any).giftDiscountId), String(item.productId), true);
          } catch {}
        }
      } else {
        await db
          .update(schema.cartItems)
          .set({
            quantity: nextQty,
            unitPrice: "0.00",
            totalPrice: "0.00",
          } as any)
          .where(eq(schema.cartItems.id, itemId));
      }

      await this.recalculateTotals(item.cartId);
      return item.cartId;
    }

    const totalPrice = parseFloat(item.unitPrice) * quantity;

    await db
      .update(schema.cartItems)
      .set({
        quantity,
        totalPrice: totalPrice.toFixed(2),
      })
      .where(eq(schema.cartItems.id, itemId));

    // Recalculate cart totals
    await this.recalculateTotals(item.cartId);

    return item.cartId;
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: string): Promise<string> {
    const [item] = await db
      .select({
        cartId: schema.cartItems.cartId,
        productId: schema.cartItems.productId,
        isGift: schema.cartItems.isGift,
        giftDiscountId: schema.cartItems.giftDiscountId,
      })
      .from(schema.cartItems)
      .where(eq(schema.cartItems.id, itemId))
      .limit(1);

    if (!item) {
      throw new Error("Cart item not found");
    }

    await db.delete(schema.cartItems).where(eq(schema.cartItems.id, itemId));

    if (item.isGift && item.giftDiscountId && item.productId) {
      try {
        await this.setGiftSuppression(String(item.cartId), String(item.giftDiscountId), String(item.productId), true);
      } catch {}
    }

    // Recalculate cart totals
    await this.recalculateTotals(item.cartId);

    return item.cartId;
  }

  /**
   * Recalculate cart totals
   */
  async recalculateTotals(cartId: string) {
    try {
      await this.ensureBxgyBundleGifts(cartId);
    } catch {
    }

    const items = await db
      .select()
      .from(schema.cartItems)
      .where(eq(schema.cartItems.cartId, cartId));

    try {
      const offers = await storefrontOffersService.listActivePriceOffers();
      if (offers.length && items.length) {
        for (const item of items as any[]) {
          if (Boolean((item as any).isGift)) continue;
          const baseUnit = parseFloat(String(item.unitPrice));
          const qty = Number(item.quantity || 0);
          if (!Number.isFinite(baseUnit) || baseUnit <= 0 || !Number.isFinite(qty) || qty <= 0) continue;

          const picked = storefrontOffersService.pickBestOfferForProduct({
            offers,
            productId: String(item.productId),
            categoryIds: [],
            baseUnitPrice: baseUnit,
          });
          if (!picked) continue;

          const nextUnit = Number(picked.discountedUnitPrice);
          if (!Number.isFinite(nextUnit) || nextUnit <= 0) continue;
          if (Number(nextUnit.toFixed(2)) === Number(baseUnit.toFixed(2))) continue;

          const nextTotal = nextUnit * qty;
          await db
            .update(schema.cartItems)
            .set({ unitPrice: nextUnit.toFixed(2), totalPrice: nextTotal.toFixed(2) } as any)
            .where(eq(schema.cartItems.id, item.id));

          item.unitPrice = nextUnit.toFixed(2);
          item.totalPrice = nextTotal.toFixed(2);
        }
      }
    } catch {
    }

    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);

    // TODO: Calculate tax based on shipping address
    const taxAmount = 0;

    // TODO: Calculate shipping based on method selected
    const shippingAmount = 0;

    // Compute best discount (applied code takes priority over automatic)
    const best = await this.computeBestDiscount(cartId);
    const discountAmount = best.amount;

    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

    await db
      .update(schema.carts)
      .set({
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        shippingAmount: shippingAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(schema.carts.id, cartId));
  }

  /**
   * Compute automatic discount amount for a cart based on active discounts
   * Strategy: choose the single best automatic discount (no stacking)
   */
  async computeAutomaticDiscount(cartId: string): Promise<{ amount: number; applied?: { id: string; name: string; type: string; value: string; scope: string } }> {
    const now = new Date();
    // Load cart items with productId, quantity, unitPrice
    const items = await this.getCartItemsForDiscount(cartId);
    if (!items.length) return { amount: 0 };

    // Active automatic discounts
    const discounts = await db
      .select()
      .from(schema.discounts)
      .where(
        sql`${schema.discounts.isAutomatic} = true and ${schema.discounts.status} = 'active' and (${schema.discounts.startsAt} is null or ${schema.discounts.startsAt} <= ${now}) and (${schema.discounts.endsAt} is null or ${schema.discounts.endsAt} >= ${now}) and coalesce(${schema.discounts.metadata} ->> 'kind', '') <> 'offer'`,
      );

    if (!discounts.length) return { amount: 0 };

    let bestAmount = 0;
    let best: any = null;
    for (const d of discounts) {
      const amt = await this.evaluateDiscount(items, d);
      if (amt > bestAmount) {
        bestAmount = amt;
        best = d;
      }
    }

    if (best && bestAmount > 0) {
      return { amount: Number(bestAmount.toFixed(2)), applied: { id: best.id, name: best.name, type: best.type, value: String(best.value), scope: best.scope } };
    }
    return { amount: 0 };
  }

  /**
   * Merge guest cart into user cart on login
   */
  async mergeCart(guestCartId: string, userId: string) {
    // Get or create user cart
    const userCart = await this.getOrCreate(userId);

    const [guestCart] = await db
      .select({ userId: schema.carts.userId })
      .from(schema.carts)
      .where(eq(schema.carts.id, guestCartId))
      .limit(1);

    if (!guestCart) {
      return userCart;
    }

    if (guestCart.userId && String(guestCart.userId) !== String(userId)) {
      return userCart;
    }

    // If the cookie cart id equals the user's cart id, nothing to merge
    if (guestCartId === userCart.id) {
      return userCart;
    }

    // Get guest cart items
    const guestItems = await db
      .select()
      .from(schema.cartItems)
      .where(eq(schema.cartItems.cartId, guestCartId));

    // Move items to user cart
    for (const item of guestItems) {
      // Skip items with missing required data
      if (!item.productId || !item.sku) {
        continue;
      }

      await this.addItem({
        cartId: userCart.id,
        productId: item.productId,
        variantId: item.variantId || undefined,
        productName: item.productName,
        variantName: item.variantName || undefined,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
      });
    }

    // Delete guest cart
    await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, guestCartId));
    await db.delete(schema.carts).where(eq(schema.carts.id, guestCartId));

    return userCart;
  }

  /**
   * Clear cart
   */
  async clear(cartId: string) {
    await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cartId));
    await this.recalculateTotals(cartId);
  }
}

export const storefrontCartRepository = new StorefrontCartRepository();
