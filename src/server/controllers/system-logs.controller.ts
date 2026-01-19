import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { systemLogsService } from "../services/system-logs.service";
import { handleRouteError, successResponse } from "../utils/response";
import { validateBody, validateQuery } from "../utils/validation";
import { requirePermission } from "../utils/rbac";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  q: z.string().optional(),
  level: z.string().optional(),
  source: z.string().optional(),
  path: z.string().optional(),
  requestId: z.string().optional(),
  user: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(),
});

const reportSchema = z.object({
  level: z.string().optional(),
  message: z.string().min(1),
  stack: z.string().optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

function normalizeIp(v: string | null) {
  if (!v) return undefined;
  const first = v.split(",")[0]?.trim();
  return first || undefined;
}

export class SystemLogsController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "system.logs.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await systemLogsService.list({
        ...query,
        sort: query.sort ?? "createdAt.desc",
      } as any);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async get(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "system.logs.view");
      const result = await systemLogsService.getById(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async report(request: NextRequest) {
    try {
      const session = await requirePermission(request, "system.logs.view");
      const body = await validateBody(request, reportSchema);

      const ip = normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"));
      const ua = request.headers.get("user-agent") || body.userAgent;

      const result = await systemLogsService.create({
        level: body.level || "error",
        source: "client",
        message: body.message,
        stack: body.stack,
        path: body.url,
        method: undefined,
        statusCode: undefined,
        requestId: undefined,
        userId: (session.user as any)?.id,
        userEmail: (session.user as any)?.email,
        ipAddress: ip,
        userAgent: ua || undefined,
        metadata: (body.metadata as any) ?? undefined,
      });

      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse({ ok: true }, 201);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async purgeRetention(request: NextRequest) {
    try {
      await requirePermission(request, "system.logs.manage");
      const result = await systemLogsService.purgeRetention();
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
