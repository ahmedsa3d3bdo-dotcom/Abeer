import type { NextRequest } from "next/server";
import { PermissionsController } from "@/server/controllers/permissions.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return PermissionsController.list(request);
}

export async function POST(request: NextRequest) {
  return PermissionsController.create(request);
}
