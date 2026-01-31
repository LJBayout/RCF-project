/**
 * Dashboard / analytics router.
 * Reads from api_usage for real API usage stats (platform-wide for now).
 */

import { desc, gte, sql } from "drizzle-orm";
import { z } from "zod";
import * as db from "../db";
import { apiUsage } from "../../drizzle/schema";
import { publicProcedure, router } from "../_core/trpc";

const DEFAULT_DAILY_QUOTA = 10_000;
const DEFAULT_PLAN = "Pro";

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export const dashboardRouter = router({
  /** Aggregated usage stats: total, today, remaining quota, plan. */
  getUsageStats: publicProcedure.query(async () => {
    const database = await db.getDb();
    if (!database) {
      return {
        totalRequests: 0,
        requestsToday: 0,
        remainingQuota: DEFAULT_DAILY_QUOTA,
        plan: DEFAULT_PLAN,
      };
    }

    const todayStart = startOfTodayUtc();

    const [totalRow] = await database
      .select({ c: sql<number>`count(*)` })
      .from(apiUsage)
      .limit(1);

    const [todayRow] = await database
      .select({ c: sql<number>`count(*)` })
      .from(apiUsage)
      .where(gte(apiUsage.timestamp, todayStart))
      .limit(1);

    const totalRequests = Number(totalRow?.c ?? 0);
    const requestsToday = Number(todayRow?.c ?? 0);
    const remainingQuota = Math.max(0, DEFAULT_DAILY_QUOTA - requestsToday);

    return {
      totalRequests,
      requestsToday,
      remainingQuota,
      plan: DEFAULT_PLAN,
    };
  }),

  /** Last N usage rows for recent activity. */
  getRecentUsage: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return [];

      const rows = await database
        .select({
          id: apiUsage.id,
          endpoint: apiUsage.endpoint,
          method: apiUsage.method,
          statusCode: apiUsage.statusCode,
          responseTime: apiUsage.responseTime,
          timestamp: apiUsage.timestamp,
        })
        .from(apiUsage)
        .orderBy(desc(apiUsage.timestamp))
        .limit(input.limit);

      return rows.map((r) => ({
        id: r.id,
        endpoint: r.endpoint,
        method: r.method,
        statusCode: r.statusCode,
        responseTime: r.responseTime ?? null,
        timestamp: r.timestamp,
      }));
    }),

  /** Top endpoints by request count. */
  getTopEndpoints: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return [];

      const rows = await database
        .select({
          endpoint: apiUsage.endpoint,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(apiUsage)
        .groupBy(apiUsage.endpoint)
        .orderBy(desc(sql`count(*)`))
        .limit(input.limit);

      return rows.map((r) => ({
        endpoint: r.endpoint,
        count: Number(r.count),
      }));
    }),

  /** Average response time by endpoint (or endpoint group). */
  getResponseTimeAverages: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return [];

      const rows = await database
        .select({
          endpoint: apiUsage.endpoint,
          avgMs: sql<number>`round(avg(${apiUsage.responseTime}), 1)`.as("avg_ms"),
        })
        .from(apiUsage)
        .where(sql`${apiUsage.responseTime} is not null`)
        .groupBy(apiUsage.endpoint)
        .orderBy(desc(sql`avg(${apiUsage.responseTime})`))
        .limit(input.limit);

      return rows.map((r) => ({
        endpoint: r.endpoint,
        avgMs: Number(r.avgMs) || 0,
      }));
    }),
});
