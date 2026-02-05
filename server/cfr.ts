/**
 * CFR data access — single place for queries used by the API.
 * Airflow fills cfr_titles, cfr_parts, cfr_sections; this module only reads.
 */

import { and, eq, like, or, sql } from "drizzle-orm";
import * as db from "./db";
import { cfrTitles, cfrParts, cfrSections } from "../drizzle/schema";
import { getOrSetCache } from "./_core/redis";

export async function searchFulltext(
  q: string,
  opts?: { titleNumber?: number; partNumber?: number; limit?: number }
) {
  const database = await db.getDb();
  if (!database) return [];

  const limit = Math.min(opts?.limit ?? 50, 100);
  const term = `%${q.trim()}%`;
  if (!term || term === "%%") return [];

  const textMatch = or(
    like(cfrSections.subject, term),
    like(cfrSections.content, term)
  );
  const whereClause =
    opts?.titleNumber != null && opts?.partNumber != null
      ? and(
          textMatch,
          eq(cfrTitles.titleNumber, opts.titleNumber),
          eq(cfrParts.partNumber, opts.partNumber)
        )
      : opts?.titleNumber != null
        ? and(textMatch, eq(cfrTitles.titleNumber, opts.titleNumber))
        : textMatch;

  return database
    .select({
      id: cfrSections.id,
      sectionNumber: cfrSections.sectionNumber,
      subject: cfrSections.subject,
      content: cfrSections.content,
      partId: cfrSections.partId,
      partNumber: cfrParts.partNumber,
      partName: cfrParts.name,
      titleId: cfrParts.titleId,
      titleNumber: cfrTitles.titleNumber,
      titleName: cfrTitles.name,
    })
    .from(cfrSections)
    .innerJoin(cfrParts, eq(cfrSections.partId, cfrParts.id))
    .innerJoin(cfrTitles, eq(cfrParts.titleId, cfrTitles.id))
    .where(whereClause)
    .limit(limit);
}

export async function getTitle(titleNumber: number, year?: number) {
  return getOrSetCache(
    "getTitle",
    { titleNumber, year: year ?? null },
    async () => {
      const database = await db.getDb();
      if (!database) return null;

      // Build where clause with optional year filter
      const whereClause = year 
        ? and(eq(cfrTitles.titleNumber, titleNumber), eq(cfrTitles.year, year))
        : eq(cfrTitles.titleNumber, titleNumber);

      const [title] = await database
        .select()
        .from(cfrTitles)
        .where(whereClause)
        .orderBy(cfrTitles.year) // Get latest if no year specified
        .limit(1);
      if (!title) return null;

      const parts = await database
        .select({
          id: cfrParts.id,
          partNumber: cfrParts.partNumber,
          name: cfrParts.name,
          subject: cfrParts.subject,
        })
        .from(cfrParts)
        .where(eq(cfrParts.titleId, title.id));

      return { ...title, parts };
    },
    900 // 15 minutes TTL
  );
}

export async function getPart(titleNumber: number, partNumber: number, year?: number) {
  return getOrSetCache(
    "getPart",
    { titleNumber, partNumber, year: year ?? null },
    async () => {
      const database = await db.getDb();
      if (!database) return null;

      const titleWhere = year
        ? and(eq(cfrTitles.titleNumber, titleNumber), eq(cfrTitles.year, year))
        : eq(cfrTitles.titleNumber, titleNumber);

      const [title] = await database
        .select()
        .from(cfrTitles)
        .where(titleWhere)
        .orderBy(cfrTitles.year)
        .limit(1);
      if (!title) return null;

      const [part] = await database
        .select()
        .from(cfrParts)
        .where(
          and(
            eq(cfrParts.titleId, title.id),
            eq(cfrParts.partNumber, partNumber)
          )
        )
        .limit(1);
      if (!part) return null;

      const sections = await database
        .select()
        .from(cfrSections)
        .where(eq(cfrSections.partId, part.id))
        .orderBy(cfrSections.sectionNumber);

      return { title, part, sections };
    },
    900 // 15 minutes TTL
  );
}

export async function getSectionById(sectionId: number) {
  const database = await db.getDb();
  if (!database) return null;

  const [section] = await database
    .select()
    .from(cfrSections)
    .where(eq(cfrSections.id, sectionId))
    .limit(1);
  if (!section) return null;

  const [part] = await database
    .select()
    .from(cfrParts)
    .where(eq(cfrParts.id, section.partId))
    .limit(1);
  if (!part) return { section, part: null, title: null };

  const [title] = await database
    .select()
    .from(cfrTitles)
    .where(eq(cfrTitles.id, part.titleId))
    .limit(1);

  return { section, part, title: title ?? null };
}

/** Distinct years present in cfr_titles (for year filter). */
export async function listYears(): Promise<number[]> {
  return getOrSetCache(
    "listYears",
    {},
    async () => {
      const database = await db.getDb();
      if (!database) return [];

      const rows = await database
        .selectDistinct({ year: cfrTitles.year })
        .from(cfrTitles)
        .orderBy(cfrTitles.year);
      return rows.map((r) => r.year);
    },
    3600 // 1 hour TTL
  );
}

/** Normalize a DB row to a strict title shape (handles raw SQL / Redis / any casing). */
function normalizeTitleRow(row: unknown): { id: number; titleNumber: number; name: string | null; subject: string | null; year: number } | null {
  if (row == null || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = Number(r.id ?? r.ID ?? 0);
  const titleNumber = Number(r.titleNumber ?? r.title_number ?? 0);
  const year = Number(r.year ?? r.YEAR ?? 0);
  if (Number.isNaN(titleNumber) || titleNumber < 1 || Number.isNaN(year)) return null;
  return {
    id: Number.isNaN(id) ? 0 : id,
    titleNumber,
    name: typeof r.name === "string" ? r.name : (r.name != null ? String(r.name) : null),
    subject: typeof r.subject === "string" ? r.subject : (r.subject != null ? String(r.subject) : null),
    year,
  };
}

/**
 * List CFR titles — cached in Redis for fast UI rendering.
 * Returns a strict shape so the frontend never sees malformed rows.
 */
export async function listTitles(year?: number): Promise<{ id: number; titleNumber: number; name: string | null; subject: string | null; year: number }[]> {
  return getOrSetCache(
    "listTitles",
    { year: year ?? null },
    async () => {
      const database = await db.getDb();
      if (!database) return [];

      if (year != null) {
        const rows = await database
          .select({
            id: cfrTitles.id,
            titleNumber: cfrTitles.titleNumber,
            name: cfrTitles.name,
            subject: cfrTitles.subject,
            year: cfrTitles.year,
          })
          .from(cfrTitles)
          .where(eq(cfrTitles.year, year))
          .orderBy(cfrTitles.titleNumber);
        const normalized = rows.map((r) => normalizeTitleRow(r)).filter((n): n is NonNullable<typeof n> => n != null);
        return normalized;
      }

      // All years: latest version of each title (raw SQL for subquery; normalize every row)
      const raw = await database.execute(sql`
        SELECT t1.id, t1.title_number as titleNumber, t1.name, t1.subject, t1.year
        FROM cfr_titles t1
        INNER JOIN (
          SELECT title_number, MAX(year) as max_year
          FROM cfr_titles
          GROUP BY title_number
        ) t2 ON t1.title_number = t2.title_number AND t1.year = t2.max_year
        ORDER BY t1.title_number
      `);
      let rows: unknown[] = [];
      if (Array.isArray(raw)) {
        rows = Array.isArray(raw[0]) ? raw[0] : (raw[0] != null ? [raw[0]] : []);
      } else if (raw && typeof raw === "object" && "0" in raw) {
        rows = Array.isArray((raw as any)[0]) ? (raw as any)[0] : [];
      }
      const out: { id: number; titleNumber: number; name: string | null; subject: string | null; year: number }[] = [];
      for (const row of rows) {
        const n = normalizeTitleRow(row);
        if (n) out.push(n);
      }
      return out;
    },
    300 // 5 minutes TTL
  );
}

/** Aggregate counts and year range for UI (same DB Airflow writes to). */
export async function getCoverage(): Promise<{
  titlesCount: number;
  sectionsCount: number;
  partsCount: number;
  years: number[];
  yearMin: number | null;
  yearMax: number | null;
}> {
  return getOrSetCache(
    "getCoverage",
    {},
    async () => {
      const database = await db.getDb();
      if (!database) {
        return {
          titlesCount: 0,
          sectionsCount: 0,
          partsCount: 0,
          years: [],
          yearMin: null,
          yearMax: null,
        };
      }

      const [titlesRow] = await database
        .select({ c: sql<number>`count(distinct ${cfrTitles.titleNumber})` })
        .from(cfrTitles)
        .limit(1);
      const [sectionsRow] = await database
        .select({ c: sql<number>`count(*)` })
        .from(cfrSections)
        .limit(1);
      const [partsRow] = await database
        .select({ c: sql<number>`count(*)` })
        .from(cfrParts)
        .limit(1);
      const yearsRows = await database
        .selectDistinct({ year: cfrTitles.year })
        .from(cfrTitles)
        .orderBy(cfrTitles.year);
      const years = yearsRows.map((r) => r.year);
      const yearMin = years.length > 0 ? Math.min(...years) : null;
      const yearMax = years.length > 0 ? Math.max(...years) : null;

      return {
        titlesCount: Number(titlesRow?.c ?? 0),
        sectionsCount: Number(sectionsRow?.c ?? 0),
        partsCount: Number(partsRow?.c ?? 0),
        years,
        yearMin,
        yearMax,
      };
    },
    1800 // 30 minutes TTL
  );
}
