CREATE TABLE IF NOT EXISTS "document_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_type" varchar(50) NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"next_seq" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_sequences_doc_type_year_month_uniq" UNIQUE("doc_type","year","month")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_sequences_doc_type_idx" ON "document_sequences" ("doc_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_sequences_year_idx" ON "document_sequences" ("year");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_sequences_month_idx" ON "document_sequences" ("month");
