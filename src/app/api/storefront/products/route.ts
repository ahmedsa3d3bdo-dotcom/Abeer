import { NextRequest } from "next/server";
import { StorefrontProductsController } from "@/server/storefront/controllers/products.controller";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return StorefrontProductsController.list(request);
}
