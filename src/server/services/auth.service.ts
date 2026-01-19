import * as bcrypt from "bcryptjs";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { userRepository, type UserWithRoles } from "../repositories/user.repository";
import type { LoginCredentials, RegisterData, AuthUser, ServiceResult } from "../types";
import { success, failure } from "../types";
import { notificationsService } from "./notifications.service";

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<ServiceResult<AuthUser>> {
    try {
      // Check if email already exists
      const emailExists = await userRepository.emailExists(data.email);
      if (emailExists) {
        return failure("EMAIL_EXISTS", "Email address is already registered");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await userRepository.createUser({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      // Assign default user role
      await userRepository.assignRole(user.id, "user");

      // Notify admins
      try {
        await notificationsService.sendToRoles(
          {
            roleSlugs: ["super_admin", "admin"],
            type: "customer_registered" as any,
            title: "New customer registered",
            message: `${data.email} just created an account`,
            actionUrl: "/dashboard/customers",
            metadata: {
              entity: "customer",
              entityId: user.id,
              email: data.email,
            },
          },
          { userId: user.id },
        );
      } catch {}

      // Fetch user with roles
      const userWithRoles = await userRepository.findByIdWithRoles(user.id);
      if (!userWithRoles) {
        return failure("USER_NOT_FOUND", "User was created but could not be retrieved");
      }

      return success(userRepository.toAuthUser(userWithRoles));
    } catch (error) {
      console.error("Registration error:", error);
      return failure("REGISTRATION_FAILED", error instanceof Error ? error.message : "Registration failed");
    }
  }

  /**
   * Login user with credentials
   */
  async login(credentials: LoginCredentials, ipAddress: string): Promise<ServiceResult<AuthUser>> {
    try {
      // Find user by email
      const user = await userRepository.findByEmail(credentials.email);
      if (!user) {
        return failure("INVALID_CREDENTIALS", "Invalid email or password");
      }

      // Check if user is active
      if (!user.isActive) {
        return failure("ACCOUNT_DISABLED", "Your account has been disabled");
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(credentials.password, user.password);
      if (!isValidPassword) {
        return failure("INVALID_CREDENTIALS", "Invalid email or password");
      }

      // Update last login
      await userRepository.updateLastLogin(user.id, ipAddress);

      return success(userRepository.toAuthUser(user));
    } catch (error) {
      console.error("Login error:", error);
      return failure("LOGIN_FAILED", error instanceof Error ? error.message : "Login failed");
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<ServiceResult<AuthUser>> {
    try {
      const user = await userRepository.findByIdWithRoles(userId);
      if (!user) {
        return failure("USER_NOT_FOUND", "User not found");
      }

      return success(userRepository.toAuthUser(user));
    } catch (error) {
      console.error("Get user error:", error);
      return failure("GET_USER_FAILED", error instanceof Error ? error.message : "Failed to get user");
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string): Promise<ServiceResult<boolean>> {
    try {
      await userRepository.verifyEmail(userId);
      return success(true);
    } catch (error) {
      console.error("Verify email error:", error);
      return failure("VERIFY_EMAIL_FAILED", error instanceof Error ? error.message : "Failed to verify email");
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const user = await userRepository.findByIdWithRoles(userId);
      if (!user) return false;

      return user.permissions.some((p) => p.slug === permission);
    } catch (error) {
      console.error("Permission check error:", error);
      return false;
    }
  }

  /**
   * Check if user has role
   */
  async hasRole(userId: string, role: string): Promise<boolean> {
    try {
      const user = await userRepository.findByIdWithRoles(userId);
      if (!user) return false;

      return user.roles.some((r) => r.slug === role);
    } catch (error) {
      console.error("Role check error:", error);
      return false;
    }
  }

  /**
   * Validate a password reset token
   */
  async validateResetToken(token: string): Promise<ServiceResult<{ userId: string; email: string }>> {
    try {
      const [row] = await db
        .select({
          id: schema.passwordResetTokens.id,
          userId: schema.passwordResetTokens.userId,
          token: schema.passwordResetTokens.token,
          expiresAt: schema.passwordResetTokens.expiresAt,
          usedAt: schema.passwordResetTokens.usedAt,
          email: schema.users.email,
        })
        .from(schema.passwordResetTokens)
        .innerJoin(schema.users, eq(schema.users.id, schema.passwordResetTokens.userId as any))
        .where(eq(schema.passwordResetTokens.token, token))
        .limit(1);

      if (!row) return failure("INVALID_TOKEN", "Reset link is invalid");
      if (row.usedAt) return failure("TOKEN_USED", "Reset link has already been used");
      if (new Date(row.expiresAt) < new Date()) return failure("TOKEN_EXPIRED", "Reset link has expired");
      return success({ userId: row.userId as any, email: row.email as any });
    } catch (error) {
      return failure("TOKEN_VALIDATE_FAILED", error instanceof Error ? error.message : "Failed to validate token");
    }
  }

  /**
   * Apply a new password using a valid token
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<ServiceResult<boolean>> {
    try {
      // Validate
      const valid = await this.validateResetToken(token);
      if (!valid.success) return failure(valid.error.code, valid.error.message);

      const hashed = await bcrypt.hash(newPassword, 10);
      await db.transaction(async (tx) => {
        await tx.update(schema.users).set({ password: hashed as any }).where(eq(schema.users.id, valid.data!.userId as any));
        await tx
          .update(schema.passwordResetTokens)
          .set({ usedAt: new Date() as any })
          .where(eq(schema.passwordResetTokens.token, token));
      });
      return success(true);
    } catch (error) {
      return failure("RESET_PASSWORD_FAILED", error instanceof Error ? error.message : "Failed to reset password");
    }
  }
}

// Singleton instance
export const authService = new AuthService();
