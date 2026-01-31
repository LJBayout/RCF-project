import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, index, unique } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * SOC 2 - Audit Logs (CC6.8, CC7.2)
 * Track all access and modifications for compliance
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  metadata: text("metadata"),
  success: int("success").notNull().default(1),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("user_id_idx").on(table.userId),
  timestampIdx: index("timestamp_idx").on(table.timestamp),
  actionIdx: index("action_idx").on(table.action),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * SOC 2 - API Keys for customer access (CC6.1)
 */
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  lastUsed: timestamp("last_used"),
  expiresAt: timestamp("expires_at"),
  rateLimit: int("rate_limit").default(1000), // requests per hour
  isActive: int("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  keyHashIdx: index("key_hash_idx").on(table.keyHash),
  userIdIdx: index("user_id_idx").on(table.userId),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * CFR Titles - Top level organization (e.g., Title 19: Customs Duties)
 */
export const cfrTitles = mysqlTable("cfr_titles", {
  id: int("id").autoincrement().primaryKey(),
  titleNumber: int("title_number").notNull(),
  name: text("name").notNull(),
  subject: text("subject"),
  year: int("year").notNull(),
  revisedDate: varchar("revised_date", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  titleNumberIdx: index("title_number_idx").on(table.titleNumber),
  uniqueTitleYear: unique("unique_title_year").on(table.titleNumber, table.year),
}));

export type CfrTitle = typeof cfrTitles.$inferSelect;
export type InsertCfrTitle = typeof cfrTitles.$inferInsert;

/**
 * CFR Parts - Subdivisions within titles
 */
export const cfrParts = mysqlTable("cfr_parts", {
  id: int("id").autoincrement().primaryKey(),
  titleId: int("title_id").notNull().references(() => cfrTitles.id, { onDelete: "cascade" }),
  partNumber: int("part_number").notNull(),
  name: text("name").notNull(),
  subject: text("subject"),
  authority: text("authority"),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  titlePartIdx: index("title_part_idx").on(table.titleId, table.partNumber),
  uniqueTitlePart: unique("unique_title_part").on(table.titleId, table.partNumber),
}));

export type CfrPart = typeof cfrParts.$inferSelect;
export type InsertCfrPart = typeof cfrParts.$inferInsert;

/**
 * CFR Sections - Individual regulations with full content
 */
export const cfrSections = mysqlTable("cfr_sections", {
  id: int("id").autoincrement().primaryKey(),
  partId: int("part_id").notNull().references(() => cfrParts.id, { onDelete: "cascade" }),
  sectionNumber: varchar("section_number", { length: 50 }).notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  embedding: text("embedding"),
  embedding_updated_at: timestamp("embedding_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  partSectionIdx: index("part_section_idx").on(table.partId, table.sectionNumber),
  uniquePartSection: unique("unique_part_section").on(table.partId, table.sectionNumber),
  embeddingUpdatedIdx: index("embedding_updated_idx").on(table.embedding_updated_at),
}));

export type CfrSection = typeof cfrSections.$inferSelect;
export type InsertCfrSection = typeof cfrSections.$inferInsert;

/**
 * Subscription plans for API access
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: mysqlEnum("plan", ["Free", "Pro", "Enterprise"]).default("Free").notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "expired"]).default("active").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("user_id_idx").on(table.userId),
  stripeCustomerIdx: index("stripe_customer_idx").on(table.stripeCustomerId),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * API Usage tracking for rate limiting and analytics
 */
export const apiUsage = mysqlTable("api_usage", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  apiKeyId: int("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: int("status_code").notNull(),
  responseTime: int("response_time"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  apiKeyTimestampIdx: index("api_key_timestamp_idx").on(table.apiKeyId, table.timestamp),
  timestampIdx: index("timestamp_idx").on(table.timestamp),
}));

export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = typeof apiUsage.$inferInsert;

/**
 * Manus Debug Logs - Browser console, network, and UI events
 */
export const manusDebugLogs = mysqlTable("manus_debug_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  logType: varchar("log_type", { length: 50 }).notNull(), // "console" | "network" | "ui"
  data: text("data").notNull(), // JSON stringified log entry
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  logTypeIdx: index("log_type_idx").on(table.logType),
  timestampIdx: index("timestamp_idx").on(table.timestamp),
}));

export type ManusDebugLog = typeof manusDebugLogs.$inferSelect;
export type InsertManusDebugLog = typeof manusDebugLogs.$inferInsert;
