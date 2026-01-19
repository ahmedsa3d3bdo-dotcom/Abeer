import { NextRequest } from "next/server";
import { StorefrontCategoriesController } from "@/server/storefront/controllers/categories.controller";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return StorefrontCategoriesController.getTree(request);
}
