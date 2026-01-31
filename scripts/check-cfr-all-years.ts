#!/usr/bin/env npx tsx
/**
 * Check CFR data coverage for all years in the database.
 * Usage: pnpm run check:cfr  OR  npx tsx scripts/check-cfr-all-years.ts
 * Requires: DATABASE_URL in .env (project root) or in the environment.
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, inArray } from "drizzle-orm";
import { cfrTitles, cfrParts, cfrSections } from "../drizzle/schema";

// Load .env from project root (parent of scripts/) so it works regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  console.error("  • Add DATABASE_URL to .env in the project root, or");
  console.error("  • Copy .env.example to .env and adjust if needed.");
  console.error("  Example: DATABASE_URL=mysql://app:app@127.0.0.1:3306/cfr_platform");
  process.exit(1);
}

async function main() {
  const pool = createPool({ uri: DATABASE_URL, connectionLimit: 2 });
  const db = drizzle(pool);

  console.log("CFR data check — all years\n");

  // 1) Distinct years
  const yearsRows = await db
    .selectDistinct({ year: cfrTitles.year })
    .from(cfrTitles)
    .orderBy(cfrTitles.year);
  const years = yearsRows.map((r) => r.year);

  if (years.length === 0) {
    console.log("No years found in cfr_titles. Database may be empty.");
    await pool.end();
    return;
  }

  console.log(`Years in DB: ${years.join(", ")} (${years.length} total)\n`);

  type Row = { year: number; titles: number; parts: number; sections: number; titleNumbers: number[] };
  const rows: Row[] = [];

  for (const year of years) {
    const titlesForYear = await db
      .select({ id: cfrTitles.id, titleNumber: cfrTitles.titleNumber })
      .from(cfrTitles)
      .where(eq(cfrTitles.year, year));
    const titleIds = titlesForYear.map((t) => t.id);
    const titleNumbers = [...new Set(titlesForYear.map((t) => t.titleNumber))].sort((a, b) => a - b);

    let partsCount = 0;
    let sectionsCount = 0;
    if (titleIds.length > 0) {
      const partsResult = await db
        .select({ id: cfrParts.id })
        .from(cfrParts)
        .where(inArray(cfrParts.titleId, titleIds));
      partsCount = partsResult.length;
      const partIds = partsResult.map((p) => p.id);
      if (partIds.length > 0) {
        const sectionsResult = await db
          .select({ id: cfrSections.id })
          .from(cfrSections)
          .where(inArray(cfrSections.partId, partIds));
        sectionsCount = sectionsResult.length;
      }
    }

    rows.push({
      year,
      titles: titlesForYear.length,
      parts: partsCount,
      sections: sectionsCount,
      titleNumbers,
    });
  }

  // Table header
  const colYear = "Year";
  const colTitles = "Titles";
  const colParts = "Parts";
  const colSections = "Sections";
  const colTitleList = "Title numbers (1–50 present)";
  const wYear = Math.max(colYear.length, 6);
  const wTitles = Math.max(colTitles.length, 6);
  const wParts = Math.max(colParts.length, 6);
  const wSections = Math.max(colSections.length, 8);

  console.log(
    `${colYear.padEnd(wYear)} | ${colTitles.padEnd(wTitles)} | ${colParts.padEnd(wParts)} | ${colSections.padEnd(wSections)} | ${colTitleList}`
  );
  console.log("-".repeat(wYear + wTitles + wParts + wSections + 20 + colTitleList.length));

  let totalTitles = 0;
  let totalParts = 0;
  let totalSections = 0;

  for (const r of rows) {
    totalTitles += r.titles;
    totalParts += r.parts;
    totalSections += r.sections;
    const missing = Array.from({ length: 50 }, (_, i) => i + 1).filter((n) => !r.titleNumbers.includes(n));
    const presentInfo =
      r.titleNumbers.length === 50
        ? "1–50 (all)"
        : missing.length <= 10
          ? `1–50 missing: ${missing.join(", ")}`
          : `1–50 present: ${r.titleNumbers.join(", ")}`;
    console.log(
      `${String(r.year).padEnd(wYear)} | ${String(r.titles).padEnd(wTitles)} | ${String(r.parts).padEnd(wParts)} | ${String(r.sections).padEnd(wSections)} | ${presentInfo}`
    );
  }

  console.log("-".repeat(wYear + wTitles + wParts + wSections + 20 + colTitleList.length));
  console.log(
    `${"TOTAL".padEnd(wYear)} | ${String(totalTitles).padEnd(wTitles)} | ${String(totalParts).padEnd(wParts)} | ${String(totalSections).padEnd(wSections)} | (all years)`
  );

  // --- Missing: what to ingest for full coverage (50 titles per year) ---
  const TARGET_TITLES = 50;
  const yearsWithGaps = rows.filter((r) => r.titleNumbers.length < TARGET_TITLES);
  if (yearsWithGaps.length > 0) {
    console.log("\n--- MISSING (need to ingest for full 1–50 coverage) ---");
    for (const r of yearsWithGaps) {
      const missing = Array.from({ length: TARGET_TITLES }, (_, i) => i + 1).filter(
        (n) => !r.titleNumbers.includes(n)
      );
      const pct = Math.round((r.titleNumbers.length / TARGET_TITLES) * 100);
      console.log(`\n  Year ${r.year}: ${r.titles}/${TARGET_TITLES} titles (${pct}%) — ${missing.length} missing`);
      if (missing.length <= 25) {
        console.log(`    Missing title numbers: ${missing.join(", ")}`);
      } else {
        console.log(`    Missing title numbers: ${missing.slice(0, 15).join(", ")} ... +${missing.length - 15} more`);
      }
    }
    console.log("\n  To fill gaps: run the CFR ingestion pipeline for the missing title numbers and years above.");
  } else if (rows.length > 0) {
    console.log("\n--- Coverage: all listed years have at least one title (no 1–50 gap report). ---");
  }

  console.log("\nDone. All years checked.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
