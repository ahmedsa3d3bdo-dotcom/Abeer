import type { NextRequest } from "next/server";
import { ShipmentsController } from "@/server/controllers/shipments.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return ShipmentsController.list(request);
}
