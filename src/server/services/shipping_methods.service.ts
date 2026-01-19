import { shippingMethodsRepository } from "../repositories/shipping_methods.repository";
import { success, failure, type ServiceResult } from "../types";

export interface ListShippingMethodParams {
  page?: number;
  limit?: number;
  q?: string;
  isActive?: boolean;
  sort?: "createdAt.desc" | "createdAt.asc";
}

export interface UpsertShippingMethodInput {
  name: string;
  code: string;
  description?: string | null;
  carrier?: string | null;
  price: string;
  estimatedDays?: number | null;
  isActive?: boolean;
  sortOrder?: number;
}

class ShippingMethodsService {
  async list(params: ListShippingMethodParams): Promise<ServiceResult<{ items: any[]; total: number }>> {
    try {
      const res = await shippingMethodsRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_SHIPPING_METHODS_FAILED", e?.message || "Failed to list shipping methods");
    }
  }

  async get(id: string): Promise<ServiceResult<any>> {
    try {
      const row = await shippingMethodsRepository.get(id);
      if (!row) return failure("NOT_FOUND", "Shipping method not found");
      return success(row);
    } catch (e: any) {
      return failure("GET_SHIPPING_METHOD_FAILED", e?.message || "Failed to get shipping method");
    }
  }

  async create(input: UpsertShippingMethodInput): Promise<ServiceResult<any>> {
    try {
      const row = await shippingMethodsRepository.create(input);
      return success(row);
    } catch (e: any) {
      return failure("CREATE_SHIPPING_METHOD_FAILED", e?.message || "Failed to create shipping method");
    }
  }

  async update(id: string, patch: UpsertShippingMethodInput): Promise<ServiceResult<any>> {
    try {
      const row = await shippingMethodsRepository.update(id, patch);
      if (!row) return failure("NOT_FOUND", "Shipping method not found");
      return success(row);
    } catch (e: any) {
      return failure("UPDATE_SHIPPING_METHOD_FAILED", e?.message || "Failed to update shipping method");
    }
  }

  async remove(id: string): Promise<ServiceResult<{ id: string }>> {
    try {
      const ok = await shippingMethodsRepository.remove(id);
      if (!ok) return failure("NOT_FOUND", "Shipping method not found");
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_SHIPPING_METHOD_FAILED", e?.message || "Failed to delete shipping method");
    }
  }
}

export const shippingMethodsService = new ShippingMethodsService();
