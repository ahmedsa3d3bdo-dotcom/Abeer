import { categoriesRepository } from "../repositories/categories.repository";
import { success, failure, type ServiceResult } from "../types";

export interface ListCategoryParams {
  page?: number;
  limit?: number;
  q?: string;
  isActive?: boolean;
  parentId?: string | null;
  sort?: "createdAt.desc" | "createdAt.asc";
}

export interface UpsertCategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

class CategoriesService {
  async list(params: ListCategoryParams): Promise<ServiceResult<{ items: any[]; total: number }>> {
    try {
      const res = await categoriesRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_CATEGORIES_FAILED", e?.message || "Failed to list categories");
    }
  }

  async get(id: string): Promise<ServiceResult<any>> {
    try {
      const row = await categoriesRepository.get(id);
      if (!row) return failure("NOT_FOUND", "Category not found");
      return success(row);
    } catch (e: any) {
      return failure("GET_CATEGORY_FAILED", e?.message || "Failed to get category");
    }
  }

  async create(input: UpsertCategoryInput): Promise<ServiceResult<any>> {
    try {
      const row = await categoriesRepository.create(input);
      return success(row);
    } catch (e: any) {
      return failure("CREATE_CATEGORY_FAILED", e?.message || "Failed to create category");
    }
  }

  async update(id: string, patch: UpsertCategoryInput): Promise<ServiceResult<any>> {
    try {
      const row = await categoriesRepository.update(id, patch);
      if (!row) return failure("NOT_FOUND", "Category not found");
      return success(row);
    } catch (e: any) {
      return failure("UPDATE_CATEGORY_FAILED", e?.message || "Failed to update category");
    }
  }

  async remove(id: string): Promise<ServiceResult<{ id: string }>> {
    try {
      const ok = await categoriesRepository.remove(id);
      if (!ok) return failure("NOT_FOUND", "Category not found");
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_CATEGORY_FAILED", e?.message || "Failed to delete category");
    }
  }
}

export const categoriesService = new CategoriesService();
