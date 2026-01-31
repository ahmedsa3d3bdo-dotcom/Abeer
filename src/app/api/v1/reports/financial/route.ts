import { NextRequest } from "next/server";
import { FinancialReportsController } from "@/server/controllers/financial-reports.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId } = body;

    // Route to appropriate controller method based on reportId
    // Pass the body to avoid reading it twice
    switch (reportId) {
      case "profit-loss":
        return FinancialReportsController.profitLoss(request, body);
      case "tax-report":
        return FinancialReportsController.taxReport(request, body);
      case "discount-analysis":
        return FinancialReportsController.discountAnalysis(request, body);
      case "payment-reconciliation":
        return FinancialReportsController.paymentReconciliation(request, body);
      case "refund-report":
        return FinancialReportsController.refundReport(request, body);
      case "shipping-costs":
        return FinancialReportsController.shippingCosts(request, body);
      default:
        return Response.json({ success: false, error: "Invalid report ID" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Financial reports route error:", error);
    return Response.json({ success: false, error: error.message || "Failed to generate report" }, { status: 500 });
  }
}
