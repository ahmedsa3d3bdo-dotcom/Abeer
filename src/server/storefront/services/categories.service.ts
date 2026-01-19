import { storefrontCategoriesRepository } from "../repositories/categories.repository";
import type { Category } from "@/types/storefront";

/**
 * Storefront Categories Service
 * Business logic for customer-facing category operations
 */

export class StorefrontCategoriesService {
  /**
   * Get category tree for navigation
   */
  async getTree(): Promise<Category[]> {
    const categories = await storefrontCategoriesRepository.getTree();
    return categories as Category[];
  }

  /**
   * Get category by slug with subcategories
   */
  async getBySlug(slug: string) {
    const category = await storefrontCategoriesRepository.getBySlug(slug);

    if (!category) {
      return null;
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || undefined,
      image: category.image || undefined,
      parentId: category.parentId || undefined,
      productCount: category.productCount,
      children: category.subcategories,
    };
  }

  /**
   * Get top-level categories for homepage
   */
  async getTopLevel(limit = 8) {
    const categories = await storefrontCategoriesRepository.getTopLevel(limit);

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || undefined,
      image: cat.image || undefined,
      productCount: cat.productCount,
    }));
  }
}

export const storefrontCategoriesService = new StorefrontCategoriesService();
