import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { backupsService } from "../services/backups.service";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";
import { readFile } from "fs/promises";
import path from "node:path";

const listQuerySchema = z.object({ page: z.coerce.number().int().positive().optional(), limit: z.coerce.number().int().positive().max(100).optional(), sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional() });
const retentionSchema = z.object({ keepLast: z.coerce.number().int().nonnegative().optional(), maxAgeDays: z.coerce.number().int().positive().optional() });
const uploadQuerySchema = z.object({ restore: z.coerce.boolean().optional() });
const scheduleSchema = z.object({
  enabled: z.boolean().optional(),
  frequency: z.enum(["daily", "weekly"]).optional(),
  weekday: z.coerce.number().int().min(0).max(6).optional(),
  time: z.string().optional(),
  timeZone: z.string().optional(),
  keepLast: z.coerce.number().int().min(0).max(200).optional(),
  maxAgeDays: z.coerce.number().int().min(0).max(3650).optional(),
});

export class BackupsController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "backups.view");
      backupsService.ensureInternalSchedulerStarted();
      const page = listQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const result = await backupsService.list(page);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async create(request: NextRequest) {
    try {
      const session = await requirePermission(request, "backups.manage");
      backupsService.ensureInternalSchedulerStarted();
      const result = await backupsService.create({}, { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data, 201);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async remove(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "backups.manage");
      const result = await backupsService.remove(id, { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async finalize(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "backups.manage");
      const result = await backupsService.finalize(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async retention(request: NextRequest) {
    try {
      await requirePermission(request, "backups.manage");
      const body = await request.json().catch(() => ({}));
      const input = retentionSchema.parse(body || {});
      const result = await backupsService.retention(input);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async download(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "backups.view");
      const found = await backupsService.findById(id);
      if (!found.success) return NextResponse.json({ success: false, error: found.error }, { status: 404 });
      const filePath = (found.data as any).filePath as string;
      try {
        const buf = await readFile(filePath);
        const fileName = String((found.data as any).fileName || "backup");
        const encoded = encodeURIComponent(fileName).replace(/%20/g, "+");
        return new NextResponse(buf, {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"; filename*=UTF-8''${encoded}`,
          },
        });
      } catch {
        return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Backup file not found" } }, { status: 404 });
      }
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async upload(request: NextRequest) {
    try {
      const session = await requirePermission(request, "backups.manage");
      const qs = uploadQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const formData = await request.formData();

      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ success: false, error: { code: "NO_FILE", message: "No backup file uploaded" } }, { status: 400 });
      }
      const nameRaw = formData.get("name");
      const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : undefined;

      const originalName = (file as any).name as string | undefined;
      const ext = (originalName && path.extname(originalName)) || "";
      const result = await backupsService.upload(
        {
          name,
          file,
          originalName: originalName || `uploaded${ext || ""}`,
        },
        {
          userId: (session.user as any)?.id,
          ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
          userAgent: request.headers.get("user-agent"),
        },
      );

      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      if (qs.restore) {
        const restoreRes = await backupsService.restore((result.data as any).id, {
          userId: (session.user as any)?.id,
          ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
          userAgent: request.headers.get("user-agent"),
        });
        if (!restoreRes.success) return NextResponse.json({ success: false, error: restoreRes.error }, { status: 400 });
        return successResponse({ backup: result.data, restore: restoreRes.data }, 201);
      }

      return successResponse(result.data, 201);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async restore(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "backups.manage");
      const result = await backupsService.restore(id, { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async getSchedule(request: NextRequest) {
    try {
      await requirePermission(request, "backups.view");
      backupsService.ensureInternalSchedulerStarted();
      const data = await backupsService.getSchedule();
      return successResponse(data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async updateSchedule(request: NextRequest) {
    try {
      const session = await requirePermission(request, "backups.manage");
      backupsService.ensureInternalSchedulerStarted();
      const body = await request.json().catch(() => ({}));
      const input = scheduleSchema.parse(body || {});
      const result = await backupsService.updateSchedule(input, {
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

  static async runNow(request: NextRequest) {
    try {
      const session = await requirePermission(request, "backups.manage");
      backupsService.ensureInternalSchedulerStarted();
      const result = await backupsService.runScheduledBackup("manual", {
        userId: (session.user as any)?.id,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data, 201);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }

  static async cron(request: NextRequest) {
    try {
      backupsService.ensureInternalSchedulerStarted();
      const token =
        request.headers.get("x-cron-token") ||
        request.headers.get("x-backup-cron-token") ||
        (request.headers.get("authorization")?.startsWith("Bearer ") ? request.headers.get("authorization")?.slice(7) : null) ||
        request.nextUrl.searchParams.get("token");

      const expected = process.env.BACKUP_CRON_TOKEN;
      if (!expected || !token || token !== expected) {
        return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid cron token" } }, { status: 401 });
      }

      const result = await backupsService.runScheduledBackup("cron");
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
       return handleRouteError(e, request);
    }
  }
}
