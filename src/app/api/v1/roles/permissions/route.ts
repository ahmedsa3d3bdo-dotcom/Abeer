import { RolesController } from "@/server/controllers/roles.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  return RolesController.allPermissions(request as any);
}
