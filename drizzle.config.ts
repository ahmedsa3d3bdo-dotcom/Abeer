import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const env = (key: string): string | undefined => process.env[key];
const env2 = (primary: string, secondary: string): string | undefined => env(primary) ?? env(secondary);

const requiredEnv2 = (primary: string, secondary: string): string => {
  const value = env2(primary, secondary);
  if (!value) {
    throw new Error(`Missing required env var: ${primary} (or ${secondary})`);
  }
  return value;
};

export default defineConfig({
  schema: "./src/shared/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: env2("DB_HOST", "DATABASE_HOST") ?? "localhost",
    port: env2("DB_PORT", "DATABASE_PORT") ? Number(env2("DB_PORT", "DATABASE_PORT")) : 5432,
    user: env2("DB_USER", "DATABASE_USER") ?? "",
    password: requiredEnv2("DB_PASSWORD", "DATABASE_PASSWORD"),
    database: requiredEnv2("DB_NAME", "DATABASE_NAME"),
    ssl: false,
  },
  verbose: true,
  strict: true,
});
