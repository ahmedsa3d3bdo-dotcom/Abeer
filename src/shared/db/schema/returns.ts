import { pgTable, varchar, text, timestamp, uuid, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { returnStatusEnum } from "../enums";
import { orders, orderItems } from "./orders";
import { users } from "./users";

// ==================== RETURNS ====================
export const returns = pgTable(
  "returns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    rmaNumber: varchar("rma_number", { length: 50 }).notNull(),
    status: returnStatusEnum("status").default("requested").notNull(),
    reason: text("reason"),
    notes: text("notes"),
    requestedBy: uuid("requested_by").references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    approvedAt: timestamp("approved_at"),
    receivedAt: timestamp("received_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index("returns_order_id_idx").on(table.orderId),
    statusIdx: index("returns_status_idx").on(table.status),
    rmaIdx: uniqueIndex("returns_rma_idx").on(table.rmaNumber),
  }),
);

// ==================== RETURN ITEMS ====================
export const returnItems = pgTable(
  "return_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    returnId: uuid("return_id").notNull().references(() => returns.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    returnIdIdx: index("return_items_return_id_idx").on(table.returnId),
    orderItemIdIdx: index("return_items_order_item_id_idx").on(table.orderItemId),
  }),
);
