ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_method_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_method_id_shipping_methods_id_fk" FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_methods"("id") ON DELETE set null;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_shipping_method_id_idx" ON "orders" ("shipping_method_id");
