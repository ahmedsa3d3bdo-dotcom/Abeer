import { NextRequest, NextResponse } from "next/server";
import { storefrontProductsService } from "../services/products.service";

/**
 * Storefront Products Controller
 * Handles HTTP requests for product endpoints
 */

export class StorefrontProductsController {
  /**
   * GET /api/storefront/products
   * List products with filters
   */
  static async list(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);

      // Collect category IDs from repeated `categoryId` params or comma-separated `categoryIds`
      const catRepeated = searchParams.getAll("categoryId").filter(Boolean);
      const catCsv = (searchParams.get("categoryIds") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const categoryIds = Array.from(new Set([...catRepeated, ...catCsv]));

      const params = {
        page: parseInt(searchParams.get("page") || "1"),
        limit: parseInt(searchParams.get("limit") || "12"),
        categoryIds: categoryIds.length ? categoryIds : undefined,
        minPrice: searchParams.get("minPrice")
          ? parseFloat(searchParams.get("minPrice")!)
          : undefined,
        maxPrice: searchParams.get("maxPrice")
          ? parseFloat(searchParams.get("maxPrice")!)
          : undefined,
        minRating: searchParams.get("minRating")
          ? parseFloat(searchParams.get("minRating")!)
          : undefined,
        search: searchParams.get("q") || searchParams.get("search") || undefined,
        inStock: searchParams.get("inStock") === "true",
        onSale: searchParams.get("onSale") === "true",
        sortBy: (searchParams.get("sortBy") as any) || "newest",
      };

      const result = await storefrontProductsService.list(params);

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error listing products:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to list products",
          },
        },
        { status: 500 }
      );
    }
  }

  /**
   * GET /api/storefront/products/[slug]
   * Get product details by slug
   */
  static async getBySlug(request: NextRequest, slug: string) {
    try {
      const product = await storefrontProductsService.getBySlug(slug);

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Product not found",
              code: "PRODUCT_NOT_FOUND",
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: product,
      });
    } catch (error) {
      console.error("Error getting product:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to get product",
          },
        },
        { status: 500 }
      );
    }
  }

  /**
   * GET /api/storefront/products/featured
   * Get featured products
   */
  static async getFeatured(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get("limit") || "8");

      const products = await storefrontProductsService.getFeatured(limit);

      return NextResponse.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error("Error getting featured products:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to get featured products",
          },
        },
        { status: 500 }
      );
    }
  }

  /**
   * GET /api/storefront/products/trending
   * Get trending products
   */
  static async getTrending(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get("limit") || "8");

      const products = await storefrontProductsService.getTrending(limit);

      return NextResponse.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error("Error getting trending products:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to get trending products",
          },
        },
        { status: 500 }
      );
    }
  }

  /**
   * GET /api/storefront/products/[id]/related
   * Get related products
   */
  static async getRelated(request: NextRequest, productId: string) {
    try {
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get("limit") || "4");

      const products = await storefrontProductsService.getRelated(productId, limit);

      return NextResponse.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error("Error getting related products:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to get related products",
          },
        },
        { status: 500 }
      );
    }
  }
}
