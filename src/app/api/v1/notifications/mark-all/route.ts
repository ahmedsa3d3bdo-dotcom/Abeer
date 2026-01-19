import type { NextRequest } from "next/server";
import { NotificationsController } from "@/server/controllers/notifications.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  return NotificationsController.markAll(request);
}
