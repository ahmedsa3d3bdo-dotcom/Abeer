CREATE TABLE IF NOT EXISTS "system_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" varchar(20) NOT NULL,
	"source" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"request_id" varchar(100),
	"path" text,
	"method" varchar(10),
	"status_code" integer,
	"user_id" uuid,
	"user_email" varchar(255),
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'product_variants'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'reserved_quantity'
    ) THEN
      ALTER TABLE "product_variants" ADD COLUMN "reserved_quantity" integer DEFAULT 0 NOT NULL;
    END IF;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_logs_created_at_idx" ON "system_logs" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "system_logs_level_idx" ON "system_logs" USING btree ("level");
CREATE INDEX IF NOT EXISTS "system_logs_source_idx" ON "system_logs" USING btree ("source");
CREATE INDEX IF NOT EXISTS "system_logs_user_id_idx" ON "system_logs" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "system_logs_request_id_idx" ON "system_logs" USING btree ("request_id");
