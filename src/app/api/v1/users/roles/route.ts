import { UsersController } from "@/server/controllers/users.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  return UsersController.roles(request as any);
}
