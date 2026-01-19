import type { NextRequest } from "next/server";
import { HealthController } from "@/server/controllers/health.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  return HealthController.runNow(request);
}
