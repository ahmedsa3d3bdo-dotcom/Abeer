import type { NextRequest } from "next/server";
import { DiscountsController } from "@/server/controllers/discounts.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return DiscountsController.list(request);
}

export async function POST(request: NextRequest) {
  return DiscountsController.create(request);
}
