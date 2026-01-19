import type { NextRequest } from "next/server";
import { DashboardController } from "@/server/controllers/dashboard.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return DashboardController.revenueByPayment(request);
}
