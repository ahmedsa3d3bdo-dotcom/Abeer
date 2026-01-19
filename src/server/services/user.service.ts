import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { userRepository, type UserWithRoles } from "../repositories/user.repository";
import type { ServiceResult } from "../types";
import { success, failure } from "../types";
import * as bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { emailsService } from "../services/emails.service";
import { notificationsService } from "./notifications.service";

export interface ListUserParams {
  page?: number;
  limit?: number;
  q?: string;
  role?: string;
  isActive?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sort?: "createdAt.desc" | "createdAt.asc";
}

export interface UpsertUserInput {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  avatar?: string;
  roles?: string[];
}

class UserService {
  async list(params: ListUserParams): Promise<ServiceResult<{ items: UserWithRoles[]; total: number }>> {
    try {
      const result = await userRepository.list(params);
      return success(result);
    } catch (e: any) {
      return failure("LIST_USERS_FAILED", e?.message || "Failed to list users");
    }
  }

  async getById(id: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      const user = await userRepository.getById(id);
      if (!user) return failure("NOT_FOUND", "User not found");
      return success(user);
    } catch (e: any) {
      return failure("GET_USER_FAILED", e?.message || "Failed to get user");
    }
  }

  async create(input: UpsertUserInput): Promise<ServiceResult<UserWithRoles>> {
    try {
      const exists = await userRepository.emailExists(input.email);
      if (exists) return failure("EMAIL_EXISTS", "Email already registered");
      const hashed = input.password ? await bcrypt.hash(input.password, 10) : undefined;
      const created = await userRepository.createUser({
        email: input.email,
        password: hashed || "",
        firstName: input.firstName || "",
        lastName: input.lastName || "",
      });
      if (input.roles?.length) await userRepository.setUserRoles(created.id, input.roles);
      const user = await userRepository.getById(created.id);
      if (!user) return failure("CREATE_FAILED", "User not created");
      return success(user);
    } catch (e: any) {
      return failure("CREATE_USER_FAILED", e?.message || "Failed to create user");
    }
  }

  async update(id: string, input: Partial<UpsertUserInput>): Promise<ServiceResult<UserWithRoles>> {
    try {
      const before = await userRepository.getById(id);
      const patch: any = { };
      if (typeof input.email === "string") patch.email = input.email;
      if (typeof input.firstName !== "undefined") patch.firstName = input.firstName;
      if (typeof input.lastName !== "undefined") patch.lastName = input.lastName;
      if (typeof input.isActive === "boolean") patch.isActive = input.isActive;
      if (typeof input.avatar === "string") patch.avatar = input.avatar;
      if (input.password) patch.password = await bcrypt.hash(input.password, 10);
      const updated = await userRepository.updateUser(id, patch);
      if (!updated) return failure("NOT_FOUND", "User not found");
      if (Array.isArray(input.roles)) await userRepository.setUserRoles(id, input.roles);
      const user = await userRepository.getById(id);
      if (!user) return failure("NOT_FOUND", "User not found");
      // Account security notifications
      try {
        if (before) {
          const userId = id;
          if (typeof input.password === "string" && input.password.length) {
            await notificationsService.create(
              { userId, type: "system_alert" as any, title: "Password changed", message: "Your account password was changed", actionUrl: "/account/settings" },
              { userId },
            );
          }
          if (typeof input.email === "string" && input.email && input.email !== (before as any)?.email) {
            await notificationsService.create(
              { userId, type: "system_alert" as any, title: "Email changed", message: `Your account email was changed to ${input.email}`, actionUrl: "/account/settings" },
              { userId },
            );
          }
        }
      } catch {}
      return success(user);
    } catch (e: any) {
      return failure("UPDATE_USER_FAILED", e?.message || "Failed to update user");
    }
  }

  async remove(id: string): Promise<ServiceResult<{ id: string }>> {
    try {
      const ok = await userRepository.deleteUser(id);
      if (!ok) return failure("NOT_FOUND", "User not found");
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_USER_FAILED", e?.message || "Failed to delete user");
    }
  }

  async listRoles(): Promise<ServiceResult<Array<{ id: string; name: string; slug: string }>>> {
    try {
      const rows = await db.select({ id: schema.roles.id, name: schema.roles.name, slug: schema.roles.slug }).from(schema.roles).orderBy(schema.roles.name);
      return success(rows);
    } catch (e: any) {
      return failure("LIST_ROLES_FAILED", e?.message || "Failed to list roles");
    }
  }

  async resetPassword(userId: string, baseUrl: string, actor?: { userId?: string; ip?: string | null; userAgent?: string | null }): Promise<ServiceResult<{ token: string; expiresAt: Date }>> {
    try {
      const user = await userRepository.getById(userId);
      if (!user) return failure("NOT_FOUND", "User not found");

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await db.insert(schema.passwordResetTokens).values({ userId: userId as any, token, expiresAt }).returning();

      const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
      const subject = "Reset your password";
      const html = `
        <p>Hello${user.firstName ? ` ${user.firstName}` : ""},</p>
        <p>You (or an administrator) requested a password reset for your account.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a>. This link will expire in 1 hour.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `;

      await emailsService.send(
        { to: user.email, subject, html, userId },
        { userId: actor?.userId, ip: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined } as any,
      );
      // In-app notification for security awareness
      try {
        await notificationsService.create(
          { userId, type: "system_alert" as any, title: "Password reset requested", message: "A password reset was requested for your account", actionUrl: "/reset-password" },
          { userId: actor?.userId },
        );
      } catch {}

      return success({ token, expiresAt });
    } catch (e: any) {
      return failure("RESET_PASSWORD_FAILED", e?.message || "Failed to create reset token");
    }
  }

  async setPassword(userId: string, newPassword: string): Promise<ServiceResult<{ id: string }>> {
    try {
      const user = await userRepository.getById(userId);
      if (!user) return failure("NOT_FOUND", "User not found");
      const hashed = await bcrypt.hash(newPassword, 10);
      await db.update(schema.users).set({ password: hashed as any }).where(eq(schema.users.id, userId as any));
      try {
        await notificationsService.create(
          { userId, type: "system_alert" as any, title: "Password changed", message: "Your account password was changed", actionUrl: "/account/settings" },
          { userId },
        );
      } catch {}
      return success({ id: userId });
    } catch (e: any) {
      return failure("SET_PASSWORD_FAILED", e?.message || "Failed to update password");
    }
  }

  async resetPasswordByEmail(email: string, baseUrl: string): Promise<ServiceResult<{ ok: true }>> {
    try {
      const user = await userRepository.findByEmail(email);
      if (!user) {
        return success({ ok: true });
      }
      await this.resetPassword(user.id, baseUrl);
      return success({ ok: true });
    } catch (e: any) {
      return failure("RESET_PASSWORD_FAILED", e?.message || "Failed to process request");
    }
  }
}

export const userService = new UserService();
