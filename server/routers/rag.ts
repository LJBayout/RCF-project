import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { answerQuestion, semanticSearch, generateSectionEmbeddings } from "../_core/rag";
import { getDb } from "../db";
import { cfrSections, cfrParts, cfrTitles } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

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
   * Trigger embedding generation for CFR sections (missing only)
   * WARNING: This is a long-running operation that processes thousands of sections
   */
  ingest: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(10000).optional(),
        batchSize: z.number().int().min(1).max(100).default(50),
        titleFilter: z.number().int().min(1).max(50).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      let sections: { id: number }[];
      if (input.titleFilter) {
        const q = db
          .select({ id: cfrSections.id })
          .from(cfrSections)
          .innerJoin(cfrParts, eq(cfrSections.partId, cfrParts.id))
          .innerJoin(cfrTitles, eq(cfrParts.titleId, cfrTitles.id))
          .where(
            and(
              isNull(cfrSections.embedding),
              eq(cfrTitles.titleNumber, input.titleFilter)
            )
          );
        if (input.limit) q.limit(input.limit);
        sections = await q;
      } else {
        const q = db
          .select({ id: cfrSections.id })
          .from(cfrSections)
          .where(isNull(cfrSections.embedding));
        if (input.limit) q.limit(input.limit);
        sections = await q;
      }
      const sectionIds = sections.map((s) => s.id);

      if (sectionIds.length === 0) {
        return {
          message: "All sections already have embeddings",
          total: 0,
          success: 0,
          failed: 0,
        };
      }

      console.log(`Starting embedding generation for ${sectionIds.length} sections...`);

      const result = await generateSectionEmbeddings(sectionIds, input.batchSize);

      return {
        message: `Embedding generation complete`,
        total: sectionIds.length,
        success: result.success,
        failed: result.failed,
      };
    }),

  /**
   * Get ingestion status (how many sections have embeddings)
   */
  getIngestStatus: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const [total] = await db
      .select({ count: cfrSections.id })
      .from(cfrSections);

    const [withEmbeddings] = await db
      .select({ count: cfrSections.id })
      .from(cfrSections)
      .where(isNull(cfrSections.embedding));

    const totalCount = Number(total?.count ?? 0);
    const missingCount = Number(withEmbeddings?.count ?? 0);
    const completedCount = totalCount - missingCount;

    return {
      total: totalCount,
      completed: completedCount,
      missing: missingCount,
      progress: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
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
});
