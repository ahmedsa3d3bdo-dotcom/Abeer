import type { NextRequest } from "next/server";
import { RefundsController } from "@/server/controllers/refunds.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return RefundsController.metrics(request);
}
