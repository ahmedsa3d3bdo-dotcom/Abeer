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

async function ensureNoGlobalAutomaticPromos() {
  const now = new Date();
  const rows = await db
    .select({ id: schema.discounts.id, name: schema.discounts.name })
    .from(schema.discounts)
    .where(
      sql`${schema.discounts.isAutomatic} = true and ${schema.discounts.status} = 'active' and (${schema.discounts.startsAt} is null or ${schema.discounts.startsAt} <= ${now}) and (${schema.discounts.endsAt} is null or ${schema.discounts.endsAt} >= ${now})`,
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
    throw new Error(`Found active global automatic discounts that may affect validation. Disable them before running: ${global.map((g) => g.name).join(", ")}`);
  }
}

async function main() {
  await ensureNoGlobalAutomaticPromos();

  const suffix = Date.now();
  const buyProduct = await productsRepository.create({
    name: `Validate BXGY bundle buy ${suffix}`,
    slug: `validate-bxgy-bundle-buy-${suffix}`,
    sku: `VAL-BXGY-BUY-${suffix}`,
    price: "50.00",
    status: "active" as any,
    trackInventory: true,
    stockQuantity: 100,
  });

  const getProduct = await productsRepository.create({
    name: `Validate BXGY bundle get ${suffix}`,
    slug: `validate-bxgy-bundle-get-${suffix}`,
    sku: `VAL-BXGY-GET-${suffix}`,
    price: "30.00",
    status: "active" as any,
    trackInventory: true,
    stockQuantity: 100,
  });

  await discountsRepository.create({
    name: `Validate BXGY bundle ${suffix}`,
    code: null,
    type: "fixed_amount" as any,
    value: "0" as any,
    scope: "all" as any,
    status: "active" as any,
    isAutomatic: true as any,
    metadata: {
      kind: "deal",
      offerKind: "bxgy_bundle",
      bxgyBundle: {
        buy: [{ productId: buyProduct.id, quantity: 1 }],
        get: [{ productId: getProduct.id, quantity: 1 }],
      },
      display: { imageUrl: "" },
    } as any,
  } as any);

  const [cart] = await db
    .insert(schema.carts)
    .values({
      sessionId: `validate-bxgy-bundle-${suffix}`,
      status: "active" as any,
      currency: "CAD",
    } as any)
    .returning();

  await db.insert(schema.cartItems).values({
    cartId: cart.id,
    productId: buyProduct.id,
    variantId: null,
    productName: buyProduct.name,
    variantName: null,
    sku: buyProduct.sku || buyProduct.id,
    quantity: 1,
    unitPrice: "50.00",
    totalPrice: "50.00",
  } as any);

  await db.insert(schema.cartItems).values({
    cartId: cart.id,
    productId: getProduct.id,
    variantId: null,
    productName: getProduct.name,
    variantName: null,
    sku: getProduct.sku || getProduct.id,
    quantity: 1,
    unitPrice: "30.00",
    totalPrice: "30.00",
  } as any);

  await storefrontCartRepository.recalculateTotals(cart.id);

  const [row] = await db
    .select({ subtotal: schema.carts.subtotal, discountAmount: schema.carts.discountAmount, totalAmount: schema.carts.totalAmount })
    .from(schema.carts)
    .where(eq(schema.carts.id, cart.id))
    .limit(1);

  if (!row) throw new Error("Cart not found");

  const subtotal = money(parseFloat(String(row.subtotal)));
  const discountAmount = money(parseFloat(String(row.discountAmount)));
  const totalAmount = money(parseFloat(String(row.totalAmount)));

  assertApprox("subtotal", subtotal, 80);
  assertApprox("discountAmount", discountAmount, 30);
  assertApprox("totalAmount", totalAmount, 50);

  const [created] = await db
    .select({ id: schema.discounts.id })
    .from(schema.discounts)
    .where(sql`${schema.discounts.name} = ${`Validate BXGY bundle ${suffix}`}`)
    .limit(1);
  if (created?.id) {
    await db
      .update(schema.discounts)
      .set({ status: "draft" as any, updatedAt: new Date() } as any)
      .where(eq(schema.discounts.id, created.id));
  }

  process.stdout.write("OK: BXGY bundle validated.\n");
}

main().catch((e) => {
  process.stderr.write(String(e?.stack || e?.message || e) + "\n");
  process.exit(1);
});

export {};
