import type { NextRequest } from "next/server";
import { ProductMediaController } from "@/server/controllers/product-media.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; imageId: string }> },
) {
  const { id, imageId } = await context.params;
  return ProductMediaController.update(request, id, imageId);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; imageId: string }> },
) {
  const { id, imageId } = await context.params;
  return ProductMediaController.remove(request, id, imageId);
}
