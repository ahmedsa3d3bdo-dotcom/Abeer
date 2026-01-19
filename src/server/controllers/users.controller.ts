import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { userService } from "../services/user.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";
import { handleRouteError, successResponse } from "../utils/response";
import { validateQuery, validateBody } from "../utils/validation";
import { requirePermission } from "../utils/rbac";
import { writeAudit } from "../utils/audit";

function normalizeIp(v: string | null) {
  if (!v) return undefined;
  const first = v.split(",")[0]?.trim();
  return first || undefined;
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().optional(),
  role: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(),
});

const upsertSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  isActive: z.boolean().optional(),
  avatar: z.string().url().optional(),
  roles: z.array(z.string()).optional(),
});

export class UsersController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request as any, "users.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await userService.list(query);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async create(request: NextRequest) {
    try {
      const session = await requirePermission(request as any, "users.create");
      const body = await validateBody(request, upsertSchema);
      const result = await userService.create(body);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      const changes: any = { ...(body as any) };
      if (typeof changes.password === "string" && changes.password) changes.password = "[REDACTED]";
      await writeAudit({
        action: "create",
        resource: "users",
        resourceId: (result.data as any)?.id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
        changes,
      });
      return successResponse(result.data, 201);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async get(request: NextRequest, id: string) {
    try {
      await requirePermission(request as any, "users.view");
      const result = await userService.getById(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async update(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request as any, "users.update");
      const body = await validateBody(request, upsertSchema);
      const result = await userService.update(id, body);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

      const changes: any = { ...(body as any) };
      if (typeof changes.password === "string" && changes.password) changes.password = "[REDACTED]";
      await writeAudit({
        action: "update",
        resource: "users",
        resourceId: id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")),
        userAgent: request.headers.get("user-agent") || undefined,
        changes,
      });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async remove(_request: NextRequest, id: string) {
    try {
      const session = await requirePermission(_request as any, "users.delete");
      const result = await userService.remove(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });

      await writeAudit({
        action: "delete",
        resource: "users",
        resourceId: id,
        userId: (session.user as any)?.id,
        ipAddress: normalizeIp(_request.headers.get("x-forwarded-for") || _request.headers.get("x-real-ip")),
        userAgent: _request.headers.get("user-agent") || undefined,
      });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, _request);
    }
  }

  static async roles(request: NextRequest) {
    try {
      await requirePermission(request as any, "users.view");
      const result = await userService.listRoles();
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async resetPassword(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request as any, "users.update");
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        request.nextUrl.origin;

      const result = await userService.resetPassword(id, baseUrl, {
        userId: (session.user as any)?.id,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      } as any);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async setPassword(request: NextRequest, id: string) {
    try {
      await requirePermission(request as any, "users.update");
      const body = await request.json().catch(() => ({}));
      const schema = z.object({ password: z.string().min(6, "Password must be at least 6 characters") });
      const input = schema.parse(body || {});
      const result = await userService.setPassword(id, input.password);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async metrics(request: NextRequest) {
    try {
      await requirePermission(request as any, "users.view");
      const query = validateQuery(request.nextUrl.searchParams, z.object({
        q: z.string().optional(),
        role: z.string().optional(),
        isActive: z.coerce.boolean().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }));

      const baseFilters: any[] = [];
      if (query.q) {
        const like = `%${query.q}%`;
        baseFilters.push(sql`(${schema.users.email} ILIKE ${like} OR ${schema.users.firstName} ILIKE ${like} OR ${schema.users.lastName} ILIKE ${like})`);
      }
      if (typeof query.isActive === "boolean") baseFilters.push(sql`${schema.users.isActive} = ${query.isActive}`);
      if (query.dateFrom) baseFilters.push(sql`${schema.users.createdAt} >= ${new Date(query.dateFrom)}`);
      if (query.dateTo) baseFilters.push(sql`${schema.users.createdAt} <= ${new Date(query.dateTo)}`);

      // Role filter -> constrain to users having that role slug
      if (query.role && query.role !== "all") {
        baseFilters.push(sql`EXISTS (
          SELECT 1 FROM ${schema.userRoles}
          JOIN ${schema.roles} ON ${schema.userRoles.roleId} = ${schema.roles.id}
          WHERE ${schema.userRoles.userId} = ${schema.users.id} AND ${schema.roles.slug} = ${query.role}
        )`);
      }

      const where = baseFilters.length ? sql.join(baseFilters, sql` AND `) : undefined;

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`COUNT(*)` }).from(schema.users).where(where as any);
      const [{ activeUsers }] = await db
        .select({ activeUsers: sql<number>`COUNT(*)` })
        .from(schema.users)
        .where(sql`${schema.users.isActive} = true AND ${where ? sql`(${where})` : sql`true`}` as any);
      const inactiveUsers = Number(totalUsers || 0) - Number(activeUsers || 0);
      const [{ newUsers30d }] = await db
        .select({ newUsers30d: sql<number>`COUNT(*)` })
        .from(schema.users)
        .where(sql`${schema.users.createdAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);
      const [{ emailVerified }] = await db
        .select({ emailVerified: sql<number>`COUNT(*)` })
        .from(schema.users)
        .where(sql`${schema.users.emailVerified} = true AND ${where ? sql`(${where})` : sql`true`}` as any);
      const [{ withAvatar }] = await db
        .select({ withAvatar: sql<number>`COUNT(*)` })
        .from(schema.users)
        .where(sql`${schema.users.avatar} IS NOT NULL AND ${schema.users.avatar} <> '' AND ${where ? sql`(${where})` : sql`true`}` as any);
      const [{ lastLogin30d }] = await db
        .select({ lastLogin30d: sql<number>`COUNT(*)` })
        .from(schema.users)
        .where(sql`${schema.users.lastLoginAt} IS NOT NULL AND ${schema.users.lastLoginAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);

      return successResponse({
        totalUsers: Number(totalUsers || 0),
        activeUsers: Number(activeUsers || 0),
        inactiveUsers: inactiveUsers < 0 ? 0 : inactiveUsers,
        newUsers30d: Number(newUsers30d || 0),
        emailVerified: Number(emailVerified || 0),
        withAvatar: Number(withAvatar || 0),
        lastLogin30d: Number(lastLogin30d || 0),
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
