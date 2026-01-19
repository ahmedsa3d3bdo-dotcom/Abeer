import type { NextRequest } from "next/server";
import { ProductsController } from "@/server/controllers/products.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return ProductsController.metrics(request);
}
