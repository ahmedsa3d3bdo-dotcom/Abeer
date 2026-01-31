import { NextRequest } from "next/server";
import { CustomersReportsController } from "@/server/controllers/customers-reports.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId } = body;

    // Route to appropriate controller method based on reportId
    // Pass the body to avoid reading it twice
    switch (reportId) {
      case "customer-list":
        return CustomersReportsController.list(request, body);
      case "customer-ltv":
        return CustomersReportsController.ltv(request, body);
      case "customer-acquisition":
        return CustomersReportsController.acquisition(request, body);
      case "customer-segments":
        return CustomersReportsController.segments(request, body);
      case "geographic-distribution":
        return CustomersReportsController.geographic(request, body);
      default:
        return Response.json({ success: false, error: "Invalid report ID" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Customers reports route error:", error);
    return Response.json({ success: false, error: error.message || "Failed to generate report" }, { status: 500 });
  }
}
