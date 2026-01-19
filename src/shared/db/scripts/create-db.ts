import * as dotenv from "dotenv";
import { Client } from "pg";

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

async function createDatabase() {
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

    // Check if database exists
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);

    if (res.rowCount && res.rowCount > 0) {
      console.log(`ℹ️  Database "${dbName}" already exists`);
    } else {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully`);
    }
  } catch (error) {
    console.error("❌ Error creating database:", error);
    throw error;
  } finally {
    await client.end();
  }
}

createDatabase()
  .then(() => {
    console.log("✅ Database setup complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  });
