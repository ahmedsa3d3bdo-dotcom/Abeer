import type { NextRequest } from "next/server";
import { RolesController } from "@/server/controllers/roles.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return RolesController.list(request);
}

export async function POST(request: NextRequest) {
  return RolesController.create(request);
}
