import { permissionRepository, type PermissionEntity } from "../repositories/permission.repository";
import type { ServiceResult } from "../types";
import { success, failure } from "../types";
import { writeAudit } from "../utils/audit";
import type { ActorContext } from "./role.service";

export interface ListPermissionParams {
  page?: number;
  limit?: number;
  q?: string;
  resource?: string;
  action?: string;
  sort?: "createdAt.desc" | "createdAt.asc";
}

export interface UpsertPermissionInput {
  name: string;
  slug: string;
  resource: string;
  action: string;
  description?: string | null;
}

class PermissionService {
  async list(params: ListPermissionParams): Promise<ServiceResult<{ items: PermissionEntity[]; total: number }>> {
    try {
      const result = await permissionRepository.list(params);
      return success(result);
    } catch (e: any) {
      return failure("LIST_PERMISSIONS_FAILED", e?.message || "Failed to list permissions");
    }
  }

  async getById(id: string): Promise<ServiceResult<PermissionEntity>> {
    try {
      const item = await permissionRepository.getById(id);
      if (!item) return failure("NOT_FOUND", "Permission not found");
      return success(item);
    } catch (e: any) {
      return failure("GET_PERMISSION_FAILED", e?.message || "Failed to get permission");
    }
  }

  async create(input: UpsertPermissionInput, actor?: ActorContext): Promise<ServiceResult<PermissionEntity>> {
    try {
      const item = await permissionRepository.create(input);
      await writeAudit({
        action: "create",
        resource: "permission",
        resourceId: item.id,
        userId: actor?.userId,
        ipAddress: actor?.ip ?? undefined,
        userAgent: actor?.userAgent ?? undefined,
        changes: input as any,
      });
      return success(item);
    } catch (e: any) {
      return failure("CREATE_PERMISSION_FAILED", e?.message || "Failed to create permission");
    }
  }

  async update(id: string, input: UpsertPermissionInput, actor?: ActorContext): Promise<ServiceResult<PermissionEntity>> {
    try {
      const item = await permissionRepository.update(id, input);
      if (!item) return failure("NOT_FOUND", "Permission not found");
      await writeAudit({
        action: "update",
        resource: "permission",
        resourceId: id,
        userId: actor?.userId,
        ipAddress: actor?.ip ?? undefined,
        userAgent: actor?.userAgent ?? undefined,
        changes: input as any,
      });
      return success(item);
    } catch (e: any) {
      return failure("UPDATE_PERMISSION_FAILED", e?.message || "Failed to update permission");
    }
  }

  async remove(id: string, actor?: ActorContext): Promise<ServiceResult<{ id: string }>> {
    try {
      const usage = await permissionRepository.countRolesByPermissionId(id);
      if (usage > 0) {
        return failure("CONFLICT", `Permission is used by ${usage} role(s)`);
      }
      const ok = await permissionRepository.delete(id);
      if (!ok) return failure("NOT_FOUND", "Permission not found");
      await writeAudit({
        action: "delete",
        resource: "permission",
        resourceId: id,
        userId: actor?.userId,
        ipAddress: actor?.ip ?? undefined,
        userAgent: actor?.userAgent ?? undefined,
      });
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_PERMISSION_FAILED", e?.message || "Failed to delete permission");
    }
  }

  async resources(): Promise<ServiceResult<string[]>> {
    try {
      const items = await permissionRepository.distinctResources();
      return success(items);
    } catch (e: any) {
      return failure("LIST_RESOURCES_FAILED", e?.message || "Failed to list resources");
    }
  }
}

export const permissionService = new PermissionService();
