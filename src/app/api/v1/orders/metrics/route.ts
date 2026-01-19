import type { NextRequest } from "next/server";
import { OrdersController } from "@/server/controllers/orders.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return OrdersController.metrics(request);
}
