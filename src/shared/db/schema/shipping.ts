import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  integer,
  decimal,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { shipmentStatusEnum } from "../enums";
import { users } from "./users";
import { orders } from "./orders";

// ==================== SHIPPING ADDRESSES ====================
export const shippingAddresses = pgTable(
  "shipping_addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    company: varchar("company", { length: 100 }),
    addressLine1: varchar("address_line_1", { length: 255 }).notNull(),
    addressLine2: varchar("address_line_2", { length: 255 }),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }),
    postalCode: varchar("postal_code", { length: 20 }).notNull(),
    country: varchar("country", { length: 2 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("shipping_addresses_user_id_idx").on(table.userId),
  }),
);

// ==================== ORDER SHIPPING ADDRESS SNAPSHOT ====================
export const orderShippingAddresses = pgTable(
  "order_shipping_addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    company: varchar("company", { length: 100 }),
    addressLine1: varchar("address_line_1", { length: 255 }).notNull(),
    addressLine2: varchar("address_line_2", { length: 255 }),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }),
    postalCode: varchar("postal_code", { length: 20 }).notNull(),
    country: varchar("country", { length: 2 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index("order_shipping_addresses_order_id_idx").on(table.orderId),
  }),
);

// ==================== SHIPPING METHODS ====================
export const shippingMethods = pgTable(
  "shipping_methods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    code: varchar("code", { length: 50 }).notNull().unique(),
    carrier: varchar("carrier", { length: 100 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    estimatedDays: integer("estimated_days"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex("shipping_methods_code_idx").on(table.code),
    isActiveIdx: index("shipping_methods_is_active_idx").on(table.isActive),
  }),
);

// ==================== SHIPMENTS ====================
export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    shipmentNumber: varchar("shipment_number", { length: 50 }).notNull(),
    shippingMethodId: uuid("shipping_method_id").references(() => shippingMethods.id),
    trackingNumber: varchar("tracking_number", { length: 100 }),
    carrier: varchar("carrier", { length: 100 }),
    status: shipmentStatusEnum("status").default("pending").notNull(),
    shippedAt: timestamp("shipped_at"),
    estimatedDeliveryAt: timestamp("estimated_delivery_at"),
    deliveredAt: timestamp("delivered_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index("shipments_order_id_idx").on(table.orderId),
    shipmentNumberIdx: uniqueIndex("shipments_shipment_number_idx").on(table.shipmentNumber),
    trackingNumberIdx: index("shipments_tracking_number_idx").on(table.trackingNumber),
    statusIdx: index("shipments_status_idx").on(table.status),
  }),
);

// ==================== TRACKING UPDATES ====================
export const trackingUpdates = pgTable(
  "tracking_updates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 100 }).notNull(),
    location: varchar("location", { length: 255 }),
    description: text("description"),
    occurredAt: timestamp("occurred_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    shipmentIdIdx: index("tracking_updates_shipment_id_idx").on(table.shipmentId),
    occurredAtIdx: index("tracking_updates_occurred_at_idx").on(table.occurredAt),
  }),
);
