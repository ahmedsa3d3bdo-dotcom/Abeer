import { PermissionsController } from "@/server/controllers/permissions.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  return PermissionsController.resources(request as any);
}
