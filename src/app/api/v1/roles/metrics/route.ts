import type { NextRequest } from "next/server";
import { RolesController } from "@/server/controllers/roles.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return RolesController.metrics(request);
}
