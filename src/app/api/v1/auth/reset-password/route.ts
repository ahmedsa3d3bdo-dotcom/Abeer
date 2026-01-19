import type { NextRequest } from "next/server";
import { AuthController } from "@/server/controllers/auth.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  return AuthController.resetPassword(request);
}
