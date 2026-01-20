import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dotenv from "dotenv";

import * as schema from "./schema";

// Load environment variables
dotenv.config();
const g = globalThis as any;

const env = (key: string): string | undefined => process.env[key];
const env2 = (primary: string, secondary: string): string | undefined => env(primary) ?? env(secondary);
const parsePort = (): number => {
  const raw = env2("DB_PORT", "DATABASE_PORT");
  const parsed = raw ? Number(raw) : 5432;
  return Number.isFinite(parsed) ? parsed : 5432;
};
// TEMPORARY: Hardcoded connection for debugging
// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-explicit-any
const pool: Pool = (() => {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-underscore-dangle
    const existing = g.__pgPool as Pool | undefined;
    if (existing) return existing;
  }

  const created = new Pool({
    host: env2("DB_HOST", "DATABASE_HOST") ?? "localhost",
    port: parsePort(),
    user: env2("DB_USER", "DATABASE_USER"),
    password: env2("DB_PASSWORD", "DATABASE_PASSWORD"),
    database: env2("DB_NAME", "DATABASE_NAME"),
    max: 30,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 30000,
    statement_timeout: 30000,
    keepAlive: true,
    application_name: "AbeerShop",
    ssl: false,
  });

  created.on("connect", (client) => {
    // Ensure consistent timestamp behavior for timestamp columns without timezone.
    // node-postgres parses 'timestamp without time zone' as UTC.
    // Setting the session time zone to UTC prevents double-offset issues.
    void client.query("SET TIME ZONE 'UTC'").catch(() => {});

    client.on("error", (err) => {
      console.error("Postgres client error:", err);
    });
  });

  created.on("error", (err) => {
    console.error("Postgres pool error:", err);
  });

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-underscore-dangle
    g.__pgPool = created;
  }

  return created;
})();

// Initialize Drizzle instance
// eslint-disable-next-line no-underscore-dangle
const _db = g.__drizzleDb ?? drizzle(pool, { schema });
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-underscore-dangle
  g.__drizzleDb = _db;
}
export const db = _db;

// Export schema for use in queries
export { schema };

// Health check function
export async function checkDatabaseConnection() {
  try {
    const client = await (pool as Pool).connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection() {
  await (pool as Pool).end();
}