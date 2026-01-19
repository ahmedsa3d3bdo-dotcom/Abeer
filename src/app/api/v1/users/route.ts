import type { NextRequest } from "next/server";
import { UsersController } from "@/server/controllers/users.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  return UsersController.list(request);
}

export async function POST(request: NextRequest) {
  return UsersController.create(request);
}
