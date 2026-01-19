import { NextRequest } from "next/server";
import { AuthController } from "@/server/controllers/auth.controller";

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
  return AuthController.register(request);
}
