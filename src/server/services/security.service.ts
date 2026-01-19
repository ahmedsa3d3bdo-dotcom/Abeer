import { settingsRepository } from "../repositories/settings.repository";
import type { ServiceResult } from "../types";
import { failure, success } from "../types";
import { writeAudit } from "../utils/audit";
import type { ActorContext } from "./role.service";
import { auditService } from "./audit.service";
import { backupsService } from "./backups.service";

export type SecuritySettings = {
  rateLimit: {
    enabled: boolean;
    contact: { limit: number; windowSec: number };
    newsletter: { limit: number; windowSec: number };
    login: { limit: number; windowSec: number };
    register: { limit: number; windowSec: number };
    reviewsPost: { limit: number; windowSec: number };
    helpfulVote: { limit: number; windowSec: number };
    reportReview: { limit: number; windowSec: number };
  };
  originCheck: {
    enabled: boolean;
    allowedOrigins: string[];
    enforceOnPublicForms: boolean;
    enforceOnAuth: boolean;
    enforceOnReviews: boolean;
  };
  monitoring: {
    alerts: {
      rateLimitSpikes: { enabled: boolean; threshold5m: number };
      repeatedLoginFailures: { enabled: boolean; threshold5m: number };
      originBlocks: { enabled: boolean; threshold5m: number };
    };
    notifications: {
      inAppAdmins: boolean;
      emails: string[];
    };
  };
};

const DEFAULTS: SecuritySettings = {
  rateLimit: {
    enabled: true,
    contact: { limit: 10, windowSec: 60 },
    newsletter: { limit: 10, windowSec: 60 },
    login: { limit: 10, windowSec: 60 },
    register: { limit: 5, windowSec: 60 },
    reviewsPost: { limit: 10, windowSec: 60 },
    helpfulVote: { limit: 30, windowSec: 60 },
    reportReview: { limit: 10, windowSec: 60 },
  },
  originCheck: {
    enabled: true,
    allowedOrigins: [],
    enforceOnPublicForms: true,
    enforceOnAuth: true,
    enforceOnReviews: true,
  },
  monitoring: {
    alerts: {
      rateLimitSpikes: { enabled: true, threshold5m: 50 },
      repeatedLoginFailures: { enabled: true, threshold5m: 20 },
      originBlocks: { enabled: true, threshold5m: 20 },
    },
    notifications: {
      inAppAdmins: true,
      emails: [],
    },
  },
};

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

function toStringArray(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((x) => String(x || "").trim()).filter(Boolean);
}

function toEmailArray(input: unknown) {
  return toStringArray(input)
    .map((x) => x.toLowerCase())
    .filter((x) => x.includes("@"));
}

export class SecurityService {
  private settingKey = "security.settings";
  private cache: { value: SecuritySettings; expiresAt: number } | null = null;

  private normalize(input: any): SecuritySettings {
    return {
      rateLimit: {
        enabled: Boolean(input?.rateLimit?.enabled ?? DEFAULTS.rateLimit.enabled),
        contact: {
          limit: clampInt(input?.rateLimit?.contact?.limit, 1, 10000, DEFAULTS.rateLimit.contact.limit),
          windowSec: clampInt(input?.rateLimit?.contact?.windowSec, 1, 86400, DEFAULTS.rateLimit.contact.windowSec),
        },
        newsletter: {
          limit: clampInt(input?.rateLimit?.newsletter?.limit, 1, 10000, DEFAULTS.rateLimit.newsletter.limit),
          windowSec: clampInt(input?.rateLimit?.newsletter?.windowSec, 1, 86400, DEFAULTS.rateLimit.newsletter.windowSec),
        },
        login: {
          limit: clampInt(input?.rateLimit?.login?.limit, 1, 10000, DEFAULTS.rateLimit.login.limit),
          windowSec: clampInt(input?.rateLimit?.login?.windowSec, 1, 86400, DEFAULTS.rateLimit.login.windowSec),
        },
        register: {
          limit: clampInt(input?.rateLimit?.register?.limit, 1, 10000, DEFAULTS.rateLimit.register.limit),
          windowSec: clampInt(input?.rateLimit?.register?.windowSec, 1, 86400, DEFAULTS.rateLimit.register.windowSec),
        },
        reviewsPost: {
          limit: clampInt(input?.rateLimit?.reviewsPost?.limit, 1, 10000, DEFAULTS.rateLimit.reviewsPost.limit),
          windowSec: clampInt(input?.rateLimit?.reviewsPost?.windowSec, 1, 86400, DEFAULTS.rateLimit.reviewsPost.windowSec),
        },
        helpfulVote: {
          limit: clampInt(input?.rateLimit?.helpfulVote?.limit, 1, 10000, DEFAULTS.rateLimit.helpfulVote.limit),
          windowSec: clampInt(input?.rateLimit?.helpfulVote?.windowSec, 1, 86400, DEFAULTS.rateLimit.helpfulVote.windowSec),
        },
        reportReview: {
          limit: clampInt(input?.rateLimit?.reportReview?.limit, 1, 10000, DEFAULTS.rateLimit.reportReview.limit),
          windowSec: clampInt(input?.rateLimit?.reportReview?.windowSec, 1, 86400, DEFAULTS.rateLimit.reportReview.windowSec),
        },
      },
      originCheck: {
        enabled: Boolean(input?.originCheck?.enabled ?? DEFAULTS.originCheck.enabled),
        allowedOrigins: toStringArray(input?.originCheck?.allowedOrigins),
        enforceOnPublicForms: Boolean(input?.originCheck?.enforceOnPublicForms ?? DEFAULTS.originCheck.enforceOnPublicForms),
        enforceOnAuth: Boolean(input?.originCheck?.enforceOnAuth ?? DEFAULTS.originCheck.enforceOnAuth),
        enforceOnReviews: Boolean(input?.originCheck?.enforceOnReviews ?? DEFAULTS.originCheck.enforceOnReviews),
      },
      monitoring: {
        alerts: {
          rateLimitSpikes: {
            enabled: Boolean(input?.monitoring?.alerts?.rateLimitSpikes?.enabled ?? DEFAULTS.monitoring.alerts.rateLimitSpikes.enabled),
            threshold5m: clampInt(input?.monitoring?.alerts?.rateLimitSpikes?.threshold5m, 1, 100000, DEFAULTS.monitoring.alerts.rateLimitSpikes.threshold5m),
          },
          repeatedLoginFailures: {
            enabled: Boolean(
              input?.monitoring?.alerts?.repeatedLoginFailures?.enabled ?? DEFAULTS.monitoring.alerts.repeatedLoginFailures.enabled,
            ),
            threshold5m: clampInt(
              input?.monitoring?.alerts?.repeatedLoginFailures?.threshold5m,
              1,
              100000,
              DEFAULTS.monitoring.alerts.repeatedLoginFailures.threshold5m,
            ),
          },
          originBlocks: {
            enabled: Boolean(input?.monitoring?.alerts?.originBlocks?.enabled ?? DEFAULTS.monitoring.alerts.originBlocks.enabled),
            threshold5m: clampInt(input?.monitoring?.alerts?.originBlocks?.threshold5m, 1, 100000, DEFAULTS.monitoring.alerts.originBlocks.threshold5m),
          },
        },
        notifications: {
          inAppAdmins: Boolean(input?.monitoring?.notifications?.inAppAdmins ?? DEFAULTS.monitoring.notifications.inAppAdmins),
          emails: toEmailArray(input?.monitoring?.notifications?.emails),
        },
      },
    };
  }

  async getSettings(): Promise<SecuritySettings> {
    const row = await settingsRepository.findByKey(this.settingKey);
    if (!row?.value) return DEFAULTS;
    try {
      const parsed = JSON.parse(row.value);
      return this.normalize({ ...DEFAULTS, ...(parsed || {}) });
    } catch {
      return DEFAULTS;
    }
  }

  async getSettingsCached(): Promise<SecuritySettings> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) return this.cache.value;
    const value = await this.getSettings();
    this.cache = { value, expiresAt: now + 30000 };
    return value;
  }

  async updateSettings(input: Partial<SecuritySettings>, actor?: ActorContext): Promise<ServiceResult<SecuritySettings>> {
    try {
      const current = await this.getSettings();
      const merged = this.normalize({ ...current, ...(input || {}) });
      await settingsRepository.upsertByKey(this.settingKey, {
        value: JSON.stringify(merged),
        type: "json",
        description: "Security settings (rate limiting, CSRF/origin checks)",
        isPublic: false,
      });
      this.cache = { value: merged, expiresAt: Date.now() + 30000 };
      await writeAudit({
        action: "settings_change",
        resource: "security",
        userId: actor?.userId,
        ipAddress: actor?.ip ?? undefined,
        userAgent: actor?.userAgent ?? undefined,
        changes: input as any,
      });
      return success(merged);
    } catch (e: any) {
      return failure("UPDATE_SECURITY_SETTINGS_FAILED", e?.message || "Failed to update security settings");
    }
  }

  async status(): Promise<ServiceResult<any>> {
    try {
      const s = await this.getSettingsCached();
      const controls = {
        rateLimit: { enabled: s.rateLimit.enabled },
        originCheck: { enabled: s.originCheck.enabled },
      };
      const score = [controls.rateLimit.enabled, controls.originCheck.enabled].filter(Boolean).length;
      const posture = score === 2 ? "Strong" : score === 1 ? "Partial" : "Off";

      const isProd = process.env.NODE_ENV === "production";
      const headers = {
        isProd,
        // These are configured globally in next.config.* via `headers()`.
        csp: true,
        hsts: isProd,
      };

      const schedule = await backupsService.getSchedule().catch(() => null);
      const uploadMaxBytes = Math.max(1, Number(process.env.BACKUP_UPLOAD_MAX_BYTES || 200 * 1024 * 1024));
      const backups = {
        schedule,
        uploadMaxBytes,
      };

      const rbac = {
        enabled: true,
      };
      const endpoints = [
        {
          key: "contact",
          label: "Contact form",
          method: "POST",
          path: "/api/storefront/contact",
          rateLimit: { enabled: s.rateLimit.enabled, ...s.rateLimit.contact },
          originCheck: { enabled: s.originCheck.enabled && s.originCheck.enforceOnPublicForms },
        },
        {
          key: "newsletter",
          label: "Newsletter signup",
          method: "POST",
          path: "/api/storefront/newsletter/subscribe",
          rateLimit: { enabled: s.rateLimit.enabled, ...s.rateLimit.newsletter },
          originCheck: { enabled: s.originCheck.enabled && s.originCheck.enforceOnPublicForms },
        },
        {
          key: "login",
          label: "Login",
          method: "POST",
          path: "/api/v1/auth/login",
          rateLimit: { enabled: s.rateLimit.enabled, ...s.rateLimit.login },
          originCheck: { enabled: s.originCheck.enabled && s.originCheck.enforceOnAuth },
        },
        {
          key: "register",
          label: "Register",
          method: "POST",
          path: "/api/v1/auth/register",
          rateLimit: { enabled: s.rateLimit.enabled, ...s.rateLimit.register },
          originCheck: { enabled: s.originCheck.enabled && s.originCheck.enforceOnAuth },
        },
        {
          key: "reviewsPost",
          label: "Create review",
          method: "POST",
          path: "/api/storefront/products/*/reviews",
          rateLimit: { enabled: s.rateLimit.enabled, ...s.rateLimit.reviewsPost },
          originCheck: { enabled: s.originCheck.enabled && s.originCheck.enforceOnReviews },
        },
        {
          key: "helpfulVote",
          label: "Helpful vote",
          method: "POST",
          path: "/api/storefront/reviews/*/helpful",
          rateLimit: { enabled: s.rateLimit.enabled, ...s.rateLimit.helpfulVote },
          originCheck: { enabled: s.originCheck.enabled && s.originCheck.enforceOnReviews },
        },
        {
          key: "reportReview",
          label: "Report review",
          method: "POST",
          path: "/api/storefront/reviews/*/report",
          rateLimit: { enabled: s.rateLimit.enabled, ...s.rateLimit.reportReview },
          originCheck: { enabled: s.originCheck.enabled && s.originCheck.enforceOnReviews },
        },
      ];
      return success({ posture, controls, endpoints, headers, backups, rbac });
    } catch (e: any) {
      return failure("SECURITY_STATUS_FAILED", e?.message || "Failed to load security status");
    }
  }

  async listLogs(params: {
    page?: number;
    limit?: number;
    q?: string;
    action?: string;
    sort?: "createdAt.desc" | "createdAt.asc";
  }): Promise<ServiceResult<{ items: any[]; total: number }>> {
    return auditService.list({
      page: params.page,
      limit: params.limit,
      q: params.q,
      action: params.action,
      resource: "security",
      sort: params.sort,
    });
  }

  resetCache() {
    this.cache = null;
  }
}

export const securityService = new SecurityService();
