import type { NextRequest } from "next/server";
import { CustomersController } from "@/server/controllers/customers.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return CustomersController.metrics(request);
}
