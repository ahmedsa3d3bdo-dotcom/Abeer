import { pgTable, varchar, text, timestamp, uuid, integer, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { auditActionEnum, backupStatusEnum, healthCheckStatusEnum } from "../enums";
import { users } from "./users";

// ==================== SYSTEM SETTINGS ====================
export const systemSettings = pgTable(
  "system_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 100 }).notNull().unique(),
    value: text("value").notNull(),
    type: varchar("type", { length: 50 }).default("string").notNull(),
    description: text("description"),
    isPublic: boolean("is_public").default(false).notNull(),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    keyIdx: index("system_settings_key_idx").on(table.key),
    isPublicIdx: index("system_settings_is_public_idx").on(table.isPublic),
  }),
);

export const systemLogs = pgTable(
  "system_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    level: varchar("level", { length: 20 }).notNull(),
    source: varchar("source", { length: 50 }).notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    requestId: varchar("request_id", { length: 100 }),
    path: text("path"),
    method: varchar("method", { length: 10 }),
    statusCode: integer("status_code"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    userEmail: varchar("user_email", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index("system_logs_created_at_idx").on(table.createdAt),
    levelIdx: index("system_logs_level_idx").on(table.level),
    sourceIdx: index("system_logs_source_idx").on(table.source),
    userIdIdx: index("system_logs_user_id_idx").on(table.userId),
    requestIdIdx: index("system_logs_request_id_idx").on(table.requestId),
  }),
);

// ==================== DOCUMENT SEQUENCES ====================
export const documentSequences = pgTable(
  "document_sequences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docType: varchar("doc_type", { length: 50 }).notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    nextSeq: integer("next_seq").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    docTypeYearMonthUniq: uniqueIndex("document_sequences_doc_type_year_month_uniq").on(table.docType, table.year, table.month),
    docTypeIdx: index("document_sequences_doc_type_idx").on(table.docType),
    yearIdx: index("document_sequences_year_idx").on(table.year),
    monthIdx: index("document_sequences_month_idx").on(table.month),
  }),
);

// ==================== AUDIT LOGS ====================
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: auditActionEnum("action").notNull(),
    resource: varchar("resource", { length: 100 }).notNull(),
    resourceId: uuid("resource_id"),
    changes: jsonb("changes").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    resourceIdx: index("audit_logs_resource_idx").on(table.resource),
    resourceIdIdx: index("audit_logs_resource_id_idx").on(table.resourceId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  }),
);

// ==================== BACKUPS ====================
export const backups = pgTable(
  "backups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    filePath: text("file_path").notNull(),
    fileSize: integer("file_size").notNull(),
    status: backupStatusEnum("status").default("pending").notNull(),
    type: varchar("type", { length: 50 }).default("manual").notNull(),
    error: text("error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdBy: uuid("created_by").references(() => users.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("backups_status_idx").on(table.status),
    typeIdx: index("backups_type_idx").on(table.type),
    createdAtIdx: index("backups_created_at_idx").on(table.createdAt),
  }),
);

// ==================== HEALTH CHECKS ====================
export const healthChecks = pgTable(
  "health_checks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    service: varchar("service", { length: 100 }).notNull(),
    status: healthCheckStatusEnum("status").default("healthy").notNull(),
    responseTime: integer("response_time"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    error: text("error"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    serviceIdx: index("health_checks_service_idx").on(table.service),
    statusIdx: index("health_checks_status_idx").on(table.status),
    checkedAtIdx: index("health_checks_checked_at_idx").on(table.checkedAt),
  }),
);
