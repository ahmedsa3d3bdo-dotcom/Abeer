import { pgTable, varchar, text, timestamp, uuid, decimal, index } from "drizzle-orm/pg-core";
import { paymentStatusEnum, paymentMethodEnum } from "../enums";
import { orders } from "./orders";
import { users } from "./users";

// ==================== PAYMENTS ====================
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: paymentStatusEnum("status").default("pending").notNull(),
    method: paymentMethodEnum("method"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("CAD").notNull(),
    provider: varchar("provider", { length: 100 }),
    providerPaymentId: varchar("provider_payment_id", { length: 255 }),
    reference: varchar("reference", { length: 255 }),
    capturedAt: timestamp("captured_at"),
    failedAt: timestamp("failed_at"),
    failureReason: text("failure_reason"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index("payments_order_id_idx").on(table.orderId),
    statusIdx: index("payments_status_idx").on(table.status),
    providerIdx: index("payments_provider_idx").on(table.provider),
  }),
);
