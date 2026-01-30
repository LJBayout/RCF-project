/**
 * CFR data access — single place for queries used by the API.
 * Airflow fills cfr_titles, cfr_parts, cfr_sections; this module only reads.
 */

import { and, eq, like, or } from "drizzle-orm";
import * as db from "./db";
import { cfrTitles, cfrParts, cfrSections } from "../drizzle/schema";

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

export async function getTitle(titleNumber: number) {
  const database = await db.getDb();
  if (!database) return null;

  const [title] = await database
    .select()
    .from(cfrTitles)
    .where(eq(cfrTitles.titleNumber, titleNumber))
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
}

export async function getPart(titleNumber: number, partNumber: number) {
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
  const database = await db.getDb();
  if (!database) return [];

  const rows = await database
    .selectDistinct({ year: cfrTitles.year })
    .from(cfrTitles)
    .orderBy(cfrTitles.year);
  return rows.map((r) => r.year);
}

export async function listTitles(year?: number) {
  const database = await db.getDb();
  if (!database) return [];

  const base = database
    .select({
      id: cfrTitles.id,
      titleNumber: cfrTitles.titleNumber,
      name: cfrTitles.name,
      subject: cfrTitles.subject,
      year: cfrTitles.year,
    })
    .from(cfrTitles);

  if (year != null) {
    return base.where(eq(cfrTitles.year, year)).orderBy(cfrTitles.titleNumber);
  }
  return base.orderBy(cfrTitles.titleNumber);
}
