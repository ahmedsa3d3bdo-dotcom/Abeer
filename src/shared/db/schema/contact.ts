import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { contactMessageStatusEnum, contactPriorityEnum } from "../enums";
import { users } from "./users";

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }),
    message: text("message").notNull(),
    status: contactMessageStatusEnum("status").default("new").notNull(),
    priority: contactPriorityEnum("priority").default("normal").notNull(),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id, { onDelete: "set null" }),
    channel: varchar("channel", { length: 50 }).default("web").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    respondedAt: timestamp("responded_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("contact_messages_status_idx").on(table.status),
    createdAtIdx: index("contact_messages_created_at_idx").on(table.createdAt),
    emailIdx: index("contact_messages_email_idx").on(table.email),
    assigneeIdx: index("contact_messages_assignee_idx").on(table.assigneeUserId),
  })
);
