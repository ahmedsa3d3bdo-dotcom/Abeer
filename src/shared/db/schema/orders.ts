import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  integer,
  decimal,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { orderStatusEnum, paymentStatusEnum, paymentMethodEnum } from "../enums";
import { users } from "./users";
import { products, productVariants } from "./products";

// ==================== ORDERS ====================
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
    userId: uuid("user_id").references(() => users.id),
    status: orderStatusEnum("status").default("pending").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("pending").notNull(),
    paymentMethod: paymentMethodEnum("payment_method"),
    shippingMethodId: uuid("shipping_method_id"),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("CAD").notNull(),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerPhone: varchar("customer_phone", { length: 20 }),
    customerNote: text("customer_note"),
    adminNote: text("admin_note"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    cancelledAt: timestamp("cancelled_at"),
    cancelReason: text("cancel_reason"),
    confirmedAt: timestamp("confirmed_at"),
    shippedAt: timestamp("shipped_at"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orderNumberIdx: uniqueIndex("orders_order_number_idx").on(table.orderNumber),
    userIdIdx: index("orders_user_id_idx").on(table.userId),
    statusIdx: index("orders_status_idx").on(table.status),
    paymentStatusIdx: index("orders_payment_status_idx").on(table.paymentStatus),
    shippingMethodIdIdx: index("orders_shipping_method_id_idx").on(table.shippingMethodId),
    createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
  }),
);

// ==================== ORDER ITEMS ====================
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    productName: varchar("product_name", { length: 255 }).notNull(),
    variantName: varchar("variant_name", { length: 255 }),
    sku: varchar("sku", { length: 100 }),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index("order_items_order_id_idx").on(table.orderId),
    productIdIdx: index("order_items_product_id_idx").on(table.productId),
  }),
);
