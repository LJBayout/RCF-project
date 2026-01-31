import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { answerQuestion, semanticSearch } from "../_core/rag";

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
});
