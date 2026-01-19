import { settingsRepository } from "../repositories/settings.repository";
import type { ServiceResult } from "../types";
import { success, failure } from "../types";
import { writeAudit } from "../utils/audit";
import type { ActorContext } from "./role.service";

export class SettingsService {
  async list(params: { page?: number; limit?: number; q?: string; isPublic?: boolean; sort?: "createdAt.desc" | "createdAt.asc" }) {
    try {
      const res = await settingsRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_SETTINGS_FAILED", e?.message || "Failed to list settings");
    }
  }

  async getById(id: string) {
    try {
      const item = await settingsRepository.getById(id);
      if (!item) return failure("NOT_FOUND", "Setting not found");
      return success(item);
    } catch (e: any) {
      return failure("GET_SETTING_FAILED", e?.message || "Failed to get setting");
    }
  }

  async create(input: { key: string; value: string; type?: string; description?: string | null; isPublic?: boolean }, actor?: ActorContext) {
    try {
      const item = await settingsRepository.create(input);
      await writeAudit({ action: "create", resource: "system_setting", resourceId: item.id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, changes: input as any });
      return success(item);
    } catch (e: any) {
      return failure("CREATE_SETTING_FAILED", e?.message || "Failed to create setting");
    }
  }

  async update(id: string, patch: Partial<{ key: string; value: string; type: string; description: string | null; isPublic: boolean }>, actor?: ActorContext) {
    try {
      const item = await settingsRepository.update(id, patch);
      if (!item) return failure("NOT_FOUND", "Setting not found");
      await writeAudit({ action: "update", resource: "system_setting", resourceId: id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, changes: patch as any });
      return success(item);
    } catch (e: any) {
      return failure("UPDATE_SETTING_FAILED", e?.message || "Failed to update setting");
    }
  }

  async remove(id: string, actor?: ActorContext): Promise<ServiceResult<{ id: string }>> {
    try {
      const ok = await settingsRepository.delete(id);
      if (!ok) return failure("NOT_FOUND", "Setting not found");
      await writeAudit({ action: "delete", resource: "system_setting", resourceId: id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined });
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_SETTING_FAILED", e?.message || "Failed to delete setting");
    }
  }
}

export const settingsService = new SettingsService();
