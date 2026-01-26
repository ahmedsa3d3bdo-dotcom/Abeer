import "dotenv/config";

import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { discountsRepository } from "@/server/repositories/discounts.repository";
import { productsRepository } from "@/server/repositories/products.repository";
import { storefrontCartRepository } from "@/server/storefront/repositories/cart.repository";
import { eq, sql } from "drizzle-orm";

function money(v: number) {
  return Number(v.toFixed(2));
}

function assertApprox(label: string, actual: number, expected: number, tol = 0.01) {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(`${label}: expected ${expected} but got ${actual}`);
  }
}

async function ensureNoGlobalNonOfferAutomaticPromos() {
  const now = new Date();
  const rows = await db
    .select({ id: schema.discounts.id, name: schema.discounts.name })
    .from(schema.discounts)
    .where(
      sql`${schema.discounts.isAutomatic} = true and ${schema.discounts.status} = 'active' and (${schema.discounts.startsAt} is null or ${schema.discounts.startsAt} <= ${now}) and (${schema.discounts.endsAt} is null or ${schema.discounts.endsAt} >= ${now}) and coalesce(${schema.discounts.metadata} ->> 'kind', '') <> 'offer'`,
    );

  if (!rows.length) return;

  const ids = rows.map((r) => r.id);
  const prodRows = await db
    .select({ did: schema.discountProducts.discountId })
    .from(schema.discountProducts)
    .where(sql`${schema.discountProducts.discountId} in ${ids}`);
  const catRows = await db
    .select({ did: schema.discountCategories.discountId })
    .from(schema.discountCategories)
    .where(sql`${schema.discountCategories.discountId} in ${ids}`);

  const targeted = new Set<string>();
  for (const r of prodRows) targeted.add(String(r.did));
  for (const r of catRows) targeted.add(String(r.did));

  const global = rows.filter((r) => !targeted.has(String(r.id)));
  if (global.length) {
    throw new Error(
      `Found active global automatic discounts/deals that may affect totals. Disable them before running validation: ${global.map((g) => g.name).join(", ")}`,
    );
  }
}

async function main() {
  await ensureNoGlobalNonOfferAutomaticPromos();

  const suffix = Date.now();
  const product = await productsRepository.create({
    name: `Validate scheduled offer product ${suffix}`,
    slug: `validate-scheduled-offer-${suffix}`,
    sku: `VAL-OFFER-${suffix}`,
    price: "100.00",
    compareAtPrice: "120.00",
    status: "active" as any,
    trackInventory: true,
    stockQuantity: 100,
  });

  const offer = await discountsRepository.create({
    name: `Validate scheduled offer ${suffix}`,
    code: null,
    type: "percentage" as any,
    value: "25.00" as any,
    scope: "all" as any,
    status: "active" as any,
    isAutomatic: true as any,
    metadata: {
      kind: "offer",
      offerKind: "standard",
      display: { imageUrl: "" },
    } as any,
    productIds: [product.id],
  } as any);

  const [cart] = await db
    .insert(schema.carts)
    .values({
      sessionId: `validate-scheduled-offer-${suffix}`,
      status: "active" as any,
      currency: "CAD",
    } as any)
    .returning();

  const baseUnit = 100;
  await db.insert(schema.cartItems).values({
    cartId: cart.id,
    productId: product.id,
    variantId: null,
    productName: product.name,
    variantName: null,
    sku: product.sku || product.id,
    quantity: 1,
    unitPrice: baseUnit.toFixed(2),
    totalPrice: baseUnit.toFixed(2),
  } as any);

  await storefrontCartRepository.recalculateTotals(cart.id);

  const [item] = await db
    .select({ unitPrice: schema.cartItems.unitPrice, totalPrice: schema.cartItems.totalPrice })
    .from(schema.cartItems)
    .where(eq(schema.cartItems.cartId, cart.id))
    .limit(1);

  if (!item) throw new Error("Cart item not found");

  const unit = money(parseFloat(String(item.unitPrice)));
  const total = money(parseFloat(String(item.totalPrice)));

  assertApprox("unitPrice", unit, 75);
  assertApprox("totalPrice", total, 75);

  const [row] = await db
    .select({ subtotal: schema.carts.subtotal, discountAmount: schema.carts.discountAmount, totalAmount: schema.carts.totalAmount })
    .from(schema.carts)
    .where(eq(schema.carts.id, cart.id))
    .limit(1);

  if (!row) throw new Error("Cart not found");

  const subtotal = money(parseFloat(String(row.subtotal)));
  const discountAmount = money(parseFloat(String(row.discountAmount)));
  const totalAmount = money(parseFloat(String(row.totalAmount)));

  assertApprox("subtotal", subtotal, 75);
  assertApprox("discountAmount", discountAmount, 0);
  assertApprox("totalAmount", totalAmount, 75);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.discounts)
    .where(eq(schema.discounts.id, offer.id));

  if (!Number(count || 0)) throw new Error("Offer not persisted");

  await db
    .update(schema.discounts)
    .set({ status: "draft" as any, updatedAt: new Date() } as any)
    .where(eq(schema.discounts.id, offer.id));

  process.stdout.write("OK: scheduled offer repricing validated.\n");
}

main().catch((e) => {
  process.stderr.write(String(e?.stack || e?.message || e) + "\n");
  process.exit(1);
});

export {};
