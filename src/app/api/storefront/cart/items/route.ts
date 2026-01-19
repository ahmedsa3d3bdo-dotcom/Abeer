import { NextRequest } from "next/server";
import { StorefrontCartController } from "@/server/storefront/controllers/cart.controller";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return StorefrontCartController.addItem(request);
}

export async function PATCH(request: NextRequest) {
  return StorefrontCartController.updateItem(request);
}

export async function DELETE(request: NextRequest) {
  return StorefrontCartController.removeItem(request);
}
