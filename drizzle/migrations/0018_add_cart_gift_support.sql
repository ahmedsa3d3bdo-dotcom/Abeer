ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "gift_suppressions" jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "is_gift" boolean NOT NULL DEFAULT false;
ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "gift_discount_id" uuid;

CREATE INDEX IF NOT EXISTS "cart_items_is_gift_idx" ON "cart_items" ("is_gift");
CREATE INDEX IF NOT EXISTS "cart_items_gift_discount_id_idx" ON "cart_items" ("gift_discount_id");
