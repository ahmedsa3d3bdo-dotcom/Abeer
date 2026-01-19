import type { NextRequest } from "next/server";
import { StorefrontWishlistController } from "@/server/storefront/controllers/wishlist.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  return StorefrontWishlistController.merge(request);
}
