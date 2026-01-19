import { ordersRepository } from "../repositories/orders.repository";
import { success, failure, type ServiceResult } from "../types";
import { notificationsService } from "./notifications.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { nextDocumentNumber } from "../utils/document-number";
import { settingsRepository } from "../repositories/settings.repository";

async function getLowStockThreshold() {
  const s = await settingsRepository.findByKey("low_stock_threshold");
  const n = Number(s?.value);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.floor(n));
}

export interface ListOrderParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "createdAt.desc" | "createdAt.asc";
  userId?: string;
}

export interface UpdateOrderInput {
  status?: any;
  paymentStatus?: any;
  adminNote?: string | null;
}

class OrdersService {
  async list(params: ListOrderParams): Promise<ServiceResult<{ items: any[]; total: number }>> {
    try {
      const res = await ordersRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_ORDERS_FAILED", e?.message || "Failed to list orders");
    }
  }

  async get(id: string): Promise<ServiceResult<any>> {
    try {
      const row = await ordersRepository.get(id);
      if (!row) return failure("NOT_FOUND", "Order not found");
      return success(row);
    } catch (e: any) {
      return failure("GET_ORDER_FAILED", e?.message || "Failed to get order");
    }
  }

  async getDetails(id: string): Promise<ServiceResult<any>> {
    try {
      const data = await ordersRepository.getDetails(id);
      if (!data) return failure("NOT_FOUND", "Order not found");
      return success(data);
    } catch (e: any) {
      return failure("GET_ORDER_DETAILS_FAILED", e?.message || "Failed to get order details");
    }
  }

  async update(id: string, patch: UpdateOrderInput): Promise<ServiceResult<any>> {
    try {
      const before = await ordersRepository.get(id);
      if (!before) return failure("NOT_FOUND", "Order not found");

      const lowStockThreshold = await getLowStockThreshold();

      const beforePaymentMethod = (before as any)?.paymentMethod as string | undefined;
      if (patch.status === "delivered" && beforePaymentMethod === "cash_on_delivery") {
        patch = { ...patch, paymentStatus: patch.paymentStatus ?? ("paid" as any) };
      }

      const beforeStatus = String((before as any)?.status || "");
      const targetStatus = typeof patch.status === "string" ? String(patch.status) : undefined;
      const isBeforeShipped = beforeStatus === "shipped" || beforeStatus === "delivered";
      const isTargetShipped = targetStatus === "shipped" || targetStatus === "delivered";
      const shouldCommitReservation = Boolean(isTargetShipped && !isBeforeShipped);
      const shouldCancel = targetStatus === "cancelled" && beforeStatus !== "cancelled";
      const shouldSyncShipment =
        (patch.status === "shipped" || patch.status === "delivered") &&
        String((before as any)?.status || "") !== String(patch.status || "");

      const ensureShipmentForOrderStatus = async (tx: any, orderRow: any, targetStatus: string) => {
        const orderId = String(orderRow.id);
        const orderNumber = String(orderRow.orderNumber || orderId);
        const orderShippingMethodId = (orderRow as any)?.shippingMethodId as string | null | undefined;

        const shipStatus = targetStatus === "delivered" ? ("delivered" as any) : ("in_transit" as any);

        const [existing] = await tx
          .select({
            id: schema.shipments.id,
            shippingMethodId: schema.shipments.shippingMethodId,
            shippedAt: schema.shipments.shippedAt,
            deliveredAt: schema.shipments.deliveredAt,
          })
          .from(schema.shipments)
          .where(eq(schema.shipments.orderId, orderId as any))
          .limit(1);

        const shippingMethodId = (existing?.shippingMethodId as any) || (orderShippingMethodId as any) || null;
        const [method] = shippingMethodId
          ? await tx
              .select({ estimatedDays: schema.shippingMethods.estimatedDays, carrier: schema.shippingMethods.carrier })
              .from(schema.shippingMethods)
              .where(eq(schema.shippingMethods.id, shippingMethodId as any))
              .limit(1)
          : [null];

        const shipDays = typeof (method as any)?.estimatedDays === "number" ? (method as any).estimatedDays : 5;
        const est = new Date();
        est.setDate(est.getDate() + Math.ceil(shipDays));
        const carrier = (method as any)?.carrier || null;

        const now = new Date();
        const wantShippedAt = targetStatus === "shipped" || targetStatus === "delivered";
        const wantDeliveredAt = targetStatus === "delivered";

        if (!existing?.id) {
          const shipmentNumber = await nextDocumentNumber("SHP");
          const [shipment] = await tx
            .insert(schema.shipments)
            .values({
              orderId: orderId as any,
              shipmentNumber,
              shippingMethodId: shippingMethodId as any,
              carrier,
              status: shipStatus,
              shippedAt: wantShippedAt ? now : null,
              estimatedDeliveryAt: est,
              deliveredAt: wantDeliveredAt ? now : null,
            })
            .returning();

          if (shipment?.id) {
            await tx.insert(schema.trackingUpdates).values({
              shipmentId: shipment.id,
              status: shipStatus === "delivered" ? "Delivered" : "Shipped",
              description: shipStatus === "delivered" ? "Your order has been delivered." : "Your order has been shipped.",
              occurredAt: now,
            });

            try {
              await notificationsService.sendToRoles(
                {
                  roleSlugs: ["super_admin", "admin"],
                  type: "shipment_created" as any,
                  title: "New shipment created",
                  message: `Shipment ${shipmentNumber} created for order ${orderNumber}`,
                  actionUrl: `/dashboard/shipping/shipments`,
                  metadata: {
                    entity: "shipment",
                    entityId: shipment.id,
                    shipmentNumber,
                    orderId,
                    orderNumber,
                  },
                },
                undefined,
              );
            } catch {}
          }
        } else {
          await tx
            .update(schema.shipments)
            .set({
              status: shipStatus,
              shippingMethodId: shippingMethodId as any,
              carrier,
              shippedAt: wantShippedAt ? (existing.shippedAt || now) : existing.shippedAt,
              deliveredAt: wantDeliveredAt ? (existing.deliveredAt || now) : existing.deliveredAt,
            } as any)
            .where(eq(schema.shipments.id, existing.id));

          if (targetStatus === "shipped" || targetStatus === "delivered") {
            await tx.insert(schema.trackingUpdates).values({
              shipmentId: existing.id,
              status: shipStatus === "delivered" ? "Delivered" : "Shipped",
              description: shipStatus === "delivered" ? "Your order has been delivered." : "Your order has been shipped.",
              occurredAt: now,
            });
          }
        }
      };

      const row = shouldCancel || shouldCommitReservation || shouldSyncShipment
        ? await db.transaction(async (tx) => {
            if (shouldCancel || shouldCommitReservation) {
              const items = await tx
                .select({ productId: schema.orderItems.productId, variantId: schema.orderItems.variantId, quantity: schema.orderItems.quantity })
                .from(schema.orderItems)
                .where(eq(schema.orderItems.orderId, id));

              const affectedProducts = new Set<string>();
              const soldDeltaByProduct = new Map<string, number>();

              for (const it of items as any[]) {
                const qty = Number(it.quantity || 0);
                if (!Number.isFinite(qty) || qty <= 0) continue;
                if (!it.productId) continue;

                const productId = String(it.productId);
                affectedProducts.add(productId);

                if (shouldCommitReservation) {
                  soldDeltaByProduct.set(productId, (soldDeltaByProduct.get(productId) || 0) + qty);
                }

                if (it.variantId) {
                  if (shouldCancel) {
                    if (isBeforeShipped) {
                      // Shipped already: restock on-hand
                      await tx
                        .update(schema.productVariants)
                        .set({
                          stockQuantity: sql`${schema.productVariants.stockQuantity} + ${qty}` as any,
                        })
                        .where(eq(schema.productVariants.id, it.variantId as any));

                      soldDeltaByProduct.set(productId, (soldDeltaByProduct.get(productId) || 0) - qty);
                    } else {
                      // Not shipped yet: release reservation
                      await tx
                        .update(schema.productVariants)
                        .set({
                          reservedQuantity: sql`greatest(0, ${schema.productVariants.reservedQuantity} - ${qty})` as any,
                        })
                        .where(eq(schema.productVariants.id, it.variantId as any));
                    }
                  } else if (shouldCommitReservation) {
                    const updated = await tx
                      .update(schema.productVariants)
                      .set({
                        stockQuantity: sql`${schema.productVariants.stockQuantity} - ${qty}` as any,
                        reservedQuantity: sql`greatest(0, ${schema.productVariants.reservedQuantity} - ${qty})` as any,
                      })
                      .where(and(eq(schema.productVariants.id, it.variantId as any), sql`${schema.productVariants.stockQuantity} >= ${qty}` as any) as any)
                      .returning({ id: schema.productVariants.id });

                    if (!updated.length) {
                      throw new Error("Insufficient on-hand stock to ship order");
                    }
                  }
                } else {
                  if (shouldCancel) {
                    if (isBeforeShipped) {
                      // Shipped already: restock on-hand and available
                      const pickRes = await (tx as any).execute(sql`
                        select ${schema.inventory.id} as id
                        from ${schema.inventory}
                        where ${schema.inventory.productId} = ${it.productId as any}
                          and ${schema.inventory.variantId} is null
                        order by ${schema.inventory.updatedAt} desc
                        limit 1
                        for update skip locked
                      `);
                      const picked = (pickRes as any)?.rows?.[0];
                      if (picked?.id) {
                        await (tx as any).execute(sql`
                          update ${schema.inventory}
                          set
                            available_quantity = available_quantity + ${qty},
                            quantity = quantity + ${qty}
                          where ${schema.inventory.id} = ${picked.id}
                        `);
                      } else {
                        await tx.insert(schema.inventory).values({
                          productId: it.productId as any,
                          variantId: null,
                          quantity: qty as any,
                          reservedQuantity: 0 as any,
                          availableQuantity: qty as any,
                        } as any);
                      }

                      soldDeltaByProduct.set(productId, (soldDeltaByProduct.get(productId) || 0) - qty);
                    } else {
                      // Not shipped yet: release reservation back to available
                      let remaining = qty;
                      while (remaining > 0) {
                        const pickRes = await (tx as any).execute(sql`
                          select ${schema.inventory.id} as id, ${schema.inventory.reservedQuantity} as reserved
                          from ${schema.inventory}
                          where ${schema.inventory.productId} = ${it.productId as any}
                            and ${schema.inventory.variantId} is null
                            and ${schema.inventory.reservedQuantity} > 0
                          order by ${schema.inventory.reservedQuantity} desc, ${schema.inventory.updatedAt} desc
                          limit 1
                          for update skip locked
                        `);
                        const picked = (pickRes as any)?.rows?.[0];
                        if (!picked) break;
                        const reserved = Number(picked.reserved || 0);
                        const dec = Math.min(remaining, reserved);
                        const updRes = await (tx as any).execute(sql`
                          update ${schema.inventory}
                          set
                            reserved_quantity = reserved_quantity - ${dec},
                            available_quantity = available_quantity + ${dec}
                          where ${schema.inventory.id} = ${picked.id}
                            and ${schema.inventory.reservedQuantity} >= ${dec}
                          returning ${schema.inventory.id} as id
                        `);
                        if (!(updRes as any)?.rows?.length) continue;
                        remaining -= dec;
                      }
                    }
                  } else if (shouldCommitReservation) {
                    let remaining = qty;
                    while (remaining > 0) {
                      const pickRes = await (tx as any).execute(sql`
                        select ${schema.inventory.id} as id, ${schema.inventory.reservedQuantity} as reserved
                        from ${schema.inventory}
                        where ${schema.inventory.productId} = ${it.productId as any}
                          and ${schema.inventory.variantId} is null
                          and ${schema.inventory.reservedQuantity} > 0
                        order by ${schema.inventory.reservedQuantity} desc, ${schema.inventory.updatedAt} desc
                        limit 1
                        for update skip locked
                      `);
                      const picked = (pickRes as any)?.rows?.[0];
                      if (!picked) {
                        throw new Error("Missing reserved stock to ship order");
                      }
                      const reserved = Number(picked.reserved || 0);
                      const dec = Math.min(remaining, reserved);
                      const updRes = await (tx as any).execute(sql`
                        update ${schema.inventory}
                        set
                          reserved_quantity = reserved_quantity - ${dec},
                          quantity = quantity - ${dec}
                        where ${schema.inventory.id} = ${picked.id}
                          and ${schema.inventory.reservedQuantity} >= ${dec}
                          and ${schema.inventory.quantity} >= ${dec}
                        returning ${schema.inventory.id} as id
                      `);
                      if (!(updRes as any)?.rows?.length) continue;
                      remaining -= dec;
                    }
                  }
                }
              }

              // Update stock status for affected products
              for (const pid of affectedProducts) {
                const [{ variantCount = 0 } = {} as any] = await tx
                  .select({ variantCount: sql<number>`count(*)` })
                  .from(schema.productVariants)
                  .where(and(eq(schema.productVariants.productId, pid as any), eq(schema.productVariants.isActive, true)) as any);

                if (Number(variantCount || 0) > 0) {
                  const [{ total = 0 } = {} as any] = await tx
                    .select({ total: sql<number>`COALESCE(SUM((${schema.productVariants.stockQuantity} - ${schema.productVariants.reservedQuantity})), 0)` })
                    .from(schema.productVariants)
                    .where(and(eq(schema.productVariants.productId, pid as any), eq(schema.productVariants.isActive, true)) as any);
                  const stockStatus = Number(total) <= 0 ? ("out_of_stock" as any) : Number(total) <= lowStockThreshold ? ("low_stock" as any) : ("in_stock" as any);
                  await tx.update(schema.products).set({ stockStatus } as any).where(eq(schema.products.id, pid as any));
                } else {
                  const [{ avail = 0 } = {} as any] = await tx
                    .select({ avail: sql<number>`COALESCE(SUM(${schema.inventory.availableQuantity}), 0)` })
                    .from(schema.inventory)
                    .where(and(eq(schema.inventory.productId, pid as any), sql`${schema.inventory.variantId} is null` as any) as any);
                  const stockStatus = Number(avail) <= 0 ? ("out_of_stock" as any) : Number(avail) <= lowStockThreshold ? ("low_stock" as any) : ("in_stock" as any);
                  await tx.update(schema.products).set({ stockStatus } as any).where(eq(schema.products.id, pid as any));
                }
              }

              // Update sold_count deltas
              for (const [pid, delta] of soldDeltaByProduct.entries()) {
                if (!delta) continue;
                if (delta > 0) {
                  await (tx as any).execute(sql`
                    update ${schema.products}
                    set sold_count = sold_count + ${delta}
                    where ${schema.products.id} = ${pid}
                  `);
                } else {
                  const abs = Math.abs(delta);
                  await (tx as any).execute(sql`
                    update ${schema.products}
                    set sold_count = greatest(0, sold_count - ${abs})
                    where ${schema.products.id} = ${pid}
                  `);
                }
              }
            }

            const orderPatch: any = { ...patch };
            if (patch.status === "shipped" && !(before as any)?.shippedAt) orderPatch.shippedAt = new Date();
            if (patch.status === "delivered" && !(before as any)?.deliveredAt) orderPatch.deliveredAt = new Date();
            if (patch.status === "delivered" && !(before as any)?.shippedAt) orderPatch.shippedAt = orderPatch.shippedAt || new Date();

            const [updated] = await tx.update(schema.orders).set(orderPatch).where(eq(schema.orders.id, id)).returning();
            if (updated && shouldSyncShipment && patch.status) {
              await ensureShipmentForOrderStatus(tx, updated, String(patch.status));
            }
            return updated || null;
          })
        : await ordersRepository.update(id, patch);

      if (!row) return failure("NOT_FOUND", "Order not found");
      try {
        const userId = (row as any)?.userId as string | undefined;
        const orderNumber = (row as any)?.orderNumber as string | undefined;
        if (userId) {
          const status = (row as any)?.status as string | undefined;
          const paymentStatus = (row as any)?.paymentStatus as string | undefined;
          if (patch.status && status) {
            const type = status === "shipped" ? ("order_shipped" as any) : status === "delivered" ? ("order_delivered" as any) : ("order_updated" as any);
            await notificationsService.create(
              {
                userId,
                type,
                title: status === "shipped" ? "Order shipped" : status === "delivered" ? "Order delivered" : "Order updated",
                message: `Order ${orderNumber || id} status updated to ${status}`,
                actionUrl: `/account/orders/${id}`,
              },
              { userId },
            );
          } else if (patch.paymentStatus && paymentStatus) {
            await notificationsService.create(
              {
                userId,
                type: "order_updated" as any,
                title: "Payment status updated",
                message: `Payment status for order ${orderNumber || id} is now ${paymentStatus}`,
                actionUrl: `/account/orders/${id}`,
              },
              { userId },
            );
          }
        }
      } catch {}
      return success(row);
    } catch (e: any) {
      return failure("UPDATE_ORDER_FAILED", e?.message || "Failed to update order");
    }
  }

  async remove(id: string): Promise<ServiceResult<{ id: string }>> {
    try {
      const ok = await ordersRepository.remove(id);
      if (!ok) return failure("NOT_FOUND", "Order not found");
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_ORDER_FAILED", e?.message || "Failed to delete order");
    }
  }
}

export const ordersService = new OrdersService();
