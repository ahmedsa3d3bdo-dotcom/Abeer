import { BackupsController } from "@/server/controllers/backups.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  return BackupsController.retention(request as any);
}
