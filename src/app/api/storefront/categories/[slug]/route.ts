import { NextRequest } from "next/server";
import { StorefrontCategoriesController } from "@/server/storefront/controllers/categories.controller";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  return StorefrontCategoriesController.getBySlug(request, slug);
}
