import { pgTable, varchar, text, timestamp, uuid, boolean, integer, decimal, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { discountTypeEnum, discountScopeEnum, discountStatusEnum } from "../enums";
import { products } from "./products";
import { categories } from "./categories";
import { orders, orderItems } from "./orders";

// ==================== DISCOUNTS ====================
export const discounts = pgTable(
  "discounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 50 }),
    type: discountTypeEnum("type").notNull(),
    value: decimal("value", { precision: 10, scale: 2 }).notNull(),
    scope: discountScopeEnum("scope").default("all").notNull(),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").default(0).notNull(),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    minSubtotal: decimal("min_subtotal", { precision: 10, scale: 2 }),
    isAutomatic: boolean("is_automatic").default(false).notNull(),
    status: discountStatusEnum("status").default("draft").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex("discounts_code_idx").on(table.code),
    statusIdx: index("discounts_status_idx").on(table.status),
    startsAtIdx: index("discounts_starts_at_idx").on(table.startsAt),
    endsAtIdx: index("discounts_ends_at_idx").on(table.endsAt),
  }),
);

// Target associations (optional, depending on scope)
export const discountProducts = pgTable(
  "discount_products",
  {
    discountId: uuid("discount_id").notNull().references(() => discounts.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => ({
    idx: index("discount_products_idx").on(table.discountId, table.productId),
  }),
);

export const discountCategories = pgTable(
  "discount_categories",
  {
    discountId: uuid("discount_id").notNull().references(() => discounts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => ({
    idx: index("discount_categories_idx").on(table.discountId, table.categoryId),
  }),
);

// Applied discounts
export const orderDiscounts = pgTable(
  "order_discounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    discountId: uuid("discount_id").references(() => discounts.id, { onDelete: "set null" }),
    code: varchar("code", { length: 50 }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index("order_discounts_order_id_idx").on(table.orderId),
  }),
);

export const orderItemDiscounts = pgTable(
  "order_item_discounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
    discountId: uuid("discount_id").references(() => discounts.id, { onDelete: "set null" }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orderItemIdIdx: index("order_item_discounts_order_item_id_idx").on(table.orderItemId),
  }),
);
