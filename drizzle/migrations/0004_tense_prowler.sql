CREATE TABLE "ugc_review_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"source" varchar(32) DEFAULT 'other' NOT NULL,
	"author" varchar(120),
	"link" text,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_approved" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ugc_review_images_source_idx" ON "ugc_review_images" USING btree ("source");--> statement-breakpoint
CREATE INDEX "ugc_review_images_is_approved_idx" ON "ugc_review_images" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX "ugc_review_images_created_at_idx" ON "ugc_review_images" USING btree ("created_at");