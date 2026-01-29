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
 * CFR Titles - Top level organization (e.g., Title 19: Customs Duties)
 */
export const cfrTitles = mysqlTable("cfr_titles", {
  id: int("id").autoincrement().primaryKey(),
  titleNumber: int("title_number").notNull().unique(),
  name: text("name").notNull(),
  subject: text("subject"),
  year: int("year").notNull(),
  revisedDate: varchar("revised_date", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  titleNumberIdx: index("title_number_idx").on(table.titleNumber),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  partSectionIdx: index("part_section_idx").on(table.partId, table.sectionNumber),
  uniquePartSection: unique("unique_part_section").on(table.partId, table.sectionNumber),
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
 * API Keys for authentication
 */
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  keyIdx: index("key_idx").on(table.key),
  userIdIdx: index("user_id_idx").on(table.userId),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

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
