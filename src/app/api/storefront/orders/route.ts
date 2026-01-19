import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storefrontCheckoutService } from "@/server/storefront/services/checkout.service";
import { auth } from "@/auth";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "20")));
    const status = searchParams.get("status") || undefined;
    const offset = (page - 1) * limit;

    const where = status
      ? (row: typeof schema.orders) => and(eq(row.userId, session.user.id as any), eq(row.status, status as any) as any)
      : (row: typeof schema.orders) => eq(row.userId, session.user.id as any);

    const orders = await db
      .select()
      .from(schema.orders)
      .where(where(schema.orders) as any)
      .orderBy(desc(schema.orders.createdAt))
      .limit(limit)
      .offset(offset);

    const orderIds = orders.map((o) => o.id);
    let items: Array<{
      orderId: string;
      productId: string | null;
      variantId: string | null;
      productSlug: string | null;
      productName: string;
      quantity: number;
      unitPrice: string;
      variantImage: string | null;
      primaryImage: string | null;
    }> = [];
    if (orderIds.length) {
      items = await db
        .select({
          orderId: schema.orderItems.orderId,
          productId: schema.orderItems.productId,
          variantId: schema.orderItems.variantId,
          productSlug: schema.products.slug,
          productName: schema.orderItems.productName,
          quantity: schema.orderItems.quantity,
          unitPrice: schema.orderItems.unitPrice,
          variantImage: schema.productVariants.image,
          primaryImage: schema.productImages.url,
        })
        .from(schema.orderItems)
        .leftJoin(schema.productVariants, eq(schema.productVariants.id, schema.orderItems.variantId))
        .leftJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
        .leftJoin(
          schema.productImages,
          and(eq(schema.productImages.productId, schema.orderItems.productId), eq(schema.productImages.isPrimary, true))
        )
        .where(inArray(schema.orderItems.orderId, orderIds as any));
    }

    const itemsPayload = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      date: o.createdAt,
      status: o.status,
      paymentStatus: o.paymentStatus,
      total: parseFloat(o.totalAmount as any),
      items: items
        .filter((it) => it.orderId === o.id)
        .map((it) => ({
          name: it.productName,
          quantity: it.quantity,
          price: parseFloat(it.unitPrice as any),
          productId: it.productId,
          variantId: it.variantId,
          productSlug: it.productSlug,
          image: it.variantImage || it.primaryImage || "/placeholder-product.jpg",
        })),
    }));

    const whereOrders = where(schema.orders) as any;
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.orders)
      .where(whereOrders);
    const total = Number(count || 0);
    const hasMore = page * limit < total;

    return NextResponse.json({ success: true, data: { items: itemsPayload, total, page, limit, hasMore } });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Failed to load orders" } },
      { status: 500 }
    );
  }
}

const placeOrderSchema = z.object({
  shippingAddress: z.record(z.any()),
  shippingMethod: z.object({
    id: z.string(),
    name: z.string(),
    price: z.coerce.number(),
    description: z.string().optional().nullable(),
    estimatedDays: z.coerce.number().optional().nullable(),
    carrier: z.string().optional().nullable(),
  }),
  paymentMethod: z.object({ type: z.string() }).catchall(z.any()),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = placeOrderSchema.parse(body);

    // Normalize nullable optional fields to undefined for strong typing
    const shippingMethod = {
      id: data.shippingMethod.id,
      name: data.shippingMethod.name,
      price: data.shippingMethod.price,
      description: data.shippingMethod.description ?? undefined,
      estimatedDays: data.shippingMethod.estimatedDays ?? undefined,
      carrier: data.shippingMethod.carrier ?? undefined,
    };

    const cartId = request.cookies.get("cart_id")?.value;
    if (!cartId) {
      return NextResponse.json(
        { success: false, error: { message: "Cart not found" } },
        { status: 400 }
      );
    }

    const order = await storefrontCheckoutService.placeOrder({
      cartId,
      ...data,
      shippingMethod,
    });

    // return order id and order number for client redirect
    return NextResponse.json({ success: true, data: order }, { status: 200 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { message: "Validation failed", details: e.errors } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Failed to place order" } },
      { status: 500 }
    );
  }
}
