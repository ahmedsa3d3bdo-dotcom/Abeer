import { NextRequest, NextResponse } from "next/server";
import { storefrontCategoriesService } from "../services/categories.service";

/**
 * Storefront Categories Controller
 * Handles HTTP requests for category endpoints
 */

export class StorefrontCategoriesController {
  /**
   * GET /api/storefront/categories
   * Get category tree
   */
  static async getTree(request: NextRequest) {
    try {
      const categories = await storefrontCategoriesService.getTree();

      return NextResponse.json({
        success: true,
        data: { categories },
      });
    } catch (error) {
      console.error("Error getting categories:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to get categories",
          },
        },
        { status: 500 }
      );
    }
  }

  /**
   * GET /api/storefront/categories/[slug]
   * Get category by slug
   */
  static async getBySlug(request: NextRequest, slug: string) {
    try {
      const category = await storefrontCategoriesService.getBySlug(slug);

      if (!category) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Category not found",
              code: "CATEGORY_NOT_FOUND",
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error("Error getting category:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to get category",
          },
        },
        { status: 500 }
      );
    }
  }

  /**
   * GET /api/storefront/categories/top
   * Get top-level categories
   */
  static async getTopLevel(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get("limit") || "8");

      const categories = await storefrontCategoriesService.getTopLevel(limit);

      return NextResponse.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("Error getting top-level categories:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to get categories",
          },
        },
        { status: 500 }
      );
    }
  }
}
