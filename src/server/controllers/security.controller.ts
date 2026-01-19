import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { securityService } from "../services/security.service";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";

const logsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  q: z.string().optional(),
  action: z.string().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(),
});

const updateSettingsSchema = z
  .object({
    rateLimit: z
      .object({
        enabled: z.boolean().optional(),
        contact: z.object({ limit: z.coerce.number().int().min(1).max(10000).optional(), windowSec: z.coerce.number().int().min(1).max(86400).optional() }).partial().optional(),
        newsletter: z.object({ limit: z.coerce.number().int().min(1).max(10000).optional(), windowSec: z.coerce.number().int().min(1).max(86400).optional() }).partial().optional(),
        login: z.object({ limit: z.coerce.number().int().min(1).max(10000).optional(), windowSec: z.coerce.number().int().min(1).max(86400).optional() }).partial().optional(),
        register: z.object({ limit: z.coerce.number().int().min(1).max(10000).optional(), windowSec: z.coerce.number().int().min(1).max(86400).optional() }).partial().optional(),
        reviewsPost: z.object({ limit: z.coerce.number().int().min(1).max(10000).optional(), windowSec: z.coerce.number().int().min(1).max(86400).optional() }).partial().optional(),
        helpfulVote: z.object({ limit: z.coerce.number().int().min(1).max(10000).optional(), windowSec: z.coerce.number().int().min(1).max(86400).optional() }).partial().optional(),
        reportReview: z.object({ limit: z.coerce.number().int().min(1).max(10000).optional(), windowSec: z.coerce.number().int().min(1).max(86400).optional() }).partial().optional(),
      })
      .partial()
      .optional(),
    originCheck: z
      .object({
        enabled: z.boolean().optional(),
        allowedOrigins: z.array(z.string()).optional(),
        enforceOnPublicForms: z.boolean().optional(),
        enforceOnAuth: z.boolean().optional(),
        enforceOnReviews: z.boolean().optional(),
      })
      .partial()
      .optional(),
    monitoring: z
      .object({
        alerts: z
          .object({
            rateLimitSpikes: z.object({ enabled: z.boolean().optional(), threshold5m: z.coerce.number().int().min(1).max(100000).optional() }).partial().optional(),
            repeatedLoginFailures: z
              .object({ enabled: z.boolean().optional(), threshold5m: z.coerce.number().int().min(1).max(100000).optional() })
              .partial()
              .optional(),
            originBlocks: z.object({ enabled: z.boolean().optional(), threshold5m: z.coerce.number().int().min(1).max(100000).optional() }).partial().optional(),
          })
          .partial()
          .optional(),
        notifications: z
          .object({
            inAppAdmins: z.boolean().optional(),
            emails: z.array(z.string()).optional(),
          })
          .partial()
          .optional(),
      })
      .partial()
      .optional(),
  })
  .partial();

export class SecurityController {
  static async getSettings(request: NextRequest) {
    try {
      await requirePermission(request, "security.view");
      const data = await securityService.getSettings();
      return successResponse(data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async updateSettings(request: NextRequest) {
    try {
      const session = await requirePermission(request, "security.manage");
      const body = await request.json().catch(() => ({}));
      const input = updateSettingsSchema.parse(body || {});
      const result = await securityService.updateSettings(input as any, {
        userId: (session.user as any)?.id,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async status(request: NextRequest) {
    try {
      await requirePermission(request, "security.view");
      const result = await securityService.status();
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async logs(request: NextRequest) {
    try {
      await requirePermission(request, "security.view");
      const query = logsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const result = await securityService.listLogs({
        page: query.page,
        limit: query.limit,
        q: query.q,
        action: query.action,
        sort: query.sort ?? "createdAt.desc",
      });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
