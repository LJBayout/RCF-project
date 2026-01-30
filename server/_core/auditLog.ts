/**
 * SOC 2 - Audit Logging (CC6.8, CC7.2)
 * Track all data access and modifications for compliance
 */

import * as db from "../db";
import { auditLogs } from "../../drizzle/schema";

export type AuditAction = 
  | "user.login" 
  | "user.logout"
  | "user.created"
  | "data.read"
  | "data.search"
  | "data.export"
  | "api.access"
  | "admin.action"
  | "security.violation";

export type AuditResource = 
  | "cfr_title"
  | "cfr_part"
  | "cfr_section"
  | "user"
  | "api_key"
  | "system";

interface AuditLogEntry {
  userId?: number;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

/**
 * Log audit event to database
 * SOC 2 Requirement: All access must be logged
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const database = await db.getDb();
    if (!database) {
      console.error("[Audit] Database not available");
      return;
    }

    await database.insert(auditLogs).values({
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      success: entry.success,
      errorMessage: entry.errorMessage,
      timestamp: new Date(),
    });
  } catch (error) {
    // Critical: Audit logging failure
    console.error("[Audit] Failed to log event:", error);
    // In production: Alert security team
  }
}

/**
 * Get audit logs for compliance reports
 * SOC 2 Requirement: Ability to generate audit reports
 */
export async function getAuditLogs(filters: {
  userId?: number;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const database = await db.getDb();
  if (!database) return [];

  let query = database.select().from(auditLogs);

  // Apply filters
  // Add where clauses based on filters (simplified for now)
  
  return query.limit(filters.limit || 100);
}

/**
 * SOC 2 Helper: Track data access
 */
export function auditDataAccess(
  userId: number | undefined,
  resource: AuditResource,
  resourceId: string,
  ipAddress?: string,
  userAgent?: string
) {
  return logAuditEvent({
    userId,
    action: "data.read",
    resource,
    resourceId,
    ipAddress,
    userAgent,
    success: true,
  });
}

/**
 * SOC 2 Helper: Track failed access attempts
 */
export function auditSecurityViolation(
  action: AuditAction,
  metadata: Record<string, any>,
  ipAddress?: string
) {
  return logAuditEvent({
    action,
    resource: "system",
    ipAddress,
    metadata,
    success: false,
  });
}
