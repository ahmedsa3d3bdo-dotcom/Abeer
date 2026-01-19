import { pgTable, varchar, text, timestamp, uuid, integer, boolean, index, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { products } from "./products";

// ==================== CATEGORIES ====================
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    image: text("image"),
    parentId: uuid("parent_id"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    metaKeywords: text("meta_keywords"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("categories_slug_idx").on(table.slug),
    parentIdIdx: index("categories_parent_id_idx").on(table.parentId),
    isActiveIdx: index("categories_is_active_idx").on(table.isActive),
    sortOrderIdx: index("categories_sort_order_idx").on(table.sortOrder),
  }),
);

// ==================== PRODUCT CATEGORIES (MANY-TO-MANY) ====================
export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.categoryId] }),
    productIdIdx: index("product_categories_product_id_idx").on(table.productId),
    categoryIdIdx: index("product_categories_category_id_idx").on(table.categoryId),
  }),
);
