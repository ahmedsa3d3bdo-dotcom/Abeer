import "dotenv/config";

import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { productsRepository } from "@/server/repositories/products.repository";
import { ordersService } from "@/server/services/orders.service";
import { nextDocumentNumber } from "@/server/utils/document-number";
import { and, eq, gte, sql } from "drizzle-orm";

type Opts = {
  initialQty: number;
  addQty: number;
  orderQty: number;
};

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  return process.argv[i + 1] ?? "";
}

function numArg(name: string, fallback: number) {
  const v = arg(name);
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function opts(): Opts {
  return {
    initialQty: Math.max(0, Math.floor(numArg("initial", 10))),
    addQty: Math.max(0, Math.floor(numArg("add", 5))),
    orderQty: Math.max(1, Math.floor(numArg("order", 3))),
  };
}

async function getProductInventory(productId: string) {
  const [agg] = await db
    .select({
      quantity: sql<number>`coalesce(sum(${schema.inventory.quantity})::int, 0)`,
      availableQuantity: sql<number>`coalesce(sum(${schema.inventory.availableQuantity})::int, 0)`,
      reservedQuantity: sql<number>`coalesce(sum(${schema.inventory.reservedQuantity})::int, 0)`,
    })
    .from(schema.inventory)
    .where(and(eq(schema.inventory.productId, productId as any), sql`${schema.inventory.variantId} is null` as any));

  return {
    quantity: Number((agg as any)?.quantity ?? 0),
    availableQuantity: Number((agg as any)?.availableQuantity ?? 0),
    reservedQuantity: Number((agg as any)?.reservedQuantity ?? 0),
  };
}

async function reserveProductLevelStock(productId: string, qty: number) {
  if (!Number.isFinite(qty) || qty <= 0) return;

  await db.transaction(async (tx) => {
    // Pick a single inventory row to reserve from (matching checkout's pattern)
    const pickRes = await (tx as any).execute(sql`
      select ${schema.inventory.id} as id, ${schema.inventory.availableQuantity} as available
      from ${schema.inventory}
      where ${schema.inventory.productId} = ${productId as any}
        and ${schema.inventory.variantId} is null
        and ${schema.inventory.availableQuantity} > 0
      order by ${schema.inventory.availableQuantity} desc, ${schema.inventory.updatedAt} desc
      limit 1
      for update skip locked
    `);
    const picked = (pickRes as any)?.rows?.[0];

    if (!picked?.id) {
      // If missing entirely, create a row with 0 stock then fail reservation
      const [created] = await tx
        .insert(schema.inventory)
        .values({ productId: productId as any, variantId: null, quantity: 0 as any, reservedQuantity: 0 as any, availableQuantity: 0 as any } as any)
        .returning({ id: schema.inventory.id });
      throw new Error(`Reservation failed: no available stock row found (created=${String((created as any)?.id || "")})`);
    }

    const available = Number(picked.available || 0);
    if (available < qty) {
      throw new Error(`Reservation failed: insufficient available stock (available=${available}, need=${qty})`);
    }

    const updRes = await (tx as any).execute(sql`
      update ${schema.inventory}
      set
        reserved_quantity = reserved_quantity + ${qty},
        available_quantity = available_quantity - ${qty}
      where ${schema.inventory.id} = ${picked.id}
        and ${schema.inventory.availableQuantity} >= ${qty}
      returning ${schema.inventory.id} as id
    `);

    if (!(updRes as any)?.rows?.length) {
      throw new Error("Reservation failed: race condition updating inventory");
    }
  });
}

async function assertEq(label: string, actual: number, expected: number) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected} but got ${actual}`);
  }
}

async function main() {
  const o = opts();

  process.stdout.write(
    `Stock validate starting: initial=${o.initialQty} add=${o.addQty} order=${o.orderQty}\n`,
  );

  // 1) Create product with initial stock
  const slug = `stock-validate-${Date.now()}`;
  const product = await productsRepository.create({
    name: "Stock validate product",
    slug,
    sku: `SKU-${Date.now()}`,
    price: "10.00",
    stockQuantity: o.initialQty,
    status: "active" as any,
    trackInventory: true,
  });

  process.stdout.write(`Created product id=${product.id} slug=${slug}\n`);

  const inv1 = await getProductInventory(product.id);
  process.stdout.write(`After create: ${JSON.stringify(inv1)}\n`);
  await assertEq("create.quantity", inv1.quantity, o.initialQty);
  await assertEq("create.available", inv1.availableQuantity, o.initialQty);
  await assertEq("create.reserved", inv1.reservedQuantity, 0);

  // 2) Add stock via addStockQuantity
  await productsRepository.update(product.id, {
    name: product.name,
    price: String((product as any).price || "10.00"),
    addStockQuantity: o.addQty,
  } as any);

  const inv2 = await getProductInventory(product.id);
  process.stdout.write(`After add stock: ${JSON.stringify(inv2)}\n`);
  await assertEq("add.quantity", inv2.quantity, o.initialQty + o.addQty);
  await assertEq("add.available", inv2.availableQuantity, o.initialQty + o.addQty);
  await assertEq("add.reserved", inv2.reservedQuantity, 0);

  // 3) Simulate order placement reservation (no on-hand deduction)
  const orderNumber = await nextDocumentNumber("ORD");
  await reserveProductLevelStock(product.id, o.orderQty);

  const [order] = await db.transaction(async (tx) => {
    const [createdOrder] = await tx
      .insert(schema.orders)
      .values({
        orderNumber,
        status: "pending" as any,
        paymentStatus: "pending" as any,
        paymentMethod: "credit_card" as any,
        subtotal: "0.00",
        taxAmount: "0.00",
        shippingAmount: "0.00",
        discountAmount: "0.00",
        totalAmount: "0.00",
        currency: "CAD",
        customerEmail: "stock-validate@example.com",
      } as any)
      .returning();

    await tx.insert(schema.orderItems).values({
      orderId: createdOrder.id,
      productId: product.id,
      variantId: null,
      productName: product.name,
      variantName: null,
      sku: product.sku,
      quantity: o.orderQty,
      unitPrice: "0.00",
      totalPrice: "0.00",
      taxAmount: "0.00",
      discountAmount: "0.00",
    } as any);

    return [createdOrder];
  });

  process.stdout.write(`Reserved order id=${order.id} orderNumber=${orderNumber}\n`);

  const inv3 = await getProductInventory(product.id);
  process.stdout.write(`After reserve (order placed): ${JSON.stringify(inv3)}\n`);
  await assertEq("reserve.quantity (unchanged)", inv3.quantity, o.initialQty + o.addQty);
  await assertEq("reserve.available", inv3.availableQuantity, o.initialQty + o.addQty - o.orderQty);
  await assertEq("reserve.reserved", inv3.reservedQuantity, o.orderQty);

  // 4) Mark order as shipped => commit reservation (deduct on-hand)
  const res = await ordersService.update(String(order.id), { status: "shipped" as any });
  if (!res.success) {
    throw new Error(`ordersService.update failed: ${res.error.code} ${res.error.message}`);
  }

  const inv4 = await getProductInventory(product.id);
  process.stdout.write(`After shipped (commit): ${JSON.stringify(inv4)}\n`);
  await assertEq("ship.quantity", inv4.quantity, o.initialQty + o.addQty - o.orderQty);
  await assertEq("ship.available", inv4.availableQuantity, o.initialQty + o.addQty - o.orderQty);
  await assertEq("ship.reserved", inv4.reservedQuantity, 0);

  process.stdout.write("OK: Stock reservation + commit-on-shipped flow validated.\n");
}

main().catch(async (e) => {
  process.stderr.write(String(e?.stack || e?.message || e) + "\n");
  process.exit(1);
});

export {};
