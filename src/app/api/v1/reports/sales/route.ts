import { NextRequest } from "next/server";
import { SalesReportsController } from "@/server/controllers/sales-reports.controller";

/**
 * Sales Reports API Route
 * Handles all 6 sales report types via reportId parameter
 * 
 * Supported reportIds:
 * - daily-summary: Day-by-day sales breakdown
 * - weekly-report: Weekly aggregation with ISO week numbers
 * - monthly-report: Monthly trends with new customers
 * - order-details: Complete order list with full breakdown
 * - revenue-by-product: Product-level profit analysis
 * - revenue-by-category: Category performance with market share
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId } = body;

    // Route to appropriate controller method based on reportId
    // Pass the body to avoid reading it twice
    switch (reportId) {
      case "daily-summary":
        return SalesReportsController.dailySummary(request, body);
      
      case "weekly-report":
        return SalesReportsController.weeklyReport(request, body);
      
      case "monthly-report":
        return SalesReportsController.monthlyReport(request, body);
      
      case "order-details":
        return SalesReportsController.orderDetails(request, body);
      
      case "revenue-by-product":
        return SalesReportsController.revenueByProduct(request, body);
      
      case "revenue-by-category":
        return SalesReportsController.revenueByCategory(request, body);
      
      default:
        return Response.json(
          { 
            success: false, 
            error: "Invalid report ID. Supported: daily-summary, weekly-report, monthly-report, order-details, revenue-by-product, revenue-by-category" 
          },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Sales reports route error:", error);
    return Response.json(
      { success: false, error: error.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}
