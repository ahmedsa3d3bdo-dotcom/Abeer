import { discountsRepository, type ListDiscountParams } from "../repositories/discounts.repository";
import { success, failure, type ServiceResult } from "../types";

export interface CreateDiscountInput extends Partial<Parameters<typeof discountsRepository.create>[0]> {}
export interface UpdateDiscountInput extends Partial<Parameters<typeof discountsRepository.update>[1]> {}

class DiscountsService {
  async list(params: ListDiscountParams): Promise<ServiceResult<{ items: any[]; total: number }>> {
    try {
      const res = await discountsRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_DISCOUNTS_FAILED", e?.message || "Failed to list discounts");
    }
  }

  async get(id: string): Promise<ServiceResult<any>> {
    try {
      const row = await discountsRepository.get(id);
      if (!row) return failure("NOT_FOUND", "Discount not found");
      return success(row);
    } catch (e: any) {
      return failure("GET_DISCOUNT_FAILED", e?.message || "Failed to get discount");
    }
  }

  async create(input: CreateDiscountInput): Promise<ServiceResult<any>> {
    try {
      const row = await discountsRepository.create(input as any);
      if (!row) return failure("CREATE_DISCOUNT_FAILED", "Failed to create discount");
      return success(row);
    } catch (e: any) {
      return failure("CREATE_DISCOUNT_FAILED", e?.message || "Failed to create discount");
    }
  }

  async update(id: string, patch: UpdateDiscountInput): Promise<ServiceResult<any>> {
    try {
      const row = await discountsRepository.update(id, patch as any);
      if (!row) return failure("NOT_FOUND", "Discount not found");
      return success(row);
    } catch (e: any) {
      return failure("UPDATE_DISCOUNT_FAILED", e?.message || "Failed to update discount");
    }
  }

  async remove(id: string): Promise<ServiceResult<{ id: string }>> {
    try {
      const ok = await discountsRepository.remove(id);
      if (!ok) return failure("NOT_FOUND", "Discount not found");
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_DISCOUNT_FAILED", e?.message || "Failed to delete discount");
    }
  }
}

export const discountsService = new DiscountsService();
