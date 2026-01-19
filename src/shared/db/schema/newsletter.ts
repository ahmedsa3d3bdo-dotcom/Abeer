import { pgTable, uuid, varchar, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { newsletterSubscriberStatusEnum } from "../enums";

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    status: newsletterSubscriberStatusEnum("status").default("pending").notNull(),
    source: varchar("source", { length: 100 }),
    tags: jsonb("tags").$type<string[]>(),
    confirmToken: varchar("confirm_token", { length: 255 }),
    unsubscribeToken: varchar("unsubscribe_token", { length: 255 }),
    confirmedAt: timestamp("confirmed_at"),
    unsubscribedAt: timestamp("unsubscribed_at"),
    consentIp: varchar("consent_ip", { length: 64 }),
    consentUserAgent: text("consent_user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("newsletter_subscribers_email_idx").on(table.email),
    statusIdx: index("newsletter_subscribers_status_idx").on(table.status),
    createdAtIdx: index("newsletter_subscribers_created_at_idx").on(table.createdAt),
    emailUniq: uniqueIndex("newsletter_subscribers_email_uniq").on(table.email),
  })
);
