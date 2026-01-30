/**
 * CFR API — único ponto de acesso aos dados CFR (títulos, partes, seções).
 * Dados preenchidos pelo Airflow; aqui só leitura.
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as cfr from "../cfr";

export const cfrRouter = router({
  /** Busca fulltext em subject + content (LIKE %q%); filtros opcionais por title/part. */
  searchFulltext: publicProcedure
    .input(
      z.object({
        q: z.string().min(1).max(500),
        titleNumber: z.number().int().positive().optional(),
        partNumber: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
    )
    .query(async ({ input }) => {
      return cfr.searchFulltext(input.q, {
        titleNumber: input.titleNumber,
        partNumber: input.partNumber,
        limit: input.limit,
      });
    }),

  /** Um título com suas partes (sem seções). */
  getTitle: publicProcedure
    .input(z.object({ titleNumber: z.number().int().positive() }))
    .query(async ({ input }) => cfr.getTitle(input.titleNumber)),

  /** Uma parte com suas seções; identificada por title + part number. */
  getPart: publicProcedure
    .input(
      z.object({
        titleNumber: z.number().int().positive(),
        partNumber: z.number().int().positive(),
      })
    )
    .query(async ({ input }) =>
      cfr.getPart(input.titleNumber, input.partNumber)
    ),

  /** Uma seção por ID. */
  getSection: publicProcedure
    .input(z.object({ sectionId: z.number().int().positive() }))
    .query(async ({ input }) => cfr.getSectionById(input.sectionId)),

  /** Lista anos disponíveis (para filtro por ano). */
  listYears: publicProcedure.query(() => cfr.listYears()),

  /** Lista títulos, opcionalmente filtrados por ano. */
  listTitles: publicProcedure
    .input(z.object({ year: z.number().int().min(1990).max(2030).optional() }).optional())
    .query(async ({ input }) => cfr.listTitles(input?.year)),
});
