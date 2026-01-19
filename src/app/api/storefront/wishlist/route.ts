import { StorefrontWishlistController } from "@/server/storefront/controllers/wishlist.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  return StorefrontWishlistController.list();
}

export async function DELETE() {
  return StorefrontWishlistController.clear();
}
