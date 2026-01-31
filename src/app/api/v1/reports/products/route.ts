import { NextRequest } from "next/server";
import { ProductsReportsController } from "@/server/controllers/products-reports.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId } = body;

    // Route to appropriate controller method based on reportId
    // Pass the body to avoid reading it twice
    switch (reportId) {
      case "product-catalog":
        return ProductsReportsController.catalog(request, body);
      
      case "inventory-levels":
        return ProductsReportsController.inventoryLevels(request, body);
      
      case "low-stock-alert":
        return ProductsReportsController.lowStockAlert(request, body);
      
      case "product-performance":
        return ProductsReportsController.performance(request, body);
      
      case "category-breakdown":
        return ProductsReportsController.categoryBreakdown(request, body);
      
      default:
        return Response.json(
          { success: false, error: "Invalid report ID" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Products reports route error:", error);
    return Response.json(
      { success: false, error: error.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}
