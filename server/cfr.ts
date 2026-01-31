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

export async function getPart(titleNumber: number, partNumber: number) {
  return getOrSetCache(
    "getPart",
    { titleNumber, partNumber },
    async () => {
      const database = await db.getDb();
      if (!database) return null;

      const [title] = await database
        .select()
        .from(cfrTitles)
        .where(eq(cfrTitles.titleNumber, titleNumber))
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

export async function listTitles(year?: number) {
  return getOrSetCache(
    "listTitles",
    { year: year ?? null },
    async () => {
      const database = await db.getDb();
      if (!database) return [];

      if (year != null) {
        // Specific year: show all titles for that year
        return database
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
      }
      
      // All years: show only the LATEST version of each title
      const sql = `
        SELECT t1.id, t1.title_number as titleNumber, t1.name, t1.subject, t1.year
        FROM cfr_titles t1
        INNER JOIN (
          SELECT title_number, MAX(year) as max_year
          FROM cfr_titles
          GROUP BY title_number
        ) t2 ON t1.title_number = t2.title_number AND t1.year = t2.max_year
        ORDER BY t1.title_number
      `;
      
      const results = await database.execute(sql);
      // Drizzle execute returns [rows, fields] - rows is the first element
      // Handle both array and object formats
      let rows: any[] = [];
      if (Array.isArray(results)) {
        rows = Array.isArray(results[0]) ? results[0] : (results[0] ? [results[0]] : []);
      } else if (results && typeof results === 'object' && '0' in results) {
        rows = Array.isArray(results[0]) ? results[0] : [];
      }
      
      return rows.map((row: any) => ({
        id: Number(row?.id ?? row?.ID ?? 0),
        titleNumber: Number(row?.titleNumber ?? row?.title_number ?? row?.titleNumber ?? 0),
        name: row?.name ?? null,
        subject: row?.subject ?? null,
        year: Number(row?.year ?? row?.YEAR ?? 0),
      }));
    },
    1800 // 30 minutes TTL
  );
}

/** Aggregate counts for UI: distinct titles and total sections (same DB Airflow writes to). */
export async function getCoverage(): Promise<{ titlesCount: number; sectionsCount: number }> {
  const database = await db.getDb();
  if (!database) return { titlesCount: 0, sectionsCount: 0 };

  // Use Drizzle select + sql so result shape is consistent (mysql2 raw execute varies)
  const [titlesRow] = await database
    .select({ c: sql<number>`count(distinct ${cfrTitles.titleNumber})` })
    .from(cfrTitles)
    .limit(1);
  const [sectionsRow] = await database
    .select({ c: sql<number>`count(*)` })
    .from(cfrSections)
    .limit(1);
  const titlesCount = Number(titlesRow?.c ?? 0);
  const sectionsCount = Number(sectionsRow?.c ?? 0);
  return { titlesCount, sectionsCount };
}
