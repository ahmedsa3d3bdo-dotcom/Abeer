import { pgTable, uuid, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

export const userNotificationPreferences = pgTable(
  "user_notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // transactional notifications (always true in many apps, but allow visibility controls if desired)
    orders: boolean("orders").default(true).notNull(),
    shipments: boolean("shipments").default(true).notNull(),
    refunds: boolean("refunds").default(true).notNull(),
    returns: boolean("returns").default(true).notNull(),
    reviews: boolean("reviews").default(true).notNull(),
    // promotional notifications
    promotions: boolean("promotions").default(true).notNull(),
    backInStock: boolean("back_in_stock").default(true).notNull(),
    priceDrop: boolean("price_drop").default(true).notNull(),
    // security/system
    security: boolean("security").default(true).notNull(),
    // email channel preferences (storefront UI)
    emailOrderUpdates: boolean("email_order_updates").default(true).notNull(),
    emailPromotions: boolean("email_promotions").default(false).notNull(),
    emailNewsletter: boolean("email_newsletter").default(true).notNull(),
    emailRecommendations: boolean("email_recommendations").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("unp_user_idx").on(t.userId),
    uniqUser: uniqueIndex("unp_user_uniq").on(t.userId),
  }),
);
