import { refundsRepository, type ListRefundParams } from "../repositories/refunds.repository";
import { ordersRepository } from "../repositories/orders.repository";
import { notificationsService } from "./notifications.service";
import { success, failure, type ServiceResult } from "../types";
import { nextDocumentNumber } from "../utils/document-number";

export interface CreateRefundItemInput {
  orderItemId: string;
  quantity: number;
  amount: string;
  reason?: string | null;
}

export interface CreateRefundInput extends Partial<Parameters<typeof refundsRepository.create>[0]> {}
export interface UpdateRefundInput extends Partial<Parameters<typeof refundsRepository.update>[1]> {}

class RefundsService {
  async list(params: ListRefundParams): Promise<ServiceResult<{ items: any[]; total: number }>> {
    try {
      const res = await refundsRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_REFUNDS_FAILED", e?.message || "Failed to list refunds");
    }
  }

  async get(id: string): Promise<ServiceResult<any>> {
    try {
      const row = await refundsRepository.get(id);
      if (!row) return failure("NOT_FOUND", "Refund not found");
      return success(row);
    } catch (e: any) {
      return failure("GET_REFUND_FAILED", e?.message || "Failed to get refund");
    }
  }

  async create(input: CreateRefundInput): Promise<ServiceResult<any>> {
    try {
      const payload: any = { ...(input as any) };
      if (!payload.refundNumber) {
        payload.refundNumber = await nextDocumentNumber("REF");
      }
      const row = await refundsRepository.create(payload as any);
      if (!row) return failure("CREATE_REFUND_FAILED", "Failed to create refund");
      try {
        const order = await ordersRepository.get(row.orderId);
        const userId = (order as any)?.userId as string | undefined;
        const orderNumber = (order as any)?.orderNumber as string | undefined;
        if (userId) {
          await notificationsService.create(
            {
              userId,
              type: "order_updated" as any,
              title: "Refund requested",
              message: `Your refund request for order ${orderNumber || row.orderId} was created` as any,
              actionUrl: `/account/orders/${row.orderId}`,
            },
            { userId },
          );
        }
      } catch {}
      return success(row);
    } catch (e: any) {
      return failure("CREATE_REFUND_FAILED", e?.message || "Failed to create refund");
    }
  }

  async update(id: string, patch: UpdateRefundInput): Promise<ServiceResult<any>> {
    try {
      const row = await refundsRepository.update(id, patch as any);
      if (!row) return failure("NOT_FOUND", "Refund not found");
      try {
        if (patch.status) {
          const order = await ordersRepository.get(row.orderId);
          const userId = (order as any)?.userId as string | undefined;
          const orderNumber = (order as any)?.orderNumber as string | undefined;
          if (userId) {
            const status = patch.status as any;
            const title = status === "approved" ? "Refund approved" : status === "processed" ? "Refund processed" : status === "rejected" ? "Refund rejected" : "Refund updated";
            const message =
              status === "approved"
                ? `Your refund for order ${orderNumber || row.orderId} was approved`
                : status === "processed"
                ? `Your refund for order ${orderNumber || row.orderId} has been processed`
                : status === "rejected"
                ? `Your refund for order ${orderNumber || row.orderId} was rejected`
                : `Your refund for order ${orderNumber || row.orderId} was updated`;
            await notificationsService.create(
              { userId, type: "order_updated" as any, title, message, actionUrl: `/account/orders/${row.orderId}` },
              { userId },
            );
          }
        }
      } catch {}
      return success(row);
    } catch (e: any) {
      return failure("UPDATE_REFUND_FAILED", e?.message || "Failed to update refund");
    }
  }

  async remove(id: string): Promise<ServiceResult<{ id: string }>> {
    try {
      const ok = await refundsRepository.remove(id);
      if (!ok) return failure("NOT_FOUND", "Refund not found");
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_REFUND_FAILED", e?.message || "Failed to delete refund");
    }
  }
}

export const refundsService = new RefundsService();
