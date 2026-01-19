import type { NextRequest } from "next/server";
import { BackupsController } from "@/server/controllers/backups.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return BackupsController.download(request, id);
}
