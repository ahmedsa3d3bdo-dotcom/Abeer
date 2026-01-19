ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "applied_discount_id" uuid;
ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "applied_discount_code" varchar(50);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "carts" ADD CONSTRAINT "carts_applied_discount_id_discounts_id_fk" FOREIGN KEY ("applied_discount_id") REFERENCES "discounts"("id") ON DELETE set null;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
