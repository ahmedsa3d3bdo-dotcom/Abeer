import { pgTable, varchar, text, timestamp, uuid, integer, decimal, index, uniqueIndex, jsonb, boolean } from "drizzle-orm/pg-core";
import { cartStatusEnum } from "../enums";
import { users } from "./users";
import { products, productVariants } from "./products";

// ==================== CARTS ====================
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: varchar("session_id", { length: 255 }),
    status: cartStatusEnum("status").default("active").notNull(),
    currency: varchar("currency", { length: 3 }).default("CAD").notNull(),
    appliedDiscountId: uuid("applied_discount_id"),
    appliedDiscountCode: varchar("applied_discount_code", { length: 50 }),
    giftSuppressions: jsonb("gift_suppressions").$type<Record<string, unknown>>().default({} as any).notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0.00").notNull(),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    abandonedAt: timestamp("abandoned_at"),
    convertedAt: timestamp("converted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("carts_user_id_idx").on(table.userId),
    sessionIdIdx: index("carts_session_id_idx").on(table.sessionId),
    statusIdx: index("carts_status_idx").on(table.status),
  }),
);

// ==================== CART ITEMS ====================
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    productName: varchar("product_name", { length: 255 }).notNull(),
    variantName: varchar("variant_name", { length: 255 }),
    sku: varchar("sku", { length: 100 }),
    quantity: integer("quantity").default(1).notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).default("0.00").notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).default("0.00").notNull(),
    isGift: boolean("is_gift").default(false).notNull(),
    giftDiscountId: uuid("gift_discount_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    cartIdIdx: index("cart_items_cart_id_idx").on(table.cartId),
    productIdIdx: index("cart_items_product_id_idx").on(table.productId),
  }),
);
