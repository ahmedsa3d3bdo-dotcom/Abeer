import { shipmentsRepository } from "../repositories/shipments.repository";
import { ordersRepository } from "../repositories/orders.repository";
import { notificationsService } from "./notifications.service";
import { success, failure, type ServiceResult } from "../types";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";

export interface ListShipmentParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "createdAt.desc" | "createdAt.asc";
}

export interface UpdateShipmentInput {
  status?: any;
  trackingNumber?: string | null;
  carrier?: string | null;
  shippingMethodId?: string | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  estimatedDeliveryAt?: Date | null;
  notes?: string | null;
}

class ShipmentsService {
  async list(params: ListShipmentParams): Promise<ServiceResult<{ items: any[]; total: number }>> {
    try {
      const res = await shipmentsRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_SHIPMENTS_FAILED", e?.message || "Failed to list shipments");
    }
  }

  async get(id: string): Promise<ServiceResult<any>> {
    try {
      const row = await shipmentsRepository.get(id);
      if (!row) return failure("NOT_FOUND", "Shipment not found");
      return success(row);
    } catch (e: any) {
      return failure("GET_SHIPMENT_FAILED", e?.message || "Failed to get shipment");
    }
  }

  async update(id: string, patch: UpdateShipmentInput): Promise<ServiceResult<any>> {
    try {
      const before = await shipmentsRepository.get(id);
      if (!before) return failure("NOT_FOUND", "Shipment not found");

      const beforeStatus = String((before as any)?.status || "");
      const nextStatus = patch.status != null ? String(patch.status) : undefined;
      const statusChanged = Boolean(nextStatus && nextStatus !== beforeStatus);

      const updatePatch: UpdateShipmentInput = { ...patch };
      const now = new Date();
      if (statusChanged) {
        if ((nextStatus === "in_transit" || nextStatus === "out_for_delivery") && updatePatch.shippedAt === undefined) {
          updatePatch.shippedAt = (before as any)?.shippedAt || now;
        }
        if (nextStatus === "delivered" && updatePatch.deliveredAt === undefined) {
          updatePatch.deliveredAt = (before as any)?.deliveredAt || now;
          if (updatePatch.shippedAt === undefined) updatePatch.shippedAt = (before as any)?.shippedAt || now;
        }
      }

      const row = await shipmentsRepository.update(id, updatePatch);
      if (!row) return failure("NOT_FOUND", "Shipment not found");

      // Keep order status/payment in sync with shipment status
      try {
        const shipmentStatus = String((row as any)?.status || "");
        if (shipmentStatus && statusChanged) {
          const order = await ordersRepository.get(row.orderId);
          const beforeOrderStatus = String((order as any)?.status || "");
          const paymentMethod = String((order as any)?.paymentMethod || "");
          const beforePaymentStatus = String((order as any)?.paymentStatus || "");

          const orderPatch: any = {};

          if (shipmentStatus === "delivered") {
            if (beforeOrderStatus !== "delivered") orderPatch.status = "delivered";
            orderPatch.deliveredAt = (order as any)?.deliveredAt || now;
            orderPatch.shippedAt = (order as any)?.shippedAt || now;

            // COD only: paid on delivery
            if (paymentMethod === "cash_on_delivery" && beforePaymentStatus === "pending") {
              orderPatch.paymentStatus = "paid";
            }

            await db.update(schema.orders).set(orderPatch).where(eq(schema.orders.id, row.orderId as any));

            await db.insert(schema.trackingUpdates).values({
              shipmentId: row.id,
              status: "Delivered",
              description: "Your order has been delivered.",
              occurredAt: now,
            });
          } else if (shipmentStatus === "in_transit" || shipmentStatus === "out_for_delivery") {
            if (beforeOrderStatus !== "delivered" && beforeOrderStatus !== "shipped") {
              orderPatch.status = "shipped";
            }
            orderPatch.shippedAt = (order as any)?.shippedAt || now;
            await db.update(schema.orders).set(orderPatch).where(eq(schema.orders.id, row.orderId as any));

            const statusText = shipmentStatus === "out_for_delivery" ? "Out for delivery" : "Shipped";
            const descText = shipmentStatus === "out_for_delivery" ? "Your order is out for delivery." : "Your order has been shipped.";
            await db.insert(schema.trackingUpdates).values({
              shipmentId: row.id,
              status: statusText,
              description: descText,
              occurredAt: now,
            });
          }
        }
      } catch {}

      // Auto-notify customer on key shipment status transitions
      try {
        if (!statusChanged) return success(row);
        const order = await ordersRepository.get(row.orderId);
        const userId = (order as any)?.userId as string | undefined;
        const orderNumber = (order as any)?.orderNumber as string | undefined;
        const s = (row as any)?.status as string | undefined;
        if (userId && s) {
          if (s === "in_transit") {
            await notificationsService.create(
              {
                userId,
                type: "order_shipped" as any,
                title: "Order shipped",
                message: `Your order ${orderNumber || row.orderId} has been shipped`,
                actionUrl: `/account/orders/${row.orderId}`,
              },
              { userId },
            );
          } else if (s === "delivered") {
            await notificationsService.create(
              {
                userId,
                type: "order_delivered" as any,
                title: "Order delivered",
                message: `Your order ${orderNumber || row.orderId} has been delivered`,
                actionUrl: `/account/orders/${row.orderId}`,
              },
              { userId },
            );
          } else if (s === "out_for_delivery") {
            await notificationsService.create(
              {
                userId,
                type: "order_updated" as any,
                title: "Out for delivery",
                message: `Your order ${orderNumber || row.orderId} is out for delivery`,
                actionUrl: `/account/orders/${row.orderId}`,
              },
              { userId },
            );
          }
        }
      } catch {}
      return success(row);
    } catch (e: any) {
      return failure("UPDATE_SHIPMENT_FAILED", e?.message || "Failed to update shipment");
    }
  }

  async remove(id: string): Promise<ServiceResult<{ id: string }>> {
    try {
      const ok = await shipmentsRepository.remove(id);
      if (!ok) return failure("NOT_FOUND", "Shipment not found");
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_SHIPMENT_FAILED", e?.message || "Failed to delete shipment");
    }
  }
}

export const shipmentsService = new ShipmentsService();
