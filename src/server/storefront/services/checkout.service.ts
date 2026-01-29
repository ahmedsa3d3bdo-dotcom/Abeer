import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { storefrontCartService } from "./cart.service";
import { storefrontCartRepository } from "../repositories/cart.repository";
import { storefrontOffersService } from "./offers.service";
import { auth } from "@/auth";
import { notificationsService } from "../../services/notifications.service";
import { settingsRepository } from "../../repositories/settings.repository";
import { nextDocumentNumber } from "../../utils/document-number";

async function getLowStockThreshold() {
  const s = await settingsRepository.findByKey("low_stock_threshold");
  const n = Number(s?.value);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.floor(n));
}

export interface PlaceOrderInput {
  cartId: string;
  shippingAddress: any;
  shippingMethod: { id: string; name: string; price: number; description?: string; estimatedDays?: number; carrier?: string };
  paymentMethod: { type: string;[k: string]: any };
  customerEmail?: string;
  customerPhone?: string;
}

export class StorefrontCheckoutService {
  async placeOrder(input: PlaceOrderInput) {
    // Load cart
    const cart = await storefrontCartService.getCart(input.cartId);
    if (!cart) throw new Error("Cart not found");
    if (cart.items.length === 0) throw new Error("Cart is empty");

    const shippingAmount = input.shippingMethod?.price || 0;
    const subtotal = cart.subtotal;
    const taxAmount = cart.taxAmount;

    // Re-evaluate best discount (applied code takes priority) and enforce usageLimit
    let discountAmount = 0;
    let appliedDiscount: { id: string; code: string | null; type?: string } | null = null;
    try {
      const best = await storefrontCartRepository.computeBestDiscount(input.cartId);
      if (best.applied?.id && (best.amount > 0 || String((best.applied as any)?.type || "") === "free_shipping")) {
        const [disc] = await db
          .select()
          .from(schema.discounts)
          .where(eq(schema.discounts.id, best.applied.id))
          .limit(1);
        const limit = (disc as any)?.usageLimit as number | null;
        const used = Number((disc as any)?.usageCount || 0);
        if (limit == null || used < limit) {
          discountAmount = Number(best.amount || 0);
          appliedDiscount = { id: best.applied.id, code: best.applied.code || null, type: String((best.applied as any)?.type || "") };
        }
      }
    } catch {
      // ignore discount evaluation errors at checkout time
    }

    // Detect applied scheduled offers (kind=offer) by comparing base price with cart item unitPrice
    // Also track the savings per offer for analytics
    const scheduledOfferSavings = new Map<string, number>();
    try {
      const offers = await storefrontOffersService.listActivePriceOffers();
      if (offers.length) {
        for (const item of cart.items as any[]) {
          if (Boolean(item?.isGift)) continue;
          const productId = String(item?.productId || "");
          if (!productId) continue;
          const qty = Number(item?.quantity || 0);
          if (!Number.isFinite(qty) || qty <= 0) continue;

          // Base unit price from current variant/product price
          let baseUnit = 0;
          if (item?.variantId) {
            const [v] = await db
              .select({ price: schema.productVariants.price, productId: schema.productVariants.productId })
              .from(schema.productVariants)
              .where(eq(schema.productVariants.id, item.variantId as any))
              .limit(1);
            baseUnit = parseFloat(String((v as any)?.price ?? 0));
          }
          if (!Number.isFinite(baseUnit) || baseUnit <= 0) {
            const [p] = await db
              .select({ price: schema.products.price })
              .from(schema.products)
              .where(eq(schema.products.id, productId as any))
              .limit(1);
            baseUnit = parseFloat(String((p as any)?.price ?? 0));
          }
          if (!Number.isFinite(baseUnit) || baseUnit <= 0) continue;

          const catRows = await db
            .select({ categoryId: schema.productCategories.categoryId })
            .from(schema.productCategories)
            .where(eq(schema.productCategories.productId, productId as any));
          const categoryIds = catRows.map((r) => String(r.categoryId)).filter(Boolean);

          const picked = storefrontOffersService.pickBestOfferForProduct({
            offers,
            productId,
            categoryIds,
            baseUnitPrice: baseUnit,
          });
          if (!picked?.offer?.id) continue;

          const discounted = Number(picked.discountedUnitPrice);
          const cartUnit = Number(item?.unitPrice ?? 0);
          if (!Number.isFinite(discounted) || !Number.isFinite(cartUnit)) continue;
          if (Number(discounted.toFixed(2)) === Number(cartUnit.toFixed(2))) {
            const offerId = String(picked.offer.id);
            // Calculate savings for this item: (baseUnit - discounted) * qty
            const itemSavings = (baseUnit - discounted) * qty;
            const currentSavings = scheduledOfferSavings.get(offerId) || 0;
            scheduledOfferSavings.set(offerId, currentSavings + itemSavings);
          }
        }
      }
    } catch {
      // best-effort only
    }

    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

    const currencySetting = await settingsRepository.findByKey("currency");
    const currency = currencySetting?.value || "CAD";

    const lowStockThreshold = await getLowStockThreshold();

    const orderNumber = await nextDocumentNumber("ORD");

    // Track gift items by discountId and calculate their total value
    const giftSavingsByDiscount = new Map<string, number>();
    for (const item of cart.items as any[]) {
      if (Boolean(item?.isGift) && Boolean(item?.giftDiscountId)) {
        const discId = String(item.giftDiscountId);
        const qty = Number(item?.quantity || 1);

        // Fetch original price from DB since item.unitPrice is 0 for gifts
        let baseUnit = 0;
        if (item.variantId) {
          const [v] = await db
            .select({ price: schema.productVariants.price })
            .from(schema.productVariants)
            .where(eq(schema.productVariants.id, item.variantId as any))
            .limit(1);
          baseUnit = parseFloat(String((v as any)?.price ?? 0));
        }
        if (!Number.isFinite(baseUnit) || baseUnit <= 0) {
          const [p] = await db
            .select({ price: schema.products.price })
            .from(schema.products)
            .where(eq(schema.products.id, item.productId as any))
            .limit(1);
          baseUnit = parseFloat(String((p as any)?.price ?? 0));
        }

        const totalValue = baseUnit * qty;
        const currentSavings = giftSavingsByDiscount.get(discId) || 0;
        giftSavingsByDiscount.set(discId, currentSavings + totalValue);
      }
    }
    const giftDiscountIds = Array.from(giftSavingsByDiscount.keys());

    // Get authenticated user (if any)
    const session = await auth();
    const userId = session?.user?.id as string | undefined;

    const isAdminUser = userId
      ? (
        await db
          .select({ slug: schema.roles.slug })
          .from(schema.userRoles)
          .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
          .where(and(eq(schema.userRoles.userId, userId as any), inArray(schema.roles.slug, ["admin", "super_admin"])))
          .limit(1)
      ).length > 0
      : false;

    // Insert order
    const normalizePaymentMethod = (raw: string | undefined): any => {
      const t = (raw || "card").toString().toLowerCase();
      switch (t) {
        case "credit_card":
        case "card":
          return "credit_card";
        case "debit":
        case "debit_card":
          return "debit_card";
        case "paypal":
          return "paypal";
        case "stripe":
          return "stripe";
        case "cod":
        case "cash_on_delivery":
          return "cash_on_delivery";
        case "bank":
        case "bank_transfer":
          return "bank_transfer";
        default:
          return "credit_card";
      }
    };

    const { order } = await db.transaction(async (tx) => {
      // Atomic inventory reservation (prevents overselling)
      for (const item of cart.items) {
        const qty = Number(item.quantity || 0);
        if (!Number.isFinite(qty) || qty <= 0) continue;

        if (item.variantId) {
          const updated = await tx
            .update(schema.productVariants)
            .set({
              reservedQuantity: sql`${schema.productVariants.reservedQuantity} + ${qty}` as any,
            })
            .where(
              and(
                eq(schema.productVariants.id, item.variantId as any),
                gte(sql`${schema.productVariants.stockQuantity} - ${schema.productVariants.reservedQuantity}` as any, qty)
              ) as any,
            )
            .returning({
              id: schema.productVariants.id,
              productId: schema.productVariants.productId,
            });

          if (!updated.length) {
            throw new Error(`Insufficient stock for ${item.productName}`);
          }

          const productId = (updated[0] as any)?.productId || item.productId;
          const [{ total = 0 } = {} as any] = await tx
            .select({ total: sql<number>`COALESCE(SUM((${schema.productVariants.stockQuantity} - ${schema.productVariants.reservedQuantity})), 0)` })
            .from(schema.productVariants)
            .where(and(eq(schema.productVariants.productId, productId as any), eq(schema.productVariants.isActive, true)) as any);

          const stockStatus = Number(total) <= 0 ? ("out_of_stock" as any) : Number(total) <= lowStockThreshold ? ("low_stock" as any) : ("in_stock" as any);
          await tx.update(schema.products).set({ stockStatus } as any).where(eq(schema.products.id, productId as any));
        } else {
          let remaining = qty;
          while (remaining > 0) {
            const pickRes = await (tx as any).execute(sql`
              select ${schema.inventory.id} as id, ${schema.inventory.availableQuantity} as available
              from ${schema.inventory}
              where ${schema.inventory.productId} = ${item.productId as any}
                and ${schema.inventory.variantId} is null
                and ${schema.inventory.availableQuantity} > 0
              order by ${schema.inventory.availableQuantity} desc, ${schema.inventory.updatedAt} desc
              limit 1
              for update skip locked
            `);
            const picked = (pickRes as any)?.rows?.[0];
            if (!picked) {
              throw new Error(`Insufficient stock for ${item.productName}`);
            }
            const available = Number(picked.available || 0);
            const resv = Math.min(remaining, available);
            const updRes = await (tx as any).execute(sql`
              update ${schema.inventory}
              set
                reserved_quantity = reserved_quantity + ${resv},
                available_quantity = available_quantity - ${resv}
              where ${schema.inventory.id} = ${picked.id}
                and ${schema.inventory.availableQuantity} >= ${resv}
              returning ${schema.inventory.availableQuantity} as available
            `);
            if (!(updRes as any)?.rows?.length) {
              continue;
            }
            remaining -= resv;
          }

          const [{ avail = 0 } = {} as any] = await tx
            .select({ avail: sql<number>`COALESCE(SUM(${schema.inventory.availableQuantity}), 0)` })
            .from(schema.inventory)
            .where(and(eq(schema.inventory.productId, item.productId as any), sql`${schema.inventory.variantId} is null` as any) as any);

          const stockStatus = Number(avail) <= 0 ? ("out_of_stock" as any) : Number(avail) <= lowStockThreshold ? ("low_stock" as any) : ("in_stock" as any);
          await tx.update(schema.products).set({ stockStatus } as any).where(eq(schema.products.id, item.productId as any));
          // soldCount should reflect shipped, not reserved
        }
      }

      const [order] = await tx
        .insert(schema.orders)
        .values({
          orderNumber,
          status: "pending" as any,
          paymentStatus: "pending" as any,
          paymentMethod: normalizePaymentMethod(input.paymentMethod?.type),
          shippingMethodId: (input.shippingMethod?.id as any) || null,
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          shippingAmount: shippingAmount.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          currency,
          customerEmail: input.customerEmail || (session as any)?.user?.email || null,
          customerPhone: input.customerPhone || (input as any)?.shippingAddress?.phone || null,
          userId: userId || null,
        })
        .returning();

      // Snapshot shipping address for this order (works for guests and users)
      if (order && (input as any).shippingAddress) {
        const a: any = (input as any).shippingAddress;
        try {
          await tx.insert(schema.orderShippingAddresses).values({
            orderId: order.id,
            firstName: a.firstName,
            lastName: a.lastName,
            company: a.company ?? null,
            addressLine1: a.addressLine1,
            addressLine2: a.addressLine2 ?? null,
            city: a.city,
            state: a.state,
            postalCode: a.postalCode,
            country: a.country,
            phone: a.phone,
            email: (input.customerEmail as any) || (session as any)?.user?.email || null,
          } as any);
        } catch {
          // non-blocking in case migration not yet applied
        }
      }

      // Insert order items
      if (order) {
        for (const item of cart.items) {
          await tx.insert(schema.orderItems).values({
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId || null,
            productName: item.productName,
            variantName: item.variantName || null,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            totalPrice: item.totalPrice.toFixed(2),
            taxAmount: "0.00",
            discountAmount: "0.00",
          });
        }
      }

      // Persist applied discount snapshot and update usage counter
      if (order && appliedDiscount) {
        try {
          await tx.insert(schema.orderDiscounts).values({
            orderId: order.id,
            discountId: appliedDiscount.id,
            code: appliedDiscount.code,
            amount: discountAmount.toFixed(2),
          });
          // Increment usageCount (best-effort)
          await tx
            .update(schema.discounts)
            .set({ usageCount: sql`${schema.discounts.usageCount} + 1` } as any)
            .where(eq(schema.discounts.id, appliedDiscount.id));
        } catch { }
      }

      if (order && giftDiscountIds.length) {
        try {
          const existing = new Set<string>();
          if (appliedDiscount?.id) existing.add(String(appliedDiscount.id));
          for (const discId of giftDiscountIds) {
            if (!discId || existing.has(String(discId))) continue;
            // Get the calculated gift savings for this discount
            const giftSavings = giftSavingsByDiscount.get(discId) || 0;
            const savingsAmount = Number.isFinite(giftSavings) && giftSavings > 0 ? giftSavings.toFixed(2) : "0.00";
            await tx.insert(schema.orderDiscounts).values({
              orderId: order.id,
              discountId: discId as any,
              code: null,
              amount: savingsAmount,
            } as any);

            // Increment usageCount
            await tx
              .update(schema.discounts)
              .set({ usageCount: sql`${schema.discounts.usageCount} + 1` } as any)
              .where(eq(schema.discounts.id, discId as any));

            existing.add(String(discId));
          }
        } catch { }
      }

      if (order && scheduledOfferSavings.size) {
        try {
          const existing = new Set<string>();
          if (appliedDiscount?.id) existing.add(String(appliedDiscount.id));
          for (const discId of giftDiscountIds) existing.add(String(discId));

          for (const [offerId, savings] of Array.from(scheduledOfferSavings.entries())) {
            if (!offerId || existing.has(String(offerId))) continue;
            // Store actual savings amount for analytics
            const savingsAmount = Number.isFinite(savings) && savings > 0 ? savings.toFixed(2) : "0.00";
            await tx.insert(schema.orderDiscounts).values({
              orderId: order.id,
              discountId: offerId as any,
              code: null,
              amount: savingsAmount,
            } as any);
            await tx
              .update(schema.discounts)
              .set({ usageCount: sql`${schema.discounts.usageCount} + 1` } as any)
              .where(eq(schema.discounts.id, offerId as any));
            existing.add(String(offerId));
          }
        } catch { }
      }

      return { order };
    });

    // Notify admins (order placed)
    try {
      if (order) {
        const adminRows = await db
          .selectDistinct({ userId: schema.users.id })
          .from(schema.users)
          .innerJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
          .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
          .where(and(eq(schema.users.isActive, true), inArray(schema.roles.slug, ["super_admin", "admin"])) as any);
        const adminUserIds = adminRows.map((r) => r.userId as any);
        if (adminUserIds.length) {
          await notificationsService.sendToUsers(
            {
              userIds: adminUserIds,
              type: "order_created" as any,
              title: "New order placed",
              message: `Order ${orderNumber} has been placed`,
              actionUrl: `/dashboard/orders`,
              metadata: {
                entity: "order",
                entityId: order.id,
                orderNumber,
              },
            },
            { userId: userId || undefined },
          );
        }
      }
    } catch (e) {
      console.error("Failed to notify admins (order_created)", e);
    }

    // Notify user (if logged in)
    try {
      if (userId && order && !isAdminUser) {
        await notificationsService.create(
          {
            userId,
            type: "order_created" as any,
            title: "Order placed",
            message: `Your order ${orderNumber} has been placed successfully`,
            actionUrl: `/account/orders/${order.id}`,
          },
          { userId },
        );
      }
    } catch { }

    // Clear cart after successful order
    await storefrontCartService.clearCart(input.cartId);

    return { id: order.id, orderNumber };
  }
}

export const storefrontCheckoutService = new StorefrontCheckoutService();
