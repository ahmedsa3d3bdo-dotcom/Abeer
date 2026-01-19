import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq, inArray, desc } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const isUuid = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

    // Resolve order by orderNumber first, then by UUID id
    let order = await db.select().from(schema.orders).where(eq(schema.orders.orderNumber, id)).limit(1);
    if (order.length === 0) {
      if (isUuid(id)) {
        order = await db.select().from(schema.orders).where(eq(schema.orders.id, id as any)).limit(1);
      }
    }
    if (order.length === 0) {
      return NextResponse.json({ success: false, error: { message: "Order not found" } }, { status: 404 });
    }
    const orderId = order[0].id;

    const selectedShippingMethodId = (order[0] as any)?.shippingMethodId as string | null | undefined;
    const [selectedShippingMethod] = selectedShippingMethodId
      ? await db
          .select({
            id: schema.shippingMethods.id,
            name: schema.shippingMethods.name,
            price: schema.shippingMethods.price,
            carrier: schema.shippingMethods.carrier,
            estimatedDays: schema.shippingMethods.estimatedDays,
          })
          .from(schema.shippingMethods)
          .where(eq(schema.shippingMethods.id, selectedShippingMethodId as any))
          .limit(1)
      : [null];

    // Load shipments with method info
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
      .where(eq(schema.shipments.orderId, orderId));

    const shipmentIds = shipments.map((s) => s.id);
    let updates: Array<{ shipmentId: string; status: string; description: string | null; location: string | null; occurredAt: Date }>
      = [];
    if (shipmentIds.length) {
      updates = await db
        .select({
          shipmentId: schema.trackingUpdates.shipmentId,
          status: schema.trackingUpdates.status,
          description: schema.trackingUpdates.description,
          location: schema.trackingUpdates.location,
          occurredAt: schema.trackingUpdates.occurredAt,
        })
        .from(schema.trackingUpdates)
        .where(inArray(schema.trackingUpdates.shipmentId, shipmentIds as any))
        .orderBy(desc(schema.trackingUpdates.occurredAt));
    }

    const result = shipments.map((s) => ({
      ...s,
      updates: updates.filter((u) => u.shipmentId === s.id),
    }));

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        shipments: result,
        selectedShippingMethod: selectedShippingMethod
          ? {
              id: selectedShippingMethod.id,
              name: selectedShippingMethod.name,
              price: selectedShippingMethod.price,
              carrier: selectedShippingMethod.carrier,
              estimatedDays: selectedShippingMethod.estimatedDays,
            }
          : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Failed to load tracking" } },
      { status: 500 }
    );
  }
}
