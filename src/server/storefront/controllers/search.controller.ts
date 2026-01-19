import { NextRequest, NextResponse } from "next/server";
import { storefrontProductsService } from "../services/products.service";
import { storefrontCategoriesService } from "../services/categories.service";
import { storefrontCategoriesRepository } from "../repositories/categories.repository";

export class SearchController {
  /**
   * GET /api/storefront/search/suggestions
   * q?: string, limit?: number, categorySlug?: string
   */
  static async suggestions(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);
      const q = (searchParams.get("q") || "").trim();
      const limit = Math.min(12, Math.max(1, parseInt(searchParams.get("limit") || "6")));
      const categorySlug = (searchParams.get("categorySlug") || "").trim();

      // Resolve category filter if provided
      let categoryIds: string[] | undefined = undefined;
      if (categorySlug) {
        try {
          const cat = await storefrontCategoriesService.getBySlug(categorySlug);
          if (cat?.id) categoryIds = [cat.id];
        } catch {}
      }

      // Build response payload
      let products: any[] = [];
      let categories: any[] = [];

      if (q) {
        // Product suggestions: reuse list service with minimal limit
        const productCards = await storefrontProductsService.list({
          page: 1,
          limit,
          search: q,
          sortBy: "popular",
          categoryIds,
        });
        products = productCards.items.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          primaryImage: p.primaryImage,
          price: p.price,
        }));

        // Category suggestions by name
        try {
          categories = await storefrontCategoriesRepository.searchByNameLike(q, limit);
        } catch {}
      } else {
        // When query is empty: show popular categories
        try {
          const top = await storefrontCategoriesService.getTopLevel(limit);
          categories = top.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
        } catch {}
      }

      // Popular queries (stubbed for now; can be replaced with analytics aggregation)
      const popularQueries: string[] = ["dress", "abaya", "hijab", "modest", "sale"].slice(0, limit);

      return NextResponse.json({
        success: true,
        data: {
          products,
          categories,
          popularQueries,
        },
      });
    } catch (error) {
      console.error("Error in search suggestions:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to load suggestions",
          },
        },
        { status: 500 }
      );
    }
  }
}
