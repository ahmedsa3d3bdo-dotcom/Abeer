import type { NextRequest } from "next/server";
import { SystemMetricsController } from "@/server/controllers/system-metrics.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return SystemMetricsController.series(request);
}

export async function POST(request: NextRequest) {
  return SystemMetricsController.collect(request);
}
