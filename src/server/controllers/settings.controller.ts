import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { settingsService } from "../services/settings.service";
import { handleRouteError, successResponse } from "../utils/response";
import { validateQuery, validateBody } from "../utils/validation";
import { requirePermission } from "../utils/rbac";

const listQuerySchema = z.object({ page: z.coerce.number().int().positive().optional(), limit: z.coerce.number().int().positive().max(100).optional(), q: z.string().optional(), isPublic: z.coerce.boolean().optional(), sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional() });
const upsertSchema = z.object({
  key: z.string({ required_error: "Key is required" }).min(1, "Key is required"),
  value: z.string({ required_error: "Value is required" }),
  type: z.string().optional(),
  description: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
});

export class SettingsController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "settings.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await settingsService.list(query);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async create(request: NextRequest) {
    try {
      const session = await requirePermission(request, "settings.manage");
      const body = await validateBody(request, upsertSchema);
      const result = await settingsService.create(body, { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data, 201);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async get(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "settings.view");
      const result = await settingsService.getById(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async update(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "settings.manage");
      const body = await validateBody(request, upsertSchema);
      const result = await settingsService.update(id, body, { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async remove(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "settings.manage");
      const result = await settingsService.remove(id, { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }
}
