import { getRedisClient } from "@/lib/redis";

import { notificationsService } from "./notifications.service";
import { emailsService } from "./emails.service";
import { securityService } from "./security.service";
import { writeAudit } from "../utils/audit";

type AlertKind = "rateLimitSpikes" | "originBlocks" | "repeatedLoginFailures";

type AlertEvent = {
  kind: AlertKind;
  count: number;
  threshold5m: number;
  windowMinutes: number;
};

function cooldownMs() {
  const minutes = Number(process.env.SECURITY_ALERT_COOLDOWN_MINUTES || 15);
  if (!Number.isFinite(minutes) || minutes <= 0) return 15 * 60_000;
  return Math.trunc(minutes * 60_000);
}

function titleFor(kind: AlertKind) {
  if (kind === "rateLimitSpikes") return "Security alert: rate limit spikes";
  if (kind === "originBlocks") return "Security alert: origin blocks";
  return "Security alert: repeated login failures";
}

function messageFor(ev: AlertEvent) {
  const base = `Detected ${ev.count} event(s) in the last ${ev.windowMinutes} minutes (threshold: ${ev.threshold5m}).`;
  if (ev.kind === "rateLimitSpikes") return `${base} Your public endpoints may be under abuse.`;
  if (ev.kind === "originBlocks") return `${base} There are requests with invalid/untrusted origin.`;
  return `${base} Consider investigating suspicious login attempts.`;
}

class SecurityAlertsService {
  private windowMs = 5 * 60_000;

  private counterKey(kind: AlertKind) {
    return `security:alerts:${kind}:count`;
  }

  private cooldownKey(kind: AlertKind) {
    return `security:alerts:${kind}:cooldown`;
  }

  async record(kind: AlertKind) {
    const settings = await securityService.getSettingsCached();
    const rule = settings.monitoring.alerts[kind];
    if (!rule?.enabled) return;

    const threshold5m = Math.max(1, Number(rule.threshold5m || 1));

    const redis = await getRedisClient();
    if (!redis) return;

    try {
      const key = this.counterKey(kind);
      const count = await redis.incr(key);
      if (count === 1) await redis.pExpire(key, this.windowMs);

      if (count < threshold5m) return;

      const cdKey = this.cooldownKey(kind);
      const cd = await redis.set(cdKey, "1", { PX: cooldownMs(), NX: true });
      if (cd !== "OK") return;

      const ev: AlertEvent = {
        kind,
        count,
        threshold5m,
        windowMinutes: 5,
      };

      const baseTitle = titleFor(kind);
      const stamp = new Date().toISOString();
      const title = `${baseTitle} (${stamp})`;
      const message = messageFor(ev);
      const actionUrl = "/dashboard/security?tab=monitoring";

      if (settings.monitoring.notifications.inAppAdmins) {
        const res = await notificationsService.sendToRoles({
          roleSlugs: ["super_admin", "admin"],
          type: "system_alert" as any,
          title,
          message,
          actionUrl,
          metadata: ev,
        });

        if (!res.success) {
          try {
            await writeAudit({
              action: "create",
              resource: "security",
              metadata: {
                kind: "system_alert_inapp_failed",
                alertKind: kind,
                error: res.error,
              },
            });
          } catch {}
        } else {
          const createdCount = Number((res.data as any)?.createdCount ?? (res.data as any)?.count ?? 0) || 0;
          const targetedCount = Number((res.data as any)?.targetedCount ?? 0) || 0;
          try {
            await writeAudit({
              action: "create",
              resource: "security",
              metadata: {
                kind: "system_alert_inapp_result",
                alertKind: kind,
                createdCount,
                targetedCount,
              },
            });
          } catch {}
        }
      } else {
        try {
          await writeAudit({
            action: "create",
            resource: "security",
            metadata: {
              kind: "system_alert_inapp_skipped",
              alertKind: kind,
              reason: "IN_APP_ADMINS_DISABLED",
            },
          });
        } catch {}
      }

      const emails = Array.isArray(settings.monitoring.notifications.emails) ? settings.monitoring.notifications.emails : [];
      if (emails.length) {
        for (const to of emails) {
          try {
            await emailsService.send({ to, subject: baseTitle, text: message, metadata: ev });
          } catch {}
        }
      }
    } catch {}
  }

  async recordRateLimitBlock() {
    return this.record("rateLimitSpikes");
  }

  async recordOriginBlock() {
    return this.record("originBlocks");
  }

  async recordLoginFailure() {
    return this.record("repeatedLoginFailures");
  }
}

export const securityAlertsService = new SecurityAlertsService();
