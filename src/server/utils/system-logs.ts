import { db } from "@/shared/db";
import { systemLogs } from "@/shared/db/schema/system";

function redact(value: unknown, depth: number = 0): unknown {
  if (depth > 4) return undefined;
  if (value == null) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = k.toLowerCase();
      if (key.includes("password") || key.includes("token") || key.includes("authorization") || key.includes("cookie")) {
        out[k] = "[REDACTED]";
        continue;
      }
      out[k] = redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export type WriteSystemLogInput = {
  level: string;
  source: string;
  message: string;
  stack?: string;
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export async function writeSystemLog(input: WriteSystemLogInput) {
  try {
    await db.insert(systemLogs).values({
      level: String(input.level || "error"),
      source: String(input.source || "server"),
      message: String(input.message || ""),
      stack: input.stack ? String(input.stack) : null,
      requestId: input.requestId ? String(input.requestId) : null,
      path: input.path ? String(input.path) : null,
      method: input.method ? String(input.method) : null,
      statusCode: typeof input.statusCode === "number" ? input.statusCode : null,
      userId: (input.userId as any) ?? null,
      userEmail: input.userEmail ? String(input.userEmail) : null,
      ipAddress: input.ipAddress ? String(input.ipAddress) : null,
      userAgent: input.userAgent ? String(input.userAgent) : null,
      metadata: input.metadata ? (redact(input.metadata) as any) : null,
    } as any);
  } catch (e) {
    console.error("Failed to write system log", e);
  }
}
