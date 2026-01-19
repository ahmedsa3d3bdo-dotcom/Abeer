import { notificationsRepository } from "../repositories/notifications.repository";
import { success, failure } from "../types";
import { writeAudit } from "../utils/audit";
import type { ActorContext } from "./role.service";
import { notificationsEmitter } from "../events/notifications.events";

class NotificationsService {
  async list(params: { page?: number; limit?: number; sort?: "createdAt.desc" | "createdAt.asc"; userId?: string; status?: string; type?: string; search?: string }) {
    try {
      const res = await notificationsRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_NOTIFICATIONS_FAILED", e?.message || "Failed to list notifications");
    }
  }

  async listBroadcasts(params: { page?: number; limit?: number; sort?: "createdAt.desc" | "createdAt.asc"; type?: string; search?: string }) {
    try {
      const res = await notificationsRepository.listBroadcasts(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_BROADCASTS_FAILED", e?.message || "Failed to list broadcasts");
    }
  }

  async sendToRole(input: { roleSlug: string; type: any; title: string; message: string; actionUrl?: string | null; metadata?: any }, actor?: ActorContext) {
    try {
      const userIds = await notificationsRepository.getActiveUserIdsByRoleSlug(input.roleSlug);
      if (!userIds.length) {
        await writeAudit({
          action: "create",
          resource: "notification.broadcast",
          userId: actor?.userId,
          ipAddress: actor?.ip ?? undefined,
          userAgent: actor?.userAgent ?? undefined,
          changes: { type: input.type as any, title: input.title, message: input.message, actionUrl: input.actionUrl ?? null },
          metadata: { roleSlug: input.roleSlug, count: 0, createdCount: 0, targetedCount: 0, reason: "NO_RECIPIENTS" },
        });
        return success({ count: 0, items: [] as any[], createdCount: 0, targetedCount: 0 });
      }
      const res = await notificationsRepository.createMany({ userIds, type: input.type, title: input.title, message: input.message, actionUrl: input.actionUrl ?? null, metadata: input.metadata ?? null });
      try {
        for (const row of res.items) notificationsEmitter.emit({ kind: "created", userId: row.userId, payload: row });
      } catch {}
      await writeAudit({
        action: "create",
        resource: "notification.broadcast",
        userId: actor?.userId,
        ipAddress: actor?.ip ?? undefined,
        userAgent: actor?.userAgent ?? undefined,
        changes: { type: input.type as any, title: input.title, message: input.message, actionUrl: input.actionUrl ?? null },
        metadata: { roleSlug: input.roleSlug, count: res.count, createdCount: res.count, targetedCount: userIds.length },
      });
      return success({ ...res, createdCount: res.count, targetedCount: userIds.length });
    } catch (e: any) {
      return failure("SEND_TO_ROLE_FAILED", e?.message || "Failed to send notifications to role");
    }
  }

  async sendToRoles(input: { roleSlugs?: string[]; all?: boolean; type: any; title: string; message: string; actionUrl?: string | null; metadata?: any }, actor?: ActorContext) {
    try {
      let userIds: string[] = [];
      if (input.all) {
        userIds = await notificationsRepository.getAllActiveUserIds();
      } else if (input.roleSlugs && input.roleSlugs.length) {
        userIds = await notificationsRepository.getActiveUserIdsByRoleSlugs(input.roleSlugs);
      }
      // de-duplicate just in case
      userIds = Array.from(new Set(userIds));
      if (!userIds.length) {
        await writeAudit({
          action: "create",
          resource: "notification.broadcast",
          userId: actor?.userId,
          ipAddress: actor?.ip ?? undefined,
          userAgent: actor?.userAgent ?? undefined,
          changes: { type: input.type as any, title: input.title, message: input.message, actionUrl: input.actionUrl ?? null },
          metadata: { all: Boolean(input.all), roleSlugs: input.roleSlugs || [], count: 0, createdCount: 0, targetedCount: 0, reason: "NO_RECIPIENTS" },
        });
        return success({ count: 0, items: [] as any[], createdCount: 0, targetedCount: 0 });
      }
      const res = await notificationsRepository.createMany({ userIds, type: input.type, title: input.title, message: input.message, actionUrl: input.actionUrl ?? null, metadata: input.metadata ?? null });
      try {
        for (const row of res.items) notificationsEmitter.emit({ kind: "created", userId: row.userId, payload: row });
      } catch {}
      await writeAudit({
        action: "create",
        resource: "notification.broadcast",
        userId: actor?.userId,
        ipAddress: actor?.ip ?? undefined,
        userAgent: actor?.userAgent ?? undefined,
        changes: { type: input.type as any, title: input.title, message: input.message, actionUrl: input.actionUrl ?? null },
        metadata: { all: Boolean(input.all), roleSlugs: input.roleSlugs || [], count: res.count, createdCount: res.count, targetedCount: userIds.length },
      });
      return success({ ...res, createdCount: res.count, targetedCount: userIds.length });
    } catch (e: any) {
      return failure("SEND_TO_ROLES_FAILED", e?.message || "Failed to send notifications to roles");
    }
  }

  async markReadMany(userId: string, ids: string[], actor?: ActorContext) {
    try {
      const clean = Array.isArray(ids) ? ids.filter(Boolean) : [];
      const count = await notificationsRepository.markReadMany(userId, clean);
      await writeAudit({ action: "update", resource: "notification", resourceId: userId, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, metadata: { markReadMany: count } });
      try {
        if (clean.length) notificationsEmitter.emit({ kind: "readMany", userId, payload: { ids: clean } });
      } catch {}
      return success({ count });
    } catch (e: any) {
      return failure("MARK_READ_MANY_FAILED", e?.message || "Failed to mark notifications as read");
    }
  }

  async summary(userId: string, types?: string[]) {
    try {
      const data = await notificationsRepository.unreadSummaryByType(userId, types);
      return success(data);
    } catch (e: any) {
      return failure("SUMMARY_FAILED", e?.message || "Failed to load notification summary");
    }
  }

  async sendToUsers(input: { userIds: string[]; type: any; title: string; message: string; actionUrl?: string | null; metadata?: any }, actor?: ActorContext) {
    try {
      let userIds = Array.isArray(input.userIds) ? input.userIds.filter(Boolean) : [];
      userIds = Array.from(new Set(userIds));
      if (!userIds.length) {
        await writeAudit({
          action: "create",
          resource: "notification.broadcast",
          userId: actor?.userId,
          ipAddress: actor?.ip ?? undefined,
          userAgent: actor?.userAgent ?? undefined,
          changes: { type: input.type as any, title: input.title, message: input.message, actionUrl: input.actionUrl ?? null },
          metadata: { usersCount: 0, count: 0, createdCount: 0, targetedCount: 0, reason: "NO_RECIPIENTS" },
        });
        return success({ count: 0, items: [] as any[], createdCount: 0, targetedCount: 0 });
      }
      const res = await notificationsRepository.createMany({ userIds, type: input.type, title: input.title, message: input.message, actionUrl: input.actionUrl ?? null, metadata: input.metadata ?? null });
      try {
        for (const row of res.items) notificationsEmitter.emit({ kind: "created", userId: row.userId, payload: row });
      } catch {}
      await writeAudit({
        action: "create",
        resource: "notification.broadcast",
        userId: actor?.userId,
        ipAddress: actor?.ip ?? undefined,
        userAgent: actor?.userAgent ?? undefined,
        changes: { type: input.type as any, title: input.title, message: input.message, actionUrl: input.actionUrl ?? null },
        metadata: { usersCount: userIds.length, count: res.count, createdCount: res.count, targetedCount: userIds.length },
      });
      return success({ ...res, createdCount: res.count, targetedCount: userIds.length });
    } catch (e: any) {
      return failure("SEND_TO_USERS_FAILED", e?.message || "Failed to send notifications to users");
    }
  }

  async create(input: { userId: string; type: any; title: string; message: string; actionUrl?: string | null; metadata?: any }, actor?: ActorContext) {
    try {
      const row = await notificationsRepository.create(input);
      await writeAudit({ action: "create", resource: "notification", resourceId: row.id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, changes: input as any });
      try { notificationsEmitter.emit({ kind: "created", userId: row.userId, payload: row }); } catch {}
      return success(row);
    } catch (e: any) {
      return failure("CREATE_NOTIFICATION_FAILED", e?.message || "Failed to create notification");
    }
  }

  async markRead(id: string, actor?: ActorContext) {
    try {
      const row = await notificationsRepository.markRead(id);
      if (!row) return failure("NOT_FOUND", "Notification not found");
      await writeAudit({ action: "update", resource: "notification", resourceId: id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, metadata: { status: "read" } });
      try { notificationsEmitter.emit({ kind: "read", userId: row.userId, payload: { id: row.id } }); } catch {}
      return success(row);
    } catch (e: any) {
      return failure("MARK_READ_FAILED", e?.message || "Failed to mark as read");
    }
  }

  async markAllRead(userId: string, actor?: ActorContext) {
    try {
      const count = await notificationsRepository.markAllRead(userId);
      await writeAudit({ action: "update", resource: "notification", resourceId: userId, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, metadata: { markAllRead: count } });
      try { notificationsEmitter.emit({ kind: "markAll", userId, payload: { count } }); } catch {}
      return success({ count });
    } catch (e: any) {
      return failure("MARK_ALL_READ_FAILED", e?.message || "Failed to mark all as read");
    }
  }

  async archive(id: string, actor?: ActorContext) {
    try {
      const row = await notificationsRepository.archive(id);
      if (!row) return failure("NOT_FOUND", "Notification not found");
      await writeAudit({ action: "update", resource: "notification", resourceId: id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, metadata: { status: "archived" } });
      try { notificationsEmitter.emit({ kind: "archived", userId: row.userId, payload: { id: row.id } }); } catch {}
      return success(row);
    } catch (e: any) {
      return failure("ARCHIVE_NOTIFICATION_FAILED", e?.message || "Failed to archive notification");
    }
  }

  async remove(id: string, actor?: ActorContext) {
    try {
      const ok = await notificationsRepository.remove(id);
      if (!ok) return failure("NOT_FOUND", "Notification not found");
      await writeAudit({ action: "delete", resource: "notification", resourceId: id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined });
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_NOTIFICATION_FAILED", e?.message || "Failed to delete notification");
    }
  }
}

export const notificationsService = new NotificationsService();
