import { pgTable, varchar, text, timestamp, uuid, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { notificationTypeEnum, notificationStatusEnum, emailStatusEnum } from "../enums";
import { users } from "./users";

// ==================== NOTIFICATIONS ====================
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    status: notificationStatusEnum("status").default("unread").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    actionUrl: text("action_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("notifications_user_id_idx").on(table.userId),
    statusIdx: index("notifications_status_idx").on(table.status),
    typeIdx: index("notifications_type_idx").on(table.type),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
    uniqueUserTypeTitleMessage: uniqueIndex("notifications_user_type_title_message_uniq").on(
      table.userId,
      table.type,
      table.title,
      table.message,
    ),
  }),
);

// ==================== EMAIL LOGS ====================
export const emailLogs = pgTable(
  "email_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    templateId: uuid("template_id").references(() => emailTemplates.id, { onDelete: "set null" }),
    to: varchar("to", { length: 255 }).notNull(),
    from: varchar("from", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    body: text("body").notNull(),
    status: emailStatusEnum("status").default("pending").notNull(),
    error: text("error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("email_logs_user_id_idx").on(table.userId),
    statusIdx: index("email_logs_status_idx").on(table.status),
    toIdx: index("email_logs_to_idx").on(table.to),
    createdAtIdx: index("email_logs_created_at_idx").on(table.createdAt),
  }),
);

// ==================== EMAIL TEMPLATES ====================
export const emailTemplates = pgTable(
  "email_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    subject: varchar("subject", { length: 255 }).notNull(),
    body: text("body").notNull(),
    variables: jsonb("variables").$type<Record<string, string>>(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index("email_templates_slug_idx").on(table.slug),
    isActiveIdx: index("email_templates_is_active_idx").on(table.isActive),
  }),
);
