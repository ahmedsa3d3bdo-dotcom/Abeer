import { returnsRepository, type ListReturnParams } from "../repositories/returns.repository";
import { ordersRepository } from "../repositories/orders.repository";
import { notificationsService } from "./notifications.service";
import { success, failure, type ServiceResult } from "../types";
import { nextDocumentNumber } from "../utils/document-number";

export interface CreateReturnItemInput {
  orderItemId: string;
  quantity: number;
  reason?: string | null;
}

export interface CreateReturnInput extends Partial<Parameters<typeof returnsRepository.create>[0]> {}
export interface UpdateReturnInput extends Partial<Parameters<typeof returnsRepository.update>[1]> {}

class ReturnsService {
  async list(params: ListReturnParams): Promise<ServiceResult<{ items: any[]; total: number }>> {
    try {
      const res = await returnsRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_RETURNS_FAILED", e?.message || "Failed to list returns");
    }
  }

  async get(id: string): Promise<ServiceResult<any>> {
    try {
      const row = await returnsRepository.get(id);
      if (!row) return failure("NOT_FOUND", "Return not found");
      return success(row);
    } catch (e: any) {
      return failure("GET_RETURN_FAILED", e?.message || "Failed to get return");
    }
  }

  async create(input: CreateReturnInput): Promise<ServiceResult<any>> {
    try {
      const payload: any = { ...(input as any) };
      if (!payload.rmaNumber) {
        payload.rmaNumber = await nextDocumentNumber("RMA");
      }
      const row = await returnsRepository.create(payload as any);
      if (!row) return failure("CREATE_RETURN_FAILED", "Failed to create return");
      try {
        const order = await ordersRepository.get(row.orderId);
        const userId = (order as any)?.userId as string | undefined;
        const orderNumber = (order as any)?.orderNumber as string | undefined;
        if (userId) {
          await notificationsService.create(
            {
              userId,
              type: "order_updated" as any,
              title: "Return requested",
              message: `Your return request for order ${orderNumber || row.orderId} was created`,
              actionUrl: `/account/orders/${row.orderId}`,
            },
            { userId },
          );
        }
      } catch {}
      return success(row);
    } catch (e: any) {
      return failure("CREATE_RETURN_FAILED", e?.message || "Failed to create return");
    }
  }

  async update(id: string, patch: UpdateReturnInput): Promise<ServiceResult<any>> {
    try {
      const row = await returnsRepository.update(id, patch as any);
      if (!row) return failure("NOT_FOUND", "Return not found");
      try {
        if (patch.status) {
          const order = await ordersRepository.get(row.orderId);
          const userId = (order as any)?.userId as string | undefined;
          const orderNumber = (order as any)?.orderNumber as string | undefined;
          if (userId) {
            const status = patch.status as any;
            const title =
              status === "approved"
                ? "Return approved"
                : status === "received"
                ? "Return received"
                : status === "refunded"
                ? "Return refunded"
                : status === "rejected"
                ? "Return rejected"
                : status === "cancelled"
                ? "Return cancelled"
                : "Return updated";
            const message = `${title} for order ${orderNumber || row.orderId}`;
            await notificationsService.create(
              { userId, type: "order_updated" as any, title, message, actionUrl: `/account/orders/${row.orderId}` },
              { userId },
            );
          }
        }
      } catch {}
      return success(row);
    } catch (e: any) {
      return failure("UPDATE_RETURN_FAILED", e?.message || "Failed to update return");
    }
  }

  async remove(id: string): Promise<ServiceResult<{ id: string }>> {
    try {
      const ok = await returnsRepository.remove(id);
      if (!ok) return failure("NOT_FOUND", "Return not found");
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_RETURN_FAILED", e?.message || "Failed to delete return");
    }
  }
}

export const returnsService = new ReturnsService();
