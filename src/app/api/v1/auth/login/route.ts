import { NextRequest } from "next/server";
import { AuthController } from "@/server/controllers/auth.controller";

/**
 * POST /api/v1/auth/login
 * Login with credentials
 */
export async function POST(request: NextRequest) {
  return AuthController.login(request);
}
