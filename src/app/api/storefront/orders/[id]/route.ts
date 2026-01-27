import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await params;

    // Resolve order by orderNumber first, then by UUID id, and ensure it belongs to the user
    let orders = await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.userId, session.user.id as any), eq(schema.orders.orderNumber, id)))
      .limit(1);
    if (orders.length === 0) {
      orders = await db
        .select()
        .from(schema.orders)
        .where(and(eq(schema.orders.userId, session.user.id as any), eq(schema.orders.id, id as any)))
        .limit(1);
    }
    if (orders.length === 0) {
      return NextResponse.json({ success: false, error: { message: "Order not found" } }, { status: 404 });
    }
    const order = orders[0];

    // Load items with images
    const items = await db
      .select({
        id: schema.orderItems.id,
        productId: schema.orderItems.productId,
        variantId: schema.orderItems.variantId,
        productSlug: schema.products.slug,
        productName: schema.orderItems.productName,
        variantName: schema.orderItems.variantName,
        sku: schema.orderItems.sku,
        quantity: schema.orderItems.quantity,
        unitPrice: schema.orderItems.unitPrice,
        totalPrice: schema.orderItems.totalPrice,
        productPrice: schema.products.price,
        productCompareAtPrice: schema.products.compareAtPrice,
        variantPrice: schema.productVariants.price,
        variantCompareAtPrice: schema.productVariants.compareAtPrice,
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
      .where(eq(schema.orderItems.orderId, order.id as any));

    // Load shipments + method
    const shipments = await db
      .select({
        id: schema.shipments.id,
        status: schema.shipments.status,
        trackingNumber: schema.shipments.trackingNumber,
        carrier: schema.shipments.carrier,
        shippedAt: schema.shipments.shippedAt,
        estimatedDeliveryAt: schema.shipments.estimatedDeliveryAt,
        deliveredAt: schema.shipments.deliveredAt,
        methodId: schema.shipments.shippingMethodId,
        methodName: schema.shippingMethods.name,
        methodPrice: schema.shippingMethods.price,
      })
      .from(schema.shipments)
      .leftJoin(schema.shippingMethods, eq(schema.shippingMethods.id, schema.shipments.shippingMethodId))
      .where(eq(schema.shipments.orderId, order.id as any));

    const [orderShippingMethod] = order.shippingMethodId
      ? await db
          .select({
            id: schema.shippingMethods.id,
            name: schema.shippingMethods.name,
            price: schema.shippingMethods.price,
            carrier: schema.shippingMethods.carrier,
            estimatedDays: schema.shippingMethods.estimatedDays,
          })
          .from(schema.shippingMethods)
          .where(eq(schema.shippingMethods.id, order.shippingMethodId as any))
          .limit(1)
      : [null];

    // Best-effort shipping address: fallback to user's default address
    const [address] = await db
      .select()
      .from(schema.shippingAddresses)
      .where(and(eq(schema.shippingAddresses.userId, session.user.id as any), eq(schema.shippingAddresses.isDefault, true)))
      .limit(1);

    const payload = {
      id: order.id,
      orderNumber: order.orderNumber,
      date: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: parseFloat(order.subtotal as any),
      tax: parseFloat(order.taxAmount as any),
      shipping: parseFloat(order.shippingAmount as any),
      discount: parseFloat(order.discountAmount as any),
      total: parseFloat(order.totalAmount as any),
      discounts: await (async () => {
        const rows = await db
          .select({
            id: schema.orderDiscounts.id,
            discountId: schema.orderDiscounts.discountId,
            code: schema.orderDiscounts.code,
            amount: schema.orderDiscounts.amount,
            discountName: schema.discounts.name,
            discountType: schema.discounts.type,
            discountValue: schema.discounts.value,
          })
          .from(schema.orderDiscounts)
          .leftJoin(schema.discounts, eq(schema.discounts.id, schema.orderDiscounts.discountId))
          .where(eq(schema.orderDiscounts.orderId, order.id as any));

        return rows.map((r) => ({
          id: r.id,
          discountId: r.discountId,
          code: r.code,
          amount: parseFloat(r.amount as any),
          name: r.discountName,
          type: r.discountType,
          value: r.discountValue != null ? parseFloat(r.discountValue as any) : null,
        }));
      })(),
      items: items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productSlug: it.productSlug,
        name: it.productName,
        image: it.variantImage || it.primaryImage || "/placeholder-product.jpg",
        sku: it.sku,
        variant: it.variantName || null,
        quantity: it.quantity,
        price: parseFloat(it.unitPrice as any),
        total: parseFloat(it.totalPrice as any),
        compareAtPrice: (() => {
          const raw = (it as any).variantCompareAtPrice ?? (it as any).productCompareAtPrice;
          if (raw == null) return null;
          const n = parseFloat(raw as any);
          return Number.isFinite(n) && n > 0 ? n : null;
        })(),
        referencePrice: parseFloat(((it as any).variantPrice ?? (it as any).productPrice ?? "0") as any),
      })),
      shipments: shipments.map((s) => ({
        id: s.id,
        status: s.status,
        trackingNumber: s.trackingNumber,
        carrier: s.carrier,
        shippedAt: s.shippedAt,
        estimatedDeliveryAt: s.estimatedDeliveryAt,
        deliveredAt: s.deliveredAt,
        methodName: s.methodName,
        methodPrice: s.methodPrice,
      })),
      selectedShippingMethod: orderShippingMethod
        ? {
            id: orderShippingMethod.id,
            name: orderShippingMethod.name,
            price: orderShippingMethod.price,
            carrier: orderShippingMethod.carrier,
            estimatedDays: orderShippingMethod.estimatedDays,
          }
        : null,
      shippingAddress: address
        ? {
            name: `${address.firstName} ${address.lastName}`.trim(),
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
            phone: address.phone,
          }
        : null,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Failed to load order" } },
      { status: 500 }
    );
  }
}
