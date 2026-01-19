import type { NextRequest } from "next/server";
import { RefundsController } from "@/server/controllers/refunds.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return RefundsController.list(request);
}

export async function POST(request: NextRequest) {
  return RefundsController.create(request);
}
