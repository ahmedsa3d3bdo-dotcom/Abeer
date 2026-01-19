ALTER TABLE "refunds" ADD COLUMN IF NOT EXISTS "refund_number" varchar(50);

-- Backfill existing rows (best-effort)
UPDATE "refunds"
SET "refund_number" = COALESCE("refund_number", CONCAT('REF-', LEFT(REPLACE("id"::text, '-', ''), 8)))
WHERE "refund_number" IS NULL;

ALTER TABLE "refunds" ALTER COLUMN "refund_number" SET NOT NULL;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "refunds_refund_number_idx" ON "refunds" ("refund_number");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "shipment_number" varchar(50);

-- Backfill existing rows (best-effort)
UPDATE "shipments"
SET "shipment_number" = COALESCE("shipment_number", CONCAT('SHP-', LEFT(REPLACE("id"::text, '-', ''), 8)))
WHERE "shipment_number" IS NULL;

ALTER TABLE "shipments" ALTER COLUMN "shipment_number" SET NOT NULL;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "shipments_shipment_number_idx" ON "shipments" ("shipment_number");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
