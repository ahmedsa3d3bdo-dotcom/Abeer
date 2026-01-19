import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, sql } from "drizzle-orm";

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

  private async getCartItemsForDiscount(cartId: string) {
    return await db
      .select({
        productId: schema.cartItems.productId,
        quantity: schema.cartItems.quantity,
        unitPrice: schema.cartItems.unitPrice,
      })
      .from(schema.cartItems)
      .where(eq(schema.cartItems.cartId, cartId));
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

  private async evaluateDiscount(items: any[], disc: any): Promise<number> {
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

    const md: any = disc.metadata || null;
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
  }) {
    const totalPrice = params.unitPrice * params.quantity;

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
            : sql`${schema.cartItems.variantId} is null`
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
          totalPrice: (params.unitPrice * newQuantity).toFixed(2),
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
          unitPrice: params.unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
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
      .select({ cartId: schema.cartItems.cartId })
      .from(schema.cartItems)
      .where(eq(schema.cartItems.id, itemId))
      .limit(1);

    if (!item) {
      throw new Error("Cart item not found");
    }

    await db.delete(schema.cartItems).where(eq(schema.cartItems.id, itemId));

    // Recalculate cart totals
    await this.recalculateTotals(item.cartId);

    return item.cartId;
  }

  /**
   * Recalculate cart totals
   */
  async recalculateTotals(cartId: string) {
    const items = await db
      .select()
      .from(schema.cartItems)
      .where(eq(schema.cartItems.cartId, cartId));

    const subtotal = items.reduce(
      (sum, item) => sum + parseFloat(item.totalPrice),
      0
    );

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
      .where(sql`${schema.discounts.isAutomatic} = true and ${schema.discounts.status} = 'active' and (${schema.discounts.startsAt} is null or ${schema.discounts.startsAt} <= ${now}) and (${schema.discounts.endsAt} is null or ${schema.discounts.endsAt} >= ${now})`);

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
