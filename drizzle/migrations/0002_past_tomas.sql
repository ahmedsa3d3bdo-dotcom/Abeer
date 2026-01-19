ALTER TABLE "orders" ALTER COLUMN "currency" SET DEFAULT 'CAD';--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "currency" SET DEFAULT 'CAD';--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'CAD';--> statement-breakpoint
ALTER TABLE "refunds" ALTER COLUMN "currency" SET DEFAULT 'CAD';