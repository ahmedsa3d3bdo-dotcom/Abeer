import { NextRequest } from "next/server";
import { authService } from "../services/auth.service";
import { userService } from "../services/user.service";
import { successResponse, errorResponse, handleRouteError } from "../utils/response";
import { validateBody } from "../utils/validation";
import { z } from "zod";
import { emailSchema, passwordSchema } from "../utils/validation";
import { UnauthorizedError, ConflictError, AppError } from "../types";
import { enforceSecurity } from "../utils/security-guards";
import { auth } from "@/auth";
import { clearLoginFailures, recordLoginFailure, respondLoginLocked } from "../utils/login-security";

// ==================== VALIDATION SCHEMAS ====================

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
});

// ==================== CONTROLLERS ====================

export class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  static async register(request: NextRequest) {
    try {
      const security = await enforceSecurity(request, "register");
      if (security) return security;

      // Validate request body
      const data = await validateBody(request, registerSchema);

      // Call service
      const result = await authService.register(data);

      if (!result.success) {
        if (result.error.code === "EMAIL_EXISTS") {
          throw new ConflictError(result.error.message);
        }
        throw new Error(result.error.message);
      }

      return successResponse(result.data, 201);
    } catch (error) {
      return handleRouteError(error, request);
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  static async login(request: NextRequest) {
    try {
      const security = await enforceSecurity(request, "login");
      if (security) return security;

      // Validate request body
      const credentials = await validateBody(request, loginSchema);

      // Get IP address
      const forwarded = request.headers.get("x-forwarded-for");
      const ipAddress = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";

      const locked = await respondLoginLocked({ request, ip: String(ipAddress), email: String((credentials as any)?.email || "") });
      if (locked) return locked;

      // Call service
      const result = await authService.login(credentials, ipAddress);

      if (!result.success) {
        if (result.error.code === "INVALID_CREDENTIALS" || result.error.code === "ACCOUNT_DISABLED") {
          if (result.error.code === "INVALID_CREDENTIALS") {
            await recordLoginFailure({ request, ip: String(ipAddress), email: String((credentials as any)?.email || "") });
          }
          throw new UnauthorizedError(result.error.message);
        }
        throw new Error(result.error.message);
      }

      await clearLoginFailures({ ip: String(ipAddress), email: String((credentials as any)?.email || "") });

      return successResponse(result.data);
    } catch (error) {
      return handleRouteError(error, request);
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  static async getMe(request: NextRequest) {
    try {
      void request;

      const session = await auth();
      const userId = (session?.user as any)?.id as string | undefined;
      if (!userId) throw new UnauthorizedError("Not authenticated");

      const result = await authService.getUserById(userId);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return successResponse(result.data);
    } catch (error) {
      return handleRouteError(error, request);
    }
  }

  /**
   * POST /api/v1/auth/verify-email/:token
   */
  static async verifyEmail(request: NextRequest, { params }: { params: { token: string } }) {
    try {
      void request;
      void params;
      return errorResponse(new AppError("Not implemented", 501, "NOT_IMPLEMENTED"), 501);
    } catch (error) {
      return handleRouteError(error, request);
    }
  }

  /**
   * GET /api/v1/auth/reset-password/validate?token=...
   */
  static async validateResetToken(request: NextRequest) {
    try {
      const security = await enforceSecurity(request, "login");
      if (security) return security;

      const token = request.nextUrl.searchParams.get("token") || "";
      if (!token) throw new Error("Missing token");
      const result = await authService.validateResetToken(token);
      if (!result.success) throw new Error(result.error.message);
      return successResponse({ email: result.data.email });
    } catch (error) {
      return handleRouteError(error, request);
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   * body: { token: string, password: string }
   */
  static async resetPassword(request: NextRequest) {
    try {
      const security = await enforceSecurity(request, "login");
      if (security) return security;

      const body = await request.json().catch(() => ({}));
      const schema = z.object({ token: z.string().min(10), password: passwordSchema });
      const input = schema.parse(body || {});
      const result = await authService.resetPasswordWithToken(input.token, input.password);
      if (!result.success) throw new Error(result.error.message);
      return successResponse({ ok: true });
    } catch (error) {
      return handleRouteError(error, request);
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   * body: { email: string }
   * Always returns success to prevent account enumeration.
   */
  static async forgotPassword(request: NextRequest) {
    try {
      const security = await enforceSecurity(request, "login");
      if (security) return security;

      const body = await request.json().catch(() => ({}));
      const schema = z.object({ email: emailSchema });
      const input = schema.parse(body || {});

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        request.nextUrl.origin;

      await userService.resetPasswordByEmail(input.email, baseUrl);
      return successResponse({ ok: true });
    } catch (error) {
      return handleRouteError(error, request);
    }
  }
}
