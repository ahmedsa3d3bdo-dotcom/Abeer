import { productsRepository } from "../repositories/products.repository";
import { success, failure, type ServiceResult } from "../types";
import { storefrontWishlistRepository } from "../storefront/repositories/wishlist.repository";
import { notificationsService } from "./notifications.service";
import { preferencesRepository } from "../storefront/repositories/preferences.repository";

export interface ListProductParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  stockStatus?: string;
  isFeatured?: boolean;
  onSale?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sort?: "createdAt.desc" | "createdAt.asc";
}

export interface UpsertProductInput {
  name: string;
  slug?: string;
  sku?: string | null;
  serialNumber?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  specMaterial?: string | null;
  specColor?: string | null;
  specDimensions?: string | null;
  specStyle?: string | null;
  specIdealFor?: string | null;
  price: string;
  costPerItem?: string | null;
  compareAtPrice?: string | null;
  status?: any;
  stockStatus?: any;
  trackInventory?: boolean;
  isFeatured?: boolean;
  allowReviews?: boolean;
  publishedAt?: Date | null;
  categoryIds?: string[];
  stockQuantity?: number;
  addStockQuantity?: number;
}

class ProductsService {
  async list(params: ListProductParams): Promise<ServiceResult<{ items: any[]; total: number }>> {
    try {
      const res = await productsRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_PRODUCTS_FAILED", e?.message || "Failed to list products");
    }
  }

  async get(id: string): Promise<ServiceResult<any>> {
    try {
      const row = await productsRepository.get(id);
      if (!row) return failure("NOT_FOUND", "Product not found");
      return success(row);
    } catch (e: any) {
      return failure("GET_PRODUCT_FAILED", e?.message || "Failed to get product");
    }
  }

  async create(input: UpsertProductInput): Promise<ServiceResult<any>> {
    try {
      const row = await productsRepository.create(input);
      return success(row);
    } catch (e: any) {
      return failure("CREATE_PRODUCT_FAILED", e?.message || "Failed to create product");
    }
  }

  async update(id: string, patch: UpsertProductInput): Promise<ServiceResult<any>> {
    try {
      const before = await productsRepository.get(id);
      const row = await productsRepository.update(id, patch);
      if (!row) return failure("NOT_FOUND", "Product not found");
      try {
        if (before) {
          const oldPrice = before?.price ? parseFloat(before.price as any) : NaN;
          const newPrice = row?.price ? parseFloat(row.price as any) : NaN;
          const priceDropped = Number.isFinite(oldPrice) && Number.isFinite(newPrice) && newPrice < oldPrice;
          const oldStock = (before as any)?.stockStatus as string | undefined;
          const newStock = (row as any)?.stockStatus as string | undefined;
          const backInStock = newStock === "in_stock" && oldStock !== "in_stock";
          if (priceDropped || backInStock) {
            const watchersAll: string[] = await storefrontWishlistRepository.listUserIdsByProduct(id);
            const watchers: string[] = priceDropped
              ? await preferencesRepository.listEnabledUserIds("priceDrop", watchersAll)
              : await preferencesRepository.listEnabledUserIds("backInStock", watchersAll);
            if (watchers.length) {
              const url = `/product/${row.slug || before.slug || ""}`;
              const title = priceDropped ? "Price drop" : "Back in stock";
              const message = priceDropped
                ? `${row.name || "Product"} is now ${newPrice.toFixed(2)} (was ${oldPrice.toFixed(2)})`
                : `${row.name || "Product"} is back in stock`;
              await notificationsService.sendToUsers(
                { userIds: watchers, type: "promotional" as any, title, message, actionUrl: url, metadata: { productId: id } },
                undefined,
              );
            }
          }
        }
      } catch {}
      return success(row);
    } catch (e: any) {
      return failure("UPDATE_PRODUCT_FAILED", e?.message || "Failed to update product");
    }
  }

  async remove(id: string): Promise<ServiceResult<{ id: string }>> {
    try {
      const ok = await productsRepository.remove(id);
      if (!ok) return failure("NOT_FOUND", "Product not found");
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_PRODUCT_FAILED", e?.message || "Failed to delete product");
    }
  }

  // ============== MEDIA ==============
  async listImages(productId: string): Promise<ServiceResult<any[]>> {
    try {
      const rows = await productsRepository.listImages(productId);
      return success(rows);
    } catch (e: any) {
      return failure("LIST_PRODUCT_IMAGES_FAILED", e?.message || "Failed to list product images");
    }
  }

  async addImages(productId: string, items: Array<{ url: string; altText?: string | null }>): Promise<ServiceResult<any[]>> {
    try {
      const rows = await productsRepository.addImages(productId, items);
      return success(rows);
    } catch (e: any) {
      return failure("ADD_PRODUCT_IMAGES_FAILED", e?.message || "Failed to add product images");
    }
  }

  async updateImage(productId: string, imageId: string, patch: Partial<{ altText: string | null; isPrimary: boolean; sortOrder: number }>): Promise<ServiceResult<any>> {
    try {
      const row = await productsRepository.updateImage(productId, imageId, patch);
      if (!row) return failure("NOT_FOUND", "Image not found");
      return success(row);
    } catch (e: any) {
      return failure("UPDATE_PRODUCT_IMAGE_FAILED", e?.message || "Failed to update product image");
    }
  }

  async removeImage(productId: string, imageId: string): Promise<ServiceResult<{ id: string; url: string | null }>> {
    try {
      const res = await productsRepository.removeImage(productId, imageId);
      if (!res.ok) return failure("NOT_FOUND", "Image not found");
      return success({ id: imageId, url: res.url });
    } catch (e: any) {
      return failure("DELETE_PRODUCT_IMAGE_FAILED", e?.message || "Failed to delete product image");
    }
  }
}

export const productsService = new ProductsService();
