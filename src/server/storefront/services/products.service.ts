import { storefrontProductsRepository } from "../repositories/products.repository";
import type { ProductCard, Product, PaginatedResponse } from "@/types/storefront";

/**
 * Storefront Products Service
 * Business logic for customer-facing product operations
 */

interface ProductListParams {
  page?: number;
  limit?: number;
  categoryIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  search?: string;
  inStock?: boolean;
  onSale?: boolean;
  sortBy?: "price_asc" | "price_desc" | "name" | "newest" | "rating" | "popular";
}

export class StorefrontProductsService {
  /**
   * List products with filters and pagination
   */
  async list(params: ProductListParams): Promise<PaginatedResponse<ProductCard>> {
    const result = await storefrontProductsRepository.list(params);

    // Transform to ProductCard format
    const items: ProductCard[] = result.items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: parseFloat(item.price),
      compareAtPrice: item.compareAtPrice
        ? parseFloat(item.compareAtPrice)
        : undefined,
      primaryImage: item.primaryImageUrl || "/placeholder-product.svg",
      images: item.primaryImageUrl ? [item.primaryImageUrl] : [],
      rating: Number(item.rating ?? 0),
      reviewCount: Number(item.reviewCount ?? 0),
      stockStatus: item.stockStatus,
      isFeatured: item.isFeatured,
      badge: this.determineBadge(item),
    }));

    return {
      items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    };
  }

  /**
   * Get product details by slug
   */
  async getBySlug(slug: string): Promise<Product | null> {
    const product = await storefrontProductsRepository.getBySlug(slug);

    if (!product) {
      return null;
    }

    // Increment view count asynchronously
    void storefrontProductsRepository.incrementViewCount(product.id);

    // Transform to Product format
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku || product.id, // Fallback to ID if SKU is null
      serialNumber: (product as any).serialNumber || undefined,
      specMaterial: (product as any).specMaterial || undefined,
      specColor: (product as any).specColor || undefined,
      specDimensions: (product as any).specDimensions || undefined,
      specStyle: (product as any).specStyle || undefined,
      specIdealFor: (product as any).specIdealFor || undefined,
      description: product.description || "",
      shortDescription: product.shortDescription || "",
      price: parseFloat(product.price),
      compareAtPrice: product.compareAtPrice
        ? parseFloat(product.compareAtPrice)
        : undefined,
      images: product.images.map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.altText || undefined,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        name: variant.name || "",
        price: parseFloat(variant.price),
        stockQuantity: variant.stockQuantity,
        options: variant.options as Record<string, string>,
        image: variant.image || undefined,
        isActive: variant.isActive,
      })),
      categories: product.categories,
      status: product.status,
      stockStatus: product.stockStatus,
      averageRating: product.averageRating ? parseFloat(product.averageRating) : 0,
      reviewCount: product.reviewCount,
      isFeatured: false, // Not included in detail query
      metaTitle: product.metaTitle || undefined,
      metaDescription: product.metaDescription || undefined,
    };
  }

  /**
   * Get featured products
   */
  async getFeatured(limit = 8): Promise<ProductCard[]> {
    const items = await storefrontProductsRepository.getFeatured(limit);

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: parseFloat(item.price),
      compareAtPrice: item.compareAtPrice
        ? parseFloat(item.compareAtPrice)
        : undefined,
      primaryImage: item.primaryImageUrl || "/placeholder-product.svg",
      images: item.primaryImageUrl ? [item.primaryImageUrl] : [],
      rating: Number(item.rating ?? 0),
      reviewCount: Number(item.reviewCount ?? 0),
      stockStatus: item.stockStatus,
      isFeatured: item.isFeatured,
      badge: this.determineBadge(item),
    }));
  }

  /**
   * Get trending products
   */
  async getTrending(limit = 8): Promise<ProductCard[]> {
    const items = await storefrontProductsRepository.getTrending(limit);

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: parseFloat(item.price),
      compareAtPrice: item.compareAtPrice
        ? parseFloat(item.compareAtPrice)
        : undefined,
      primaryImage: item.primaryImageUrl || "/placeholder-product.svg",
      images: item.primaryImageUrl ? [item.primaryImageUrl] : [],
      rating: Number(item.rating ?? 0),
      reviewCount: Number(item.reviewCount ?? 0),
      stockStatus: item.stockStatus,
      isFeatured: item.isFeatured,
      badge: this.determineBadge(item),
    }));
  }

  /**
   * Get related products
   */
  async getRelated(productId: string, limit = 4): Promise<ProductCard[]> {
    const items = await storefrontProductsRepository.getRelated(productId, limit);

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: parseFloat(item.price),
      compareAtPrice: item.compareAtPrice
        ? parseFloat(item.compareAtPrice)
        : undefined,
      primaryImage: item.primaryImageUrl || "/placeholder-product.svg",
      images: item.primaryImageUrl ? [item.primaryImageUrl] : [],
      rating: Number(item.rating ?? 0),
      reviewCount: Number(item.reviewCount ?? 0),
      stockStatus: item.stockStatus,
      isFeatured: item.isFeatured,
      badge: this.determineBadge(item),
    }));
  }

  /**
   * Determine badge type for product
   */
  private determineBadge(
    item: any
  ): "new" | "sale" | "low-stock" | undefined {
    // Check if on sale
    if (item.compareAtPrice && parseFloat(item.compareAtPrice) > parseFloat(item.price)) {
      return "sale";
    }

    // Check if low stock
    if (item.stockStatus === "low_stock") {
      return "low-stock";
    }

    // Check if new (created in last 30 days)
    // This would need createdAt field from the query
    // For now, we'll skip this

    return undefined;
  }
}

export const storefrontProductsService = new StorefrontProductsService();
