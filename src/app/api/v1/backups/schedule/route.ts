import type { NextRequest } from "next/server";
import { BackupsController } from "@/server/controllers/backups.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return BackupsController.getSchedule(request);
}

export async function PUT(request: NextRequest) {
  return BackupsController.updateSchedule(request);
}
