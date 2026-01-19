import { roleRepository, type RoleEntity } from "../repositories/role.repository";
import { permissionRepository } from "../repositories/permission.repository";
import type { ServiceResult } from "../types";
import { success, failure } from "../types";
import { writeAudit } from "../utils/audit";

export interface ListRoleParams {
  page?: number;
  limit?: number;
  q?: string;
  isSystem?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sort?: "createdAt.desc" | "createdAt.asc";
}

export interface UpsertRoleInput {
  name: string;
  slug: string;
  description?: string | null;
  isSystem?: boolean;
  permissions?: string[]; // slugs
}

export interface ActorContext { userId?: string; ip?: string | null; userAgent?: string | null }

class RoleService {
  async list(params: ListRoleParams): Promise<ServiceResult<{ items: RoleEntity[]; total: number }>> {
    try {
      const result = await roleRepository.list(params);
      return success(result);
    } catch (e: any) {
      return failure("LIST_ROLES_FAILED", e?.message || "Failed to list roles");
    }
  }

  async getById(id: string): Promise<ServiceResult<RoleEntity>> {
    try {
      const item = await roleRepository.getById(id);
      if (!item) return failure("NOT_FOUND", "Role not found");
      return success(item);
    } catch (e: any) {
      return failure("GET_ROLE_FAILED", e?.message || "Failed to get role");
    }
  }

  async create(input: UpsertRoleInput, actor?: ActorContext): Promise<ServiceResult<RoleEntity>> {
    try {
      const item = await roleRepository.create(input);
      await writeAudit({
        action: "create",
        resource: "role",
        resourceId: item.id,
        userId: actor?.userId,
        ipAddress: actor?.ip ?? undefined,
        userAgent: actor?.userAgent ?? undefined,
        changes: input as any,
      });
      return success(item);
    } catch (e: any) {
      return failure("CREATE_ROLE_FAILED", e?.message || "Failed to create role");
    }
  }

  async update(id: string, input: UpsertRoleInput, actor?: ActorContext): Promise<ServiceResult<RoleEntity>> {
    try {
      const item = await roleRepository.update(id, input);
      if (!item) return failure("NOT_FOUND", "Role not found");
      await writeAudit({
        action: "update",
        resource: "role",
        resourceId: id,
        userId: actor?.userId,
        ipAddress: actor?.ip ?? undefined,
        userAgent: actor?.userAgent ?? undefined,
        changes: input as any,
      });
      return success(item);
    } catch (e: any) {
      return failure("UPDATE_ROLE_FAILED", e?.message || "Failed to update role");
    }
  }

  async remove(id: string, actor?: ActorContext): Promise<ServiceResult<{ id: string }>> {
    try {
      const item = await roleRepository.getById(id);
      if (!item) return failure("NOT_FOUND", "Role not found");
      if (item.isSystem) return failure("CONFLICT", "Cannot delete a system role");
      const assigned = await roleRepository.countUsers?.(id);
      if (assigned && assigned > 0) return failure("CONFLICT", `Role is assigned to ${assigned} user(s)`);
      const ok = await roleRepository.delete(id);
      if (!ok) return failure("NOT_FOUND", "Role not found");
      await writeAudit({
        action: "delete",
        resource: "role",
        resourceId: id,
        userId: actor?.userId,
        ipAddress: actor?.ip ?? undefined,
        userAgent: actor?.userAgent ?? undefined,
      });
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_ROLE_FAILED", e?.message || "Failed to delete role");
    }
  }

  async listAllPermissions(): Promise<ServiceResult<Awaited<ReturnType<typeof permissionRepository.list>>["items"]>> {
    try {
      const result = await permissionRepository.list({ page: 1, limit: 2000 });
      return success(result.items);
    } catch (e: any) {
      return failure("LIST_PERMISSIONS_FAILED", e?.message || "Failed to list permissions");
    }
  }
}

export const roleService = new RoleService();
