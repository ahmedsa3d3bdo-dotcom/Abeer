import { pgTable, varchar, text, timestamp, uuid, integer, boolean, index } from "drizzle-orm/pg-core";
import { storyStatusEnum } from "../enums";
import { users } from "./users";
import { products } from "./products";
import { orders } from "./orders";

// ==================== PRODUCT REVIEWS ====================
export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    title: varchar("title", { length: 255 }),
    content: text("content").notNull(),
    isVerifiedPurchase: boolean("is_verified_purchase").default(false).notNull(),
    isApproved: boolean("is_approved").default(false).notNull(),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    helpfulCount: integer("helpful_count").default(0).notNull(),
    reportCount: integer("report_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index("product_reviews_product_id_idx").on(table.productId),
    userIdIdx: index("product_reviews_user_id_idx").on(table.userId),
    isApprovedIdx: index("product_reviews_is_approved_idx").on(table.isApproved),
    ratingIdx: index("product_reviews_rating_idx").on(table.rating),
    createdAtIdx: index("product_reviews_created_at_idx").on(table.createdAt),
  }),
);

// ==================== REVIEW IMAGES ====================
export const reviewImages = pgTable(
  "review_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => productReviews.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: varchar("alt_text", { length: 255 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    reviewIdIdx: index("review_images_review_id_idx").on(table.reviewId),
  }),
);

// ==================== STORIES ====================
export const stories = pgTable(
  "stories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    content: text("content").notNull(),
    excerpt: text("excerpt"),
    coverImage: text("cover_image"),
    status: storyStatusEnum("status").default("draft").notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index("stories_slug_idx").on(table.slug),
    statusIdx: index("stories_status_idx").on(table.status),
    authorIdIdx: index("stories_author_id_idx").on(table.authorId),
    publishedAtIdx: index("stories_published_at_idx").on(table.publishedAt),
  }),
);

// ==================== STORY VIEWS ====================
export const storyViews = pgTable(
  "story_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  },
  (table) => ({
    storyIdIdx: index("story_views_story_id_idx").on(table.storyId),
    userIdIdx: index("story_views_user_id_idx").on(table.userId),
  }),
);
