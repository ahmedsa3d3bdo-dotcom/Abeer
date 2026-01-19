import type { NextRequest } from "next/server";
import { SettingsController } from "@/server/controllers/settings.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return SettingsController.list(request);
}

export async function POST(request: NextRequest) {
  return SettingsController.create(request);
}
