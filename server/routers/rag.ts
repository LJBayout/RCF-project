import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { answerQuestion, semanticSearch, ingestSectionsToPostgres } from "../_core/rag";
import { getDb } from "../db";
import { cfrSections, cfrParts, cfrTitles } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";

export const ragRouter = router({
  /**
   * Ask a question and get an AI-generated answer with CFR citations
   */
  ask: publicProcedure
    .input(
      z.object({
        question: z.string().min(3).max(500),
        titleFilter: z.number().int().min(1).max(50).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { question, titleFilter } = input;
      return await answerQuestion(question, titleFilter);
    }),

  /**
   * Semantic search for relevant CFR sections
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(3).max(500),
        limit: z.number().int().min(1).max(20).default(5),
        titleFilter: z.number().int().min(1).max(50).optional(),
      })
    )
    .query(async ({ input }) => {
      const { query, limit, titleFilter } = input;
      return await semanticSearch(query, limit, titleFilter);
    }),

  /**
   * Ingest CFR sections from MySQL into Postgres (cfr_chunks). Only sections not yet in Postgres.
   * RAG uses Postgres only; this and Airflow both write to Postgres.
   */
  ingest: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100000).optional(),
        batchSize: z.number().int().min(1).max(100).default(50),
        titleFilter: z.number().int().min(1).max(50).optional(),
        year: z.number().int().min(1900).max(2100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let q = db
        .select({ id: cfrSections.id })
        .from(cfrSections)
        .innerJoin(cfrParts, eq(cfrSections.partId, cfrParts.id))
        .innerJoin(cfrTitles, eq(cfrParts.titleId, cfrTitles.id));

      const filters = [];
      if (input.titleFilter) {
        filters.push(eq(cfrTitles.titleNumber, input.titleFilter));
      }
      if (input.year) {
        filters.push(eq(cfrTitles.year, input.year));
      }

      if (filters.length > 0) {
        // @ts-ignore - drizzle-orm type complexity
        q = q.where(and(...filters));
      }

      const sections = await q.limit(input.limit ?? 50000);

      const sectionIds = sections.map((s) => s.id);

      if (sectionIds.length === 0) {
        return {
          message: "No sections to ingest",
          total: 0,
          success: 0,
          failed: 0,
          skipped: 0,
        };
      }

      console.log(`Starting Postgres ingestion for ${sectionIds.length} sections...`);
      const result = await ingestSectionsToPostgres(sectionIds, input.batchSize);

      return {
        message: "Ingestion complete (Postgres)",
        total: sectionIds.length,
        success: result.success,
        failed: result.failed,
        skipped: result.skipped,
      };
    }),

  /**
   * Ingestion status: Postgres-only (chunks in cfr_chunks = what RAG uses).
   * total = chunks in Postgres; completed/missing kept for UI compatibility (same as total/0).
   */
  getIngestStatus: publicProcedure.query(async () => {
    const { getPostgresStats } = await import("../_core/rag");
    const stats = await getPostgresStats();
    const totalChunks = stats.totalChunks;
    return {
      total: totalChunks,
      completed: totalChunks,
      totalMySQL: stats.totalSectionsMySQL,
      progress: stats.totalSectionsMySQL > 0 ? Math.round((totalChunks / stats.totalSectionsMySQL) * 100) : 0,
    };
  }),

  /**
   * Get Real-time Vector Store Stats (Postgres)
   */
  getStats: publicProcedure.query(async () => {
    // Dynamically import to avoid circular dep issues if any, or just use the exported function suitable
    const { getPostgresStats } = await import("../_core/rag");
    return await getPostgresStats();
  }),

  /**
   * Gap analysis: MySQL counts vs Postgres counts
   */
  getGapAnalysis: publicProcedure.query(async () => {
    const { getGapAnalysis } = await import("../_core/rag");
    return await getGapAnalysis();
  }),
});
