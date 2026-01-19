import { NextRequest, NextResponse } from "next/server";
import { recommendationsService } from "../services/recommendations.service";

/**
 * Storefront Recommendations Controller
 */
export class RecommendationsController {
  /**
   * GET /api/storefront/recommendations
   * Query: context=product|cart|user, productId?, limit?
   */
  static async list(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);
      const context = (searchParams.get("context") || "cart").toLowerCase();
      const limit = Math.min(12, Math.max(1, parseInt(searchParams.get("limit") || "6")));

      if (context === "product") {
        const productId = searchParams.get("productId") || undefined;
        if (!productId) {
          return NextResponse.json(
            { success: false, error: { message: "productId is required for product context", code: "BAD_REQUEST" } },
            { status: 400 }
          );
        }
        const items = await recommendationsService.forProduct(productId, limit);
        return NextResponse.json({ success: true, data: items });
      }

      if (context === "user") {
        const items = await recommendationsService.forUser(limit);
        return NextResponse.json({ success: true, data: items });
      }

      // Default: cart context (read from cookie)
      const cartId = request.cookies.get("cart_id")?.value;
      const items = await recommendationsService.forCart(cartId, limit);
      return NextResponse.json({ success: true, data: items });
    } catch (error) {
      console.error("Error getting recommendations:", error);
      return NextResponse.json(
        { success: false, error: { message: error instanceof Error ? error.message : "Failed to get recommendations" } },
        { status: 500 }
      );
    }
  }
}
