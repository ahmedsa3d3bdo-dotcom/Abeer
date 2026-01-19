import { pgTable, uuid, text, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

// ==================== UGC REVIEW IMAGES (Instagram/WhatsApp/Other) ====================
export const ugcReviewImages = pgTable(
  "ugc_review_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),
    source: varchar("source", { length: 32 }).notNull().default("other"), // instagram | whatsapp | tiktok | facebook | other
    author: varchar("author", { length: 120 }), // @handle or name
    link: text("link"), // deep link to the original post/status if available
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull().default(0),
    isApproved: boolean("is_approved").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    sourceIdx: index("ugc_review_images_source_idx").on(table.source),
    approvedIdx: index("ugc_review_images_is_approved_idx").on(table.isApproved),
    createdAtIdx: index("ugc_review_images_created_at_idx").on(table.createdAt),
  }),
);
