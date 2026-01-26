import { NextRequest, NextResponse } from "next/server";
import { storefrontProductsService } from "../services/products.service";
import { storefrontOffersService } from "../services/offers.service";
import { storefrontProductsRepository } from "../repositories/products.repository";

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

      // Optional explicit product ID filter (used by recently-viewed, etc.)
      const productIdRepeated = searchParams.getAll("productId").filter(Boolean);
      const productIdCsv = (searchParams.get("productIds") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const requestedProductIds = Array.from(new Set([...productIdRepeated, ...productIdCsv]));

      const onSaleRequested = searchParams.get("onSale") === "true";

      let saleProductIds: string[] | undefined;
      if (onSaleRequested) {
        try {
          const [promos, compareAtSaleIds] = await Promise.all([
            storefrontOffersService.listActiveDisplayPromotions(),
            storefrontProductsRepository.listCompareAtSaleProductIds(),
          ]);
          const promoIds = promos.flatMap((p) => (Array.isArray(p.productIds) ? p.productIds : []));
          const set = new Set<string>([...compareAtSaleIds, ...promoIds].map(String).filter(Boolean));
          saleProductIds = Array.from(set);
        } catch {}
      }

      const offerId = searchParams.get("offerId") || undefined;
      let offerProductIds: string[] | undefined;
      if (offerId) {
        try {
          const offers = await storefrontOffersService.listActiveDisplayPromotions();
          const offer = offers.find((o) => String(o.id) === String(offerId));
          if (offer?.productIds?.length) offerProductIds = offer.productIds;
        } catch {}
      }

      const intersect = (a: string[], b: string[]) => {
        const set = new Set(b.map(String));
        return a.filter((x) => set.has(String(x)));
      };

      let productIds: string[] | undefined = requestedProductIds.length ? requestedProductIds : undefined;
      if (offerProductIds?.length) {
        productIds = productIds ? intersect(productIds, offerProductIds) : offerProductIds;
      }
      if (saleProductIds?.length) {
        productIds = productIds ? intersect(productIds, saleProductIds) : saleProductIds;
      }
      if (productIds && productIds.length === 0) {
        productIds = ["__none__"];
      }

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
        productIds,
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
        onSale: onSaleRequested && !saleProductIds ? true : false,
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
