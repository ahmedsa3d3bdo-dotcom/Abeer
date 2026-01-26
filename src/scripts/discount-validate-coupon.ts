import "dotenv/config";

import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { discountsRepository } from "@/server/repositories/discounts.repository";
import { productsRepository } from "@/server/repositories/products.repository";
import { storefrontCartRepository } from "@/server/storefront/repositories/cart.repository";
import { and, eq, sql } from "drizzle-orm";

function money(v: number) {
  return Number(v.toFixed(2));
}

function assertApprox(label: string, actual: number, expected: number, tol = 0.01) {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(`${label}: expected ${expected} but got ${actual}`);
  }
}

async function ensureNoGlobalPriceOffers() {
  const now = new Date();
  const rows = await db
    .select({
      id: schema.discounts.id,
      name: schema.discounts.name,
    })
    .from(schema.discounts)
    .where(
      sql`${schema.discounts.isAutomatic} = true and ${schema.discounts.status} = 'active' and (${schema.discounts.startsAt} is null or ${schema.discounts.startsAt} <= ${now}) and (${schema.discounts.endsAt} is null or ${schema.discounts.endsAt} >= ${now}) and coalesce(${schema.discounts.metadata} ->> 'kind', '') = 'offer' and coalesce(${schema.discounts.metadata} ->> 'offerKind', '') = 'standard'`,
    );

  if (!rows.length) return;

  const ids = rows.map((r) => r.id);
  const prodRows = await db
    .select({ did: schema.discountProducts.discountId, pid: schema.discountProducts.productId })
    .from(schema.discountProducts)
    .where(sql`${schema.discountProducts.discountId} in ${ids}`);
  const catRows = await db
    .select({ did: schema.discountCategories.discountId, cid: schema.discountCategories.categoryId })
    .from(schema.discountCategories)
    .where(sql`${schema.discountCategories.discountId} in ${ids}`);

  const targeted = new Set<string>();
  for (const r of prodRows) targeted.add(String(r.did));
  for (const r of catRows) targeted.add(String(r.did));

  const global = rows.filter((r) => !targeted.has(String(r.id)));
  if (global.length) {
    throw new Error(`Found active global scheduled offers that apply to all products. Disable them before running validation: ${global.map((g) => g.name).join(", ")}`);
  }
}

async function main() {
  await ensureNoGlobalPriceOffers();

  const suffix = Date.now();
  const product = await productsRepository.create({
    name: `Validate coupon product ${suffix}`,
    slug: `validate-coupon-${suffix}`,
    sku: `VAL-COUPON-${suffix}`,
    price: "100.00",
    status: "active" as any,
    trackInventory: true,
    stockQuantity: 100,
  });

  const code = `SAVE${String(suffix).slice(-4)}`;
  const discount = await discountsRepository.create({
    name: `Validate coupon ${suffix}`,
    code,
    type: "percentage" as any,
    value: "10.00" as any,
    scope: "all" as any,
    status: "active" as any,
    isAutomatic: false as any,
    usageLimit: 100 as any,
    metadata: { kind: "discount" } as any,
  } as any);

  const [cart] = await db
    .insert(schema.carts)
    .values({
      sessionId: `validate-coupon-${suffix}`,
      status: "active" as any,
      currency: "CAD",
    } as any)
    .returning();

  const unit = parseFloat(String((product as any).price || "0"));
  await db.insert(schema.cartItems).values({
    cartId: cart.id,
    productId: product.id,
    variantId: null,
    productName: product.name,
    variantName: null,
    sku: product.sku || product.id,
    quantity: 2,
    unitPrice: unit.toFixed(2),
    totalPrice: (unit * 2).toFixed(2),
  } as any);

  await storefrontCartRepository.applyDiscountCode(cart.id, code);

  const [row] = await db
    .select({
      subtotal: schema.carts.subtotal,
      discountAmount: schema.carts.discountAmount,
      totalAmount: schema.carts.totalAmount,
      appliedDiscountId: schema.carts.appliedDiscountId,
      appliedDiscountCode: schema.carts.appliedDiscountCode,
    })
    .from(schema.carts)
    .where(eq(schema.carts.id, cart.id))
    .limit(1);

  if (!row) throw new Error("Cart not found after apply");
  if (String(row.appliedDiscountId || "") !== String(discount.id)) {
    throw new Error(`Expected appliedDiscountId=${discount.id} but got ${String(row.appliedDiscountId || "")}`);
  }
  if (String(row.appliedDiscountCode || "").toUpperCase() !== code.toUpperCase()) {
    throw new Error(`Expected appliedDiscountCode=${code} but got ${String(row.appliedDiscountCode || "")}`);
  }

  const subtotal = money(parseFloat(String(row.subtotal)));
  const discountAmount = money(parseFloat(String(row.discountAmount)));
  const totalAmount = money(parseFloat(String(row.totalAmount)));

  assertApprox("subtotal", subtotal, 200);
  assertApprox("discountAmount", discountAmount, 20);
  assertApprox("totalAmount", totalAmount, 180);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.discounts)
    .where(and(eq(schema.discounts.id, discount.id), eq(schema.discounts.code, code)));

  if (!Number(count || 0)) throw new Error("Discount not persisted");

  process.stdout.write("OK: coupon discount validated.\n");
}

main().catch((e) => {
  process.stderr.write(String(e?.stack || e?.message || e) + "\n");
  process.exit(1);
});

export {};
