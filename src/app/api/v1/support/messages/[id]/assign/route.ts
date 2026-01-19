import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { requirePermission } from "@/server/utils/rbac";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(req, "support.manage");
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const assigneeUserId = body?.assigneeUserId || null;
    if (assigneeUserId) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.users)
        .innerJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
        .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
        .where(
          and(
            eq(schema.users.id, assigneeUserId),
            sql`${schema.roles.slug} IN ${["admin", "super_admin"]}`,
            eq(schema.users.isActive, true)
          )
        )
        .limit(1);
      if (!count) {
        return NextResponse.json(
          { success: false, error: { message: "Assignee must be an active staff user" } },
          { status: 400 }
        );
      }
    }
    await db
      .update(schema.contactMessages)
      .set({ assigneeUserId, updatedAt: new Date() })
      .where(eq(schema.contactMessages.id, id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
