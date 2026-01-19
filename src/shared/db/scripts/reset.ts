import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const env = (key: string): string | undefined => process.env[key];
const env2 = (primary: string, secondary: string): string | undefined => env(primary) ?? env(secondary);

const requireEnv2 = (primary: string, secondary: string): string => {
  const value = env2(primary, secondary);
  if (!value) {
    throw new Error(`Missing required env var: ${primary} (or ${secondary})`);
  }
  return value;
};

const parsePort = (): number => {
  const raw = env2("DB_PORT", "DATABASE_PORT");
  const parsed = raw ? Number(raw) : 5432;
  return Number.isFinite(parsed) ? parsed : 5432;
};

const assertSafeDbName = (dbName: string): void => {
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error(`Invalid DB_NAME/DATABASE_NAME: "${dbName}". Use only letters, numbers, and underscore.`);
  }
};

async function resetDatabase() {
  const dbName = requireEnv2("DB_NAME", "DATABASE_NAME");
  assertSafeDbName(dbName);

  const client = new Client({
    host: env2("DB_HOST", "DATABASE_HOST") ?? "localhost",
    port: parsePort(),
    user: requireEnv2("DB_USER", "DATABASE_USER"),
    password: requireEnv2("DB_PASSWORD", "DATABASE_PASSWORD"),
    database: env2("DB_ADMIN_NAME", "DATABASE_ADMIN_NAME") ?? "postgres",
  });

  try {
    await client.connect();
    console.log("✅ Connected to PostgreSQL");

    console.log("🔄 Resetting database...");

    // Terminate connections
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
      AND pid <> pg_backend_pid()
    `, [dbName]);

    // Drop and recreate
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`✅ Dropped database "${dbName}"`);

    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✅ Created database "${dbName}"`);

    console.log("✅ Database reset successfully");
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    throw error;
  } finally {
    await client.end();
  }
}

resetDatabase()
  .then(() => {
    console.log("✅ Database reset complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Database reset failed:", error);
    process.exit(1);
  });
