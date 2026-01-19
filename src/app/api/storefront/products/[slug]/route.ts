import { NextRequest } from "next/server";
import { StorefrontProductsController } from "@/server/storefront/controllers/products.controller";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  return StorefrontProductsController.getBySlug(request, slug);
}
