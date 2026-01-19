import "dotenv/config";

import { healthService } from "@/server/services/health.service";
import { db } from "@/shared/db";
import { notifications } from "@/shared/db/schema/notifications";
import { and, eq, gte, ilike, sql } from "drizzle-orm";

type Opts = {
  endpoint: string;
  keepFailedSchedule: boolean;
};

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  return process.argv[i + 1] ?? "";
}

function boolFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function opts(): Opts {
  const endpoint = String(arg("endpoint") || process.env.HEALTH_TEST_ENDPOINT || "http://localhost:3000/this-route-does-not-exist");
  const keepFailedSchedule = boolFlag("keep");
  return { endpoint, keepFailedSchedule };
}

async function countHealthAlertsSince(since: Date) {
  const where = and(
    eq(notifications.type, "system_alert" as any),
    gte(notifications.createdAt, since as any),
    ilike(notifications.title, "Health check UNHEALTHY%"),
    sql`(${notifications.metadata} ->> 'source') = 'health'`,
  );

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(where as any);

  return Number(count ?? 0) || 0;
}

async function main() {
  const o = opts();

  const beforeSchedule = await healthService.getSchedule();

  const patch = {
    enabled: true,
    intervalMinutes: 1,
    service: String(beforeSchedule.service || "app"),
    smtp: Boolean(beforeSchedule.smtp),
    httpEndpoints: [o.endpoint],
    notifyEmails: [],
    notifyOnDegraded: false,
    notifyCooldownMin: 0,
    keepLast: Number(beforeSchedule.keepLast ?? 200),
    maxAgeDays: Number(beforeSchedule.maxAgeDays ?? 30),
  };

  process.stdout.write(`Setting health schedule httpEndpoints=[${JSON.stringify(o.endpoint)}]\n`);
  await healthService.updateSchedule(patch as any);

  const since = new Date();
  const result = await healthService.runScheduledHealthCheck("manual");

  if (!result.success) {
    throw new Error(`Health check run failed: ${result.error.code} ${result.error.message}`);
  }

  const hc: any = (result.data as any).healthCheck;
  process.stdout.write(`Health check id=${String(hc?.id || "")} status=${String(hc?.status || "")}\n`);

  if (String(hc?.status) !== "unhealthy") {
    throw new Error(`Expected status=unhealthy but got status=${String(hc?.status || "")} (check endpoint ${o.endpoint})`);
  }

  const count = await countHealthAlertsSince(since);
  process.stdout.write(`Admin in-app health alerts created since run: ${count}\n`);

  if (count <= 0) {
    throw new Error(
      "No admin in-app health alerts found. Ensure you have at least one active user with role 'admin' or 'super_admin'.",
    );
  }

  process.stdout.write("OK: Unhealthy health check produced admin in-app notification(s).\n");

  if (!o.keepFailedSchedule) {
    await healthService.updateSchedule(beforeSchedule as any);
    process.stdout.write("Restored previous health schedule.\n");
  } else {
    process.stdout.write("Kept failing schedule (because --keep was provided).\n");
  }
}

main().catch(async (e) => {
  process.stderr.write(String(e?.stack || e?.message || e) + "\n");
  process.exit(1);
});

export {};
