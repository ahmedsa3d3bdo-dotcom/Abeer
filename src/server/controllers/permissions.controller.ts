import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { permissionService } from "../services/permission.service";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";
import { handleRouteError, successResponse } from "../utils/response";
import { validateQuery, validateBody } from "../utils/validation";
import { requirePermission } from "../utils/rbac";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  q: z.string().optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).optional(),
});

const upsertSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  resource: z.string().min(1),
  action: z.string().min(1),
  description: z.string().nullable().optional(),
});

export class PermissionsController {
  static async list(request: NextRequest) {
    try {
      await requirePermission(request, "permissions.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);
      const result = await permissionService.list(query);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async create(request: NextRequest) {
    try {
      const session = await requirePermission(request, "permissions.manage");
      const body = await validateBody(request, upsertSchema);
      const result = await permissionService.create(body, {
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

  static async get(_request: NextRequest, id: string) {
    try {
      await requirePermission(_request, "permissions.view");
      const result = await permissionService.getById(id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, _request);
    }
  }

  static async update(request: NextRequest, id: string) {
    try {
      const session = await requirePermission(request, "permissions.manage");
      const body = await validateBody(request, upsertSchema);
      const result = await permissionService.update(id, body, {
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
      const session = await requirePermission(_request, "permissions.manage");
      const result = await permissionService.remove(id, {
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

  static async resources(request: NextRequest) {
    try {
      await requirePermission(request, "permissions.view");
      const result = await permissionService.resources();
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async usage(_request: NextRequest, id: string) {
    try {
      await requirePermission(_request, "permissions.view");
      const count = await (await import("../repositories/permission.repository")).permissionRepository.countRolesByPermissionId(id);
      return successResponse({ count });
    } catch (e) {
      return handleRouteError(e, _request);
    }
  }

  static async bulk(request: NextRequest) {
    try {
      const session = await requirePermission(request, "permissions.manage");
      const body = await request.json();
      const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
      const results: { id: string; ok: boolean; error?: string }[] = [];
      for (const id of ids) {
        const res = await permissionService.remove(id, {
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

  static async metrics(request: NextRequest) {
    try {
      await requirePermission(request, "permissions.view");
      const query = validateQuery(request.nextUrl.searchParams, listQuerySchema);

      const filters: any[] = [];
      if (query.q) {
        const like = `%${query.q}%`;
        filters.push(sql`(${schema.permissions.name} ILIKE ${like} OR ${schema.permissions.slug} ILIKE ${like})`);
      }
      if (query.resource) filters.push(sql`${schema.permissions.resource} = ${query.resource}`);
      const where = filters.length ? sql.join(filters, sql` AND `) : undefined;

      const [{ totalPermissions }] = await db
        .select({ totalPermissions: sql<number>`COUNT(*)` })
        .from(schema.permissions)
        .where(where as any);

      const [{ distinctResources }] = await db
        .select({ distinctResources: sql<number>`COUNT(DISTINCT ${schema.permissions.resource})` })
        .from(schema.permissions)
        .where(where as any);

      const [{ distinctActions }] = await db
        .select({ distinctActions: sql<number>`COUNT(DISTINCT ${schema.permissions.action})` })
        .from(schema.permissions)
        .where(where as any);

      const [{ assignedToRoles }] = await db
        .select({ assignedToRoles: sql<number>`COUNT(DISTINCT ${schema.rolePermissions.permissionId})` })
        .from(schema.rolePermissions)
        .innerJoin(schema.permissions, sql`${schema.rolePermissions.permissionId} = ${schema.permissions.id}`)
        .where(where as any);

      const [{ unassignedCount }] = await db
        .select({ unassignedCount: sql<number>`COUNT(*)` })
        .from(schema.permissions)
        .where(sql`NOT EXISTS (SELECT 1 FROM ${schema.rolePermissions} WHERE ${schema.rolePermissions.permissionId} = ${schema.permissions.id}) AND ${where ? sql`(${where})` : sql`true`}` as any);

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ newPermissions30d }] = await db
        .select({ newPermissions30d: sql<number>`COUNT(*)` })
        .from(schema.permissions)
        .where(sql`${schema.permissions.createdAt} >= ${since} AND ${where ? sql`(${where})` : sql`true`}` as any);

      return successResponse({
        totalPermissions: Number(totalPermissions || 0),
        distinctResources: Number(distinctResources || 0),
        distinctActions: Number(distinctActions || 0),
        assignedToRoles: Number(assignedToRoles || 0),
        unassignedCount: Number(unassignedCount || 0),
        newPermissions30d: Number(newPermissions30d || 0),
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
