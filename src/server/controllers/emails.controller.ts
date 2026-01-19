import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { emailsService } from "../services/emails.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";

const listTemplatesSchema = z.object({ page: z.coerce.number().int().positive().optional(), limit: z.coerce.number().int().positive().max(100).optional(), search: z.string().optional(), isActive: z.coerce.boolean().optional() });
const templateBodySchema = z.object({ name: z.string().min(1), slug: z.string().min(1), subject: z.string().min(1), body: z.string().min(1), variables: z.record(z.string()).optional(), isActive: z.boolean().optional() });
const updateTemplateSchema = templateBodySchema.partial();
const listLogsSchema = z.object({ page: z.coerce.number().int().positive().optional(), limit: z.coerce.number().int().positive().max(100).optional(), to: z.string().email().optional(), status: z.enum(["pending", "sent", "failed", "bounced"]).optional(), search: z.string().optional() });
const sendSchema = z.object({ to: z.string().email(), subject: z.string().min(1), html: z.string().optional(), text: z.string().optional(), fromOverride: z.string().email().optional(), userId: z.string().uuid().optional(), templateId: z.string().uuid().optional(), metadata: z.any().optional() });

export class EmailsController {
  static async listTemplates(request: NextRequest) {
    try {
      await requirePermission(request, "emails.view");
      const query = listTemplatesSchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const result = await emailsService.listTemplates(query);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async createTemplate(request: NextRequest) {
    try {
      const session = await requirePermission(request, "emails.manage");
      const body = await request.json().catch(() => ({}));
      const input = templateBodySchema.parse(body || {});
      const result = await emailsService.createTemplate(input, { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data, 201);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async getTemplate(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "emails.view");
      const result = await emailsService.getTemplate(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async updateTemplate(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "emails.manage");
      const body = await request.json().catch(() => ({}));
      const patch = updateTemplateSchema.parse(body || {});
      const result = await emailsService.updateTemplate(id, patch, { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async deleteTemplate(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "emails.manage");
      const result = await emailsService.deleteTemplate(id, { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async listLogs(request: NextRequest) {
    try {
      await requirePermission(request, "emails.view");
      const query = listLogsSchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const result = await emailsService.listLogs(query);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async send(request: NextRequest) {
    try {
      const session = await requirePermission(request, "emails.manage");
      const body = await request.json().catch(() => ({}));
      const input = sendSchema.parse(body || {});
      const result = await emailsService.send(input, { userId: (session.user as any)?.id, ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async metrics(request: NextRequest) {
    try {
      await requirePermission(request, "emails.view");
      const query = (listLogsSchema.partial()).parse(Object.fromEntries(request.nextUrl.searchParams.entries()));

      const filters: any[] = [];
      if (query.to) filters.push(sql`${schema.emailLogs.to} = ${query.to}`);
      if (query.status) filters.push(sql`${schema.emailLogs.status} = ${query.status}`);
      if ((query as any).search) {
        const like = `%${(query as any).search}%`;
        filters.push(sql`(${schema.emailLogs.subject} ILIKE ${like} OR ${schema.emailLogs.to} ILIKE ${like} OR ${schema.emailLogs.from} ILIKE ${like})`);
      }
      const where = filters.length ? sql.join(filters, sql` AND `) : undefined;

      const [{ totalLogs }] = await db
        .select({ totalLogs: sql<number>`COUNT(*)` })
        .from(schema.emailLogs)
        .where(where as any);

      const countBy = async (s: string) => {
        const [row] = await db
          .select({ c: sql<number>`COUNT(*)` })
          .from(schema.emailLogs)
          .where(sql`${schema.emailLogs.status} = ${s} AND ${where ? sql`(${where})` : sql`true`}` as any);
        return Number((row as any)?.c || 0);
      };

      const [pendingCount, sentCount, failedCount, bouncedCount] = await Promise.all([
        countBy('pending'),
        countBy('sent'),
        countBy('failed'),
        countBy('bounced'),
      ]);

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ last30dCount }] = await db
        .select({ last30dCount: sql<number>`COUNT(*)` })
        .from(schema.emailLogs)
        .where(sql`${schema.emailLogs.createdAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ distinctRecipients }] = await db
        .select({ distinctRecipients: sql<number>`COUNT(DISTINCT ${schema.emailLogs.to})` })
        .from(schema.emailLogs)
        .where(where as any);

      const deliveryRate = (sentCount + failedCount + bouncedCount) ? Math.round((sentCount / (sentCount + failedCount + bouncedCount)) * 100) : 0;

      return successResponse({
        totalLogs: Number(totalLogs || 0),
        pendingCount,
        sentCount,
        failedCount,
        bouncedCount,
        last30dCount: Number(last30dCount || 0),
        distinctRecipients: Number(distinctRecipients || 0),
        deliveryRate,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
