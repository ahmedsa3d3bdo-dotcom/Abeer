import type { NextRequest } from "next/server";
import { StorefrontPreferencesController } from "@/server/storefront/controllers/preferences.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return StorefrontPreferencesController.get(request);
}

export async function PUT(request: NextRequest) {
  return StorefrontPreferencesController.update(request);
}
