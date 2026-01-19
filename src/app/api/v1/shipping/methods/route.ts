import type { NextRequest } from "next/server";
import { ShippingMethodsController } from "@/server/controllers/shipping_methods.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return ShippingMethodsController.list(request);
}

export async function POST(request: NextRequest) {
  return ShippingMethodsController.create(request);
}
