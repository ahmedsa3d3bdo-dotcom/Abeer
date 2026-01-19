import type { NextRequest } from "next/server";
import { CustomersController } from "@/server/controllers/customers.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return CustomersController.list(request);
}

export async function POST(request: NextRequest) {
  return CustomersController.create(request);
}
