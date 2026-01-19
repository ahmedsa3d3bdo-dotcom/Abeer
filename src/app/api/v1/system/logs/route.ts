import type { NextRequest } from "next/server";
import { SystemLogsController } from "@/server/controllers/system-logs.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return SystemLogsController.list(request);
}

export async function DELETE(request: NextRequest) {
  return SystemLogsController.purgeRetention(request);
}
