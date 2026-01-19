import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

dotenv.config();

const env = (key: string): string | undefined => process.env[key];
const env2 = (primary: string, secondary: string): string | undefined => env(primary) ?? env(secondary);

const parsePort = (): number => {
  const raw = env2("DB_PORT", "DATABASE_PORT");
  const parsed = raw ? Number(raw) : 5432;
  return Number.isFinite(parsed) ? parsed : 5432;
};

async function runMigrations() {
  const pool = new Pool({
  host: env2("DB_HOST", "DATABASE_HOST") ?? "localhost",
 port: parsePort(),
  user:  env2("DB_USER", "DATABASE_USER"),
  password:  env2("DB_PASSWORD", "DATABASE_PASSWORD"),
  database: env2("DB_NAME", "DATABASE_NAME"),
  });

  const db = drizzle(pool);

  try {
    console.log("🔄 Running migrations...");
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    console.log("✅ Migration process complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration process failed:", error);
    process.exit(1);
  });
