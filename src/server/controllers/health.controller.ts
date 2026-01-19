import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { healthService } from "../services/health.service";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";

const listQuerySchema = z.object({ page: z.coerce.number().int().positive().optional(), limit: z.coerce.number().int().positive().max(200).optional(), sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(), service: z.string().optional() });
const metricsQuerySchema = z.object({ service: z.string().optional(), windowHours: z.coerce.number().int().min(1).max(168).optional() });
const scheduleSchema = z.object({
  enabled: z.boolean().optional(),
  intervalMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  service: z.string().optional(),
  smtp: z.boolean().optional(),
  httpEndpoints: z.array(z.string()).optional(),
  notifyEmails: z.array(z.string()).optional(),
  notifyOnDegraded: z.boolean().optional(),
  notifyCooldownMin: z.coerce.number().int().min(0).max(1440).optional(),
  keepLast: z.coerce.number().int().min(0).max(10000).optional(),
  maxAgeDays: z.coerce.number().int().min(0).max(3650).optional(),
});

export class HealthController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "health.view");
      healthService.ensureInternalSchedulerStarted();
      const query = listQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const result = await healthService.list(query);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async metrics(request: NextRequest) {
    try {
      await requirePermission(request, "health.view");
      healthService.ensureInternalSchedulerStarted();
      const query = metricsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const result = await healthService.metrics({ service: query.service, windowHours: query.windowHours ?? 24 });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async run(request: NextRequest) {
    try {
      const session = await requirePermission(request, "health.manage");
      healthService.ensureInternalSchedulerStarted();
      const result = await healthService.run("app", { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data, 201);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async getSchedule(request: NextRequest) {
    try {
      await requirePermission(request, "health.view");
      healthService.ensureInternalSchedulerStarted();
      const data = await healthService.getSchedule();
      return successResponse(data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async updateSchedule(request: NextRequest) {
    try {
      const session = await requirePermission(request, "health.manage");
      healthService.ensureInternalSchedulerStarted();
      const body = await request.json().catch(() => ({}));
      const input = scheduleSchema.parse(body || {});
      const result = await healthService.updateSchedule(input, { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async runNow(request: NextRequest) {
    try {
      const session = await requirePermission(request, "health.manage");
      healthService.ensureInternalSchedulerStarted();
      const result = await healthService.runScheduledHealthCheck("manual", { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data, 201);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async cron(request: NextRequest) {
    try {
      healthService.ensureInternalSchedulerStarted();
      const token =
        request.headers.get("x-cron-token") ||
        request.headers.get("x-health-cron-token") ||
        (request.headers.get("authorization")?.startsWith("Bearer ") ? request.headers.get("authorization")?.slice(7) : null) ||
        request.nextUrl.searchParams.get("token");

      const expected = process.env.HEALTH_CRON_TOKEN;
      if (!expected || !token || token !== expected) {
        return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid cron token" } }, { status: 401 });
      }

      const result = await healthService.runScheduledHealthCheck("cron");
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
