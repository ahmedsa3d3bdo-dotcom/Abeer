CREATE TABLE IF NOT EXISTS "system_metrics_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cpu_usage_pct" integer,
	"mem_used_bytes" bigint,
	"mem_total_bytes" bigint,
	"disk_used_bytes" bigint,
	"disk_total_bytes" bigint,
	"net_rx_bytes" bigint,
	"net_tx_bytes" bigint,
	"net_rx_delta_bytes" bigint,
	"net_tx_delta_bytes" bigint,
	"sample_interval_sec" integer,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_metrics_samples_created_at_idx" ON "system_metrics_samples" USING btree ("created_at");
--> statement-breakpoint
INSERT INTO "permissions" ("id", "name", "slug", "resource", "action", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'View System Metrics', 'system.metrics.view', 'system', 'metrics.view', now(), now()),
  (gen_random_uuid(), 'Manage System Metrics', 'system.metrics.manage', 'system', 'metrics.manage', now(), now())
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
DO $$
BEGIN
  -- Grant view/manage to super_admin
  IF EXISTS (SELECT 1 FROM "roles" WHERE "slug" = 'super_admin') THEN
    INSERT INTO "role_permissions" ("role_id", "permission_id")
    SELECT r.id, p.id
    FROM "roles" r
    JOIN "permissions" p ON p.slug IN ('system.metrics.view', 'system.metrics.manage')
    WHERE r.slug = 'super_admin'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Grant view to admin
  IF EXISTS (SELECT 1 FROM "roles" WHERE "slug" = 'admin') THEN
    INSERT INTO "role_permissions" ("role_id", "permission_id")
    SELECT r.id, p.id
    FROM "roles" r
    JOIN "permissions" p ON p.slug IN ('system.metrics.view')
    WHERE r.slug = 'admin'
    ON CONFLICT DO NOTHING;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;
