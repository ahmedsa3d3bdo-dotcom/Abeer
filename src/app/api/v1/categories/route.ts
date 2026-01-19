import type { NextRequest } from "next/server";
import { CategoriesController } from "@/server/controllers/categories.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return CategoriesController.list(request);
}

export async function POST(request: NextRequest) {
  return CategoriesController.create(request);
}
