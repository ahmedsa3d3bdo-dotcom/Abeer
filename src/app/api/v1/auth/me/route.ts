import { NextRequest } from "next/server";
import { AuthController } from "@/server/controllers/auth.controller";

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
export async function GET(request: NextRequest) {
  return AuthController.getMe(request);
}
