import type { NextRequest } from "next/server";
import { ShippingMethodsController } from "@/server/controllers/shipping_methods.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return ShippingMethodsController.get(request, id);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return ShippingMethodsController.update(request, id);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return ShippingMethodsController.remove(request, id);
}
