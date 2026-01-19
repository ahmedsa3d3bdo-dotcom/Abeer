import { db } from "@/shared/db";
import { auditLogs } from "@/shared/db/schema/system";

export type WriteAuditInput = {
  action: "create" | "update" | "delete" | string;
  resource: string;
  resourceId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export async function writeAudit(input: WriteAuditInput) {
  try {
    await db.insert(auditLogs).values({
      action: input.action as any,
      resource: input.resource,
      resourceId: input.resourceId as any,
      userId: input.userId as any,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      changes: (input.changes as any) ?? undefined,
      metadata: (input.metadata as any) ?? undefined,
    });
  } catch (e) {
    console.error("Failed to write audit log", e);
  }
}
