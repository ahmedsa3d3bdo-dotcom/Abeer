import { pgTable, varchar, text, timestamp, uuid, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./users";

// ==================== BILLING ADDRESSES ====================
export const billingAddresses = pgTable(
  "billing_addresses",
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
    phone: varchar("phone", { length: 20 }),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("billing_addresses_user_id_idx").on(table.userId),
  }),
);
