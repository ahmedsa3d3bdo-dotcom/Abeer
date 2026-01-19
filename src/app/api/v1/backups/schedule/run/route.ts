import type { NextRequest } from "next/server";
import { BackupsController } from "@/server/controllers/backups.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  return BackupsController.runNow(request);
}
