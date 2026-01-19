import type { NextRequest } from "next/server";
import { ProductMediaController } from "@/server/controllers/product-media.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return ProductMediaController.list(request, id);
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return ProductMediaController.add(request, id);
}
