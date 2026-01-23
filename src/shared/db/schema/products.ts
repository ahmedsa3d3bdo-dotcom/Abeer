import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  integer,
  decimal,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  bigint,
} from "drizzle-orm/pg-core";
import { productStatusEnum, stockStatusEnum } from "../enums";
import { users } from "./users";

// ==================== PRODUCTS ====================
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    sku: varchar("sku", { length: 100 }).unique(),
    serialNumber: varchar("serial_number", { length: 120 }),
    description: text("description"),
    shortDescription: text("short_description"),
    specMaterial: text("spec_material"),
    specColor: text("spec_color"),
    specDimensions: text("spec_dimensions"),
    specStyle: text("spec_style"),
    specIdealFor: text("spec_ideal_for"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
    costPerItem: decimal("cost_per_item", { precision: 10, scale: 2 }),
    status: productStatusEnum("status").default("draft").notNull(),
    stockStatus: stockStatusEnum("stock_status").default("in_stock").notNull(),
    trackInventory: boolean("track_inventory").default(true).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    allowReviews: boolean("allow_reviews").default(true).notNull(),
    averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0.00"),
    reviewCount: integer("review_count").default(0).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    soldCount: integer("sold_count").default(0).notNull(),
    weight: decimal("weight", { precision: 8, scale: 2 }),
    weightUnit: varchar("weight_unit", { length: 10 }).default("kg"),
    dimensions: jsonb("dimensions").$type<{ length: number; width: number; height: number; unit: string }>(),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    metaKeywords: text("meta_keywords"),
    sizeChartUrl: text("size_chart_url"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    publishedAt: timestamp("published_at"),
  },
  (table) => ({
    slugIdx: uniqueIndex("products_slug_idx").on(table.slug),
    skuIdx: uniqueIndex("products_sku_idx").on(table.sku),
    statusIdx: index("products_status_idx").on(table.status),
    stockStatusIdx: index("products_stock_status_idx").on(table.stockStatus),
    isFeaturedIdx: index("products_is_featured_idx").on(table.isFeatured),
    createdAtIdx: index("products_created_at_idx").on(table.createdAt),
    priceIdx: index("products_price_idx").on(table.price),
  }),
);

// ==================== PRODUCT VARIANTS ====================
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
    costPerItem: decimal("cost_per_item", { precision: 10, scale: 2 }),
    stockQuantity: integer("stock_quantity").default(0).notNull(),
    reservedQuantity: integer("reserved_quantity").default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
    options: jsonb("options").$type<Record<string, string>>(),
    image: text("image"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    skuIdx: uniqueIndex("product_variants_sku_idx").on(table.sku),
    productIdIdx: index("product_variants_product_id_idx").on(table.productId),
    isActiveIdx: index("product_variants_is_active_idx").on(table.isActive),
  }),
);

// ==================== PRODUCT IMAGES ====================
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: varchar("alt_text", { length: 255 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index("product_images_product_id_idx").on(table.productId),
    sortOrderIdx: index("product_images_sort_order_idx").on(table.sortOrder),
    isPrimaryIdx: index("product_images_is_primary_idx").on(table.isPrimary),
  }),
);

// ==================== INVENTORY ====================
export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: bigint("quantity", { mode: "number" }).default(0).notNull(),
    reservedQuantity: bigint("reserved_quantity", { mode: "number" }).default(0).notNull(),
    availableQuantity: bigint("available_quantity", { mode: "number" }).default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
    location: varchar("location", { length: 100 }),
    lastRestockedAt: timestamp("last_restocked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index("inventory_product_id_idx").on(table.productId),
    variantIdIdx: index("inventory_variant_id_idx").on(table.variantId),
    quantityIdx: index("inventory_quantity_idx").on(table.quantity),
    productVariantIdx: index("inventory_product_variant_idx").on(table.productId, table.variantId),
  }),
);
