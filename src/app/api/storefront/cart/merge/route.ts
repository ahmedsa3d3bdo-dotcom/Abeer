import { NextRequest } from "next/server";
import { StorefrontCartController } from "@/server/storefront/controllers/cart.controller";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return StorefrontCartController.mergeCart(request);
}
