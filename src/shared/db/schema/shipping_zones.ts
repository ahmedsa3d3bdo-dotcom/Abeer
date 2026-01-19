import { pgTable, varchar, timestamp, uuid, integer, decimal, index, primaryKey } from "drizzle-orm/pg-core";
import { shippingMethods } from "./shipping";

// ==================== SHIPPING ZONES ====================
export const shippingZones = pgTable(
  "shipping_zones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("shipping_zones_name_idx").on(table.name),
  }),
);

export const shippingZoneCountries = pgTable(
  "shipping_zone_countries",
  {
    zoneId: uuid("zone_id").notNull().references(() => shippingZones.id, { onDelete: "cascade" }),
    country: varchar("country", { length: 2 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.zoneId, table.country] }),
    zoneIdIdx: index("shipping_zone_countries_zone_id_idx").on(table.zoneId),
  }),
);

export const shippingZoneRates = pgTable(
  "shipping_zone_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    zoneId: uuid("zone_id").notNull().references(() => shippingZones.id, { onDelete: "cascade" }),
    methodId: uuid("method_id").notNull().references(() => shippingMethods.id, { onDelete: "cascade" }),
    minSubtotal: decimal("min_subtotal", { precision: 10, scale: 2 }),
    maxSubtotal: decimal("max_subtotal", { precision: 10, scale: 2 }),
    rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    zoneIdIdx: index("shipping_zone_rates_zone_id_idx").on(table.zoneId),
    methodIdIdx: index("shipping_zone_rates_method_id_idx").on(table.methodId),
  }),
);
