import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { roleService } from "../services/role.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";
import { handleRouteError, successResponse } from "../utils/response";
import { validateQuery, validateBody } from "../utils/validation";
import { requirePermission } from "../utils/rbac";
import { auth } from "@/auth";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().optional(),
  isSystem: z.coerce.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(),
});

const upsertSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().nullable().optional(),
  isSystem: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
});

export class RolesController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "roles.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await roleService.list(query);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async create(request: NextRequest) {
    try {
      const session = await requirePermission(request, "roles.manage");
      const body = await validateBody(request, upsertSchema);
      const result = await roleService.create(body, {
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

  static async get(request: NextRequest, id: string) {
    try {
      await requirePermission(request, "roles.view");
      const result = await roleService.getById(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async update(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "roles.manage");
      const body = await validateBody(request, upsertSchema);
      const result = await roleService.update(id, body, {
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

  static async remove(_request: NextRequest, id: string) {
    try {
      const session = await requirePermission(_request, "roles.manage");
      const result = await roleService.remove(id, {
        userId: (session.user as any)?.id,
        ip: _request.headers.get("x-forwarded-for") || _request.headers.get("x-real-ip"),
        userAgent: _request.headers.get("user-agent"),
      });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, _request);
    }
  }

  static async allPermissions(request: NextRequest) {
    try {
      await requirePermission(request, "roles.view");
      const result = await roleService.listAllPermissions();
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async bulk(request: NextRequest) {
    try {
      const session = await requirePermission(request, "roles.manage");
      const body = await request.json();
      const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
      const results: { id: string; ok: boolean; error?: string }[] = [];
      for (const id of ids) {
        const res = await roleService.remove(id, {
          userId: (session.user as any)?.id,
          ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
          userAgent: request.headers.get("user-agent"),
        });
        results.push({ id, ok: res.success, error: res.success ? undefined : res.error.message });
      }
      return successResponse({ results });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async usage(_request: NextRequest, id: string) {
    try {
      await requirePermission(_request, "roles.view");
      const count = await (await import("../repositories/role.repository")).roleRepository.countUsers(id);
      return successResponse({ count });
    } catch (e) {
      return handleRouteError(e, _request);
    }
  }

  static async metrics(request: NextRequest) {
    try {
      await requirePermission(request, "roles.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);

      const base: any[] = [];
      if (query.q) {
        const like = `%${query.q}%`;
        base.push(sql`(${schema.roles.name} ILIKE ${like} OR ${schema.roles.slug} ILIKE ${like})`);
      }
      if (typeof query.isSystem === "boolean") base.push(sql`${schema.roles.isSystem} = ${query.isSystem}`);
      if (query.dateFrom) base.push(sql`${schema.roles.createdAt} >= ${new Date(query.dateFrom)}`);
      if (query.dateTo) base.push(sql`${schema.roles.createdAt} <= ${new Date(query.dateTo)}`);
      const where = base.length ? sql.join(base, sql` AND `) : undefined;

      const [{ totalRoles }] = await db.select({ totalRoles: sql<number>`COUNT(*)` }).from(schema.roles).where(where as any);
      const [{ systemCount }] = await db
        .select({ systemCount: sql<number>`COUNT(*)` })
        .from(schema.roles)
        .where(sql`${schema.roles.isSystem} = true AND ${where ? sql`(${where})` : sql`true`}` as any);
      const [{ customCount }] = await db
        .select({ customCount: sql<number>`COUNT(*)` })
        .from(schema.roles)
        .where(sql`${schema.roles.isSystem} = false AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ withUsers }] = await db
        .select({ withUsers: sql<number>`COUNT(DISTINCT ${schema.userRoles.roleId})` })
        .from(schema.userRoles)
        .innerJoin(schema.roles, sql`${schema.userRoles.roleId} = ${schema.roles.id}`)
        .where(where as any);

      const [{ rolesNoPermissions }] = await db
        .select({ rolesNoPermissions: sql<number>`COUNT(*)` })
        .from(schema.roles)
        .where(sql`NOT EXISTS (SELECT 1 FROM ${schema.rolePermissions} WHERE ${schema.rolePermissions.roleId} = ${schema.roles.id}) AND ${where ? sql`(${where})` : sql`true`}` as any);

      const [{ permAssignments }] = await db
        .select({ permAssignments: sql<number>`COUNT(*)` })
        .from(schema.rolePermissions)
        .innerJoin(schema.roles, sql`${schema.rolePermissions.roleId} = ${schema.roles.id}`)
        .where(where as any);

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ newRoles30d }] = await db
        .select({ newRoles30d: sql<number>`COUNT(*)` })
        .from(schema.roles)
        .where(sql`${schema.roles.createdAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);

      return successResponse({
        totalRoles: Number(totalRoles || 0),
        systemCount: Number(systemCount || 0),
        customCount: Number(customCount || 0),
        withUsers: Number(withUsers || 0),
        rolesNoPermissions: Number(rolesNoPermissions || 0),
        avgPermissionsPerRole: Number(totalRoles ? (Number(permAssignments || 0) / Number(totalRoles || 0)) : 0),
        newRoles30d: Number(newRoles30d || 0),
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
