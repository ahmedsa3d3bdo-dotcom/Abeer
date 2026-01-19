import { NextRequest } from "next/server";
import { StorefrontCartController } from "@/server/storefront/controllers/cart.controller";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return StorefrontCartController.get(request);
}
