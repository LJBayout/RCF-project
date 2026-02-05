import { Client } from "pg";
import OpenAI from "openai";
import { getDb } from "../db";
import { cfrSections, cfrParts, cfrTitles } from "../../drizzle/schema";
import { eq, inArray, sql } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const CHAT_MODEL = "gpt-4o-mini";
const EMBEDDING_MODEL = "text-embedding-3-small";
const POSTGRES_URL = process.env.DATABASE_URL_PG || "postgresql://airflow:airflow@postgres:5432/airflow";

/**
 * Generate embedding using OpenAI (Matches Airflow Ingestion)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.replace(/\n/g, " "),
      encoding_format: "float",
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating OpenAI embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

/**
 * PostgreSQL Vector Search (cfr_chunks + pgvector). Optional filter by CFR title.
 */
async function searchPostgresVectors(
  embedding: number[],
  limit: number = 5,
  titleFilter?: number
): Promise<any[]> {
  const client = new Client({ connectionString: POSTGRES_URL });
  try {
    await client.connect();

    const vectorStr = `[${embedding.join(",")}]`;

    const useTitleFilter = titleFilter != null;
    const query = useTitleFilter
      ? `
      SELECT id, content, metadata, embedding <=> $1 as distance
      FROM cfr_chunks
      WHERE (metadata->>'title')::int = $2
      ORDER BY embedding <=> $1 ASC
      LIMIT $3
    `
      : `
      SELECT id, content, metadata, embedding <=> $1 as distance
      FROM cfr_chunks
      ORDER BY embedding <=> $1 ASC
      LIMIT $2
    `;
    const params = useTitleFilter ? [vectorStr, titleFilter, limit] : [vectorStr, limit];

    const res = await client.query(query, params);

    return res.rows.map(row => ({
      ...row,
      similarity: 1 - row.distance // Convert distance to similarity
    }));
  } catch (err) {
    console.error("Postgres Vector Search Error:", err);
    return [];
  } finally {
    await client.end();
  }
}

/**
 * Semantic search: single source Postgres (cfr_chunks + pgvector).
 * Ingest via Embeddings tab or Airflow; both write to Postgres.
 */
export async function semanticSearch(
  query: string,
  limit: number = 5,
  titleFilter?: number
): Promise<Array<{
  section: any;
  part: any;
  title: any;
  similarity: number;
  year?: number | string;
}>> {
  const queryEmbedding = await generateEmbedding(query);
  const fetchLimit = Math.max(limit * 2, 20);

  const postgresChunks = await searchPostgresVectors(queryEmbedding, fetchLimit, titleFilter);

  const mapped = postgresChunks.map((chunk: any) => {
    const meta = chunk.metadata || {};
    let partNum = meta.part || 0;
    const sectionStr = String(meta.section || "").replace(/§/g, "").trim();
    if (partNum === 0 && sectionStr.includes(".")) {
      const inferred = parseInt(sectionStr.split(".")[0], 10);
      if (!isNaN(inferred) && inferred > 0) partNum = inferred;
    }
    return {
      title: { titleNumber: meta.title, name: `Title ${meta.title}` },
      part: { partNumber: partNum, name: `Part ${partNum}` },
      section: {
        sectionNumber: sectionStr,
        subject: (chunk.content || "").substring(0, 50) + "...",
        content: chunk.content,
      },
      similarity: chunk.similarity,
      year: meta.year ?? "Unknown",
    };
  });

  return mapped.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}

/**
 * Ingest CFR sections from MySQL into Postgres (cfr_documents + cfr_chunks).
 * Only adds sections that are not yet in cfr_documents (avoids duplicates with Airflow).
 * Used by the Embeddings tab "Start ingestion" — single source Postgres for RAG.
 */
export async function ingestSectionsToPostgres(
  sectionIds: number[],
  batchSize: number = 50
): Promise<{ success: number; failed: number; skipped: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const pg = new Client({ connectionString: POSTGRES_URL });
  await pg.connect();

  let success = 0;
  let failed = 0;
  let skipped = 0;

  try {
    for (let i = 0; i < sectionIds.length; i += batchSize) {
      const batch = sectionIds.slice(i, i + batchSize);

      const rows = await db
        .select({
          id: cfrSections.id,
          titleNumber: cfrTitles.titleNumber,
          partNumber: cfrParts.partNumber,
          sectionNumber: cfrSections.sectionNumber,
          year: cfrTitles.year,
          subject: cfrSections.subject,
          content: cfrSections.content,
          partName: cfrParts.name,
          titleName: cfrTitles.name,
        })
        .from(cfrSections)
        .innerJoin(cfrParts, eq(cfrSections.partId, cfrParts.id))
        .innerJoin(cfrTitles, eq(cfrParts.titleId, cfrTitles.id))
        .where(inArray(cfrSections.id, batch));

      if (rows.length === 0) continue;

      const valuesClause = rows
        .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
        .join(", ");
      const existingRes = await pg.query(
        `SELECT title_number, section_number, year FROM cfr_documents
         WHERE (title_number, section_number, year) IN (${valuesClause})`,
        rows.flatMap((s) => [s.titleNumber, s.sectionNumber, String(s.year)])
      );
      const existingSet = new Set(
        (existingRes.rows || []).map((r: any) => `${r.title_number}|${r.section_number}|${r.year}`)
      );

      for (const sec of rows) {
        const key = `${sec.titleNumber}|${sec.sectionNumber}|${sec.year}`;
        if (existingSet.has(key)) {
          skipped++;
          continue;
        }

        try {
          const docRes = await pg.query(
            `INSERT INTO cfr_documents (title_number, part_number, section_number, year, subject)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (title_number, section_number, year) DO NOTHING
             RETURNING id`,
            [sec.titleNumber, sec.partNumber, sec.sectionNumber, sec.year, sec.subject ?? ""]
          );
          const docId = docRes.rows?.[0]?.id;
          if (!docId) {
            skipped++;
            continue;
          }

          const text = `Title ${sec.titleNumber}: ${sec.titleName}\nPart ${sec.partNumber}: ${sec.partName}\nSection ${sec.sectionNumber}: ${sec.subject}\n${sec.content || ""}`;
          const embedding = await generateEmbedding(text);
          const vectorStr = `[${embedding.join(",")}]`;
          const meta = JSON.stringify({
            title: sec.titleNumber,
            part: sec.partNumber,
            section: sec.sectionNumber,
            year: sec.year,
          });

          await pg.query(
            `INSERT INTO cfr_chunks (document_id, chunk_index, content, embedding, metadata)
             VALUES ($1, 0, $2, $3::vector, $4::jsonb)`,
            [docId, text, vectorStr, meta]
          );
          success++;
          existingSet.add(key);
          await new Promise((r) => setTimeout(r, 50));
        } catch (err) {
          console.error(`Ingest failed for section ${sec.id}:`, err);
          failed++;
        }
      }
    }
  } finally {
    await pg.end();
  }

  return { success, failed, skipped };
}

/**
 * @deprecated RAG now uses Postgres only. Use ingestSectionsToPostgres for new ingestion.
 * Generate embeddings for CFR sections and store in MySQL (cfr_sections.embedding).
 */
export async function generateSectionEmbeddings(
  sectionIds: number[],
  batchSize: number = 100
): Promise<{ success: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < sectionIds.length; i += batchSize) {
    const batch = sectionIds.slice(i, i + batchSize);
    for (const sectionId of batch) {
      try {
        const [row] = await db
          .select({
            section: cfrSections,
            part: cfrParts,
            title: cfrTitles,
          })
          .from(cfrSections)
          .innerJoin(cfrParts, eq(cfrSections.partId, cfrParts.id))
          .innerJoin(cfrTitles, eq(cfrParts.titleId, cfrTitles.id))
          .where(eq(cfrSections.id, sectionId))
          .limit(1);

        if (!row) {
          failed++;
          continue;
        }

        const text = `Title ${row.title.titleNumber}: ${row.title.name}
Part ${row.part.partNumber}: ${row.part.name}
Section ${row.section.sectionNumber}: ${row.section.subject}
${row.section.content}`;

        const embedding = await generateEmbedding(text);
        await db
          .update(cfrSections)
          .set({
            embedding: JSON.stringify(embedding),
            embedding_updated_at: new Date(),
          })
          .where(eq(cfrSections.id, sectionId));

        success++;
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        console.error(`Embedding failed for section ${sectionId}:`, err);
        failed++;
      }
    }
  }

  return { success, failed };
}

/**
 * RAG: Answer a question using retrieved CFR sections
 */
export async function answerQuestion(
  question: string,
  titleFilter?: number
): Promise<{
  answer: string;
  sources: Array<{
    titleNumber: number;
    titleName: string;
    partNumber: number;
    partName: string;
    sectionNumber: string;
    sectionSubject: string;
    similarity: number;
    year?: number;
  }>;
}> {
  // Search for relevant sections
  const searchResults = await semanticSearch(question, 5, titleFilter);

  if (searchResults.length === 0) {
    return {
      answer: "I couldn't find relevant CFR sections to answer your question. Please try rephrasing or broadening your search.",
      sources: [],
    };
  }

  // Build context from search results with YEAR awareness
  const context = searchResults
    .map(
      (result: any, idx) =>
        `[Source ${idx + 1}] (Year: ${result.year}) Title ${result.title.titleNumber} (${result.title.name}), Part ${result.part.partNumber} (${result.part.name}), Section ${result.section.sectionNumber}
${result.section.subject}
${result.section.content.slice(0, 1000)}...`
    )
    .join("\n\n");

  // Generate answer using GPT
  const systemPrompt = `You are a compliance expert assistant specializing in the Code of Federal Regulations (CFR). 

Your role is to:
1. Answer questions using ONLY the provided CFR sections as sources
2. Cite specific sections in your answer (e.g., "According to 21 CFR 820.30...")
3. Be precise and professional
4. If the provided sections don't fully answer the question, acknowledge limitations
5. Focus on practical compliance guidance

Format your answers clearly with:
- Direct answer first
- Supporting citations
- Practical implications when relevant`;

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Question: ${question}

Relevant CFR Sections:
${context}

Please provide a comprehensive answer based on these sections.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const answer = completion.choices[0].message.content || "Unable to generate answer.";

  // Format sources
  const sources = searchResults.map((result) => ({
    titleNumber: result.title.titleNumber,
    titleName: result.title.name,
    partNumber: result.part.partNumber,
    partName: result.part.name,
    sectionNumber: result.section.sectionNumber,
    sectionSubject: result.section.subject,
    similarity: result.similarity,
  }));

  return { answer, sources };
}

/**
 * Get statistics from Postgres Vector Store
 */
export async function getPostgresStats(): Promise<{
  totalChunks: number;
  totalDocuments: number;
  totalSectionsMySQL: number;
  totalParts: number;
  totalYears: number;
  lastIngested: string | null;
  coveredTitles: number[];
  titleDistribution: { title: number; count: number }[];
  yearRange: { min: number; max: number } | null;
}> {
  try {
    const client = new Client({ connectionString: POSTGRES_URL });
    await client.connect();

    // Count Chunks
    const chunksRes = await client.query('SELECT COUNT(*) FROM cfr_chunks');
    const totalChunks = parseInt(chunksRes.rows[0].count, 10);

    // Count Documents
    const docsRes = await client.query('SELECT COUNT(*) FROM cfr_documents');
    const totalDocuments = parseInt(docsRes.rows[0].count, 10);

    // Last Ingestion Time
    const timeRes = await client.query('SELECT MAX(ingested_at) as last_ts FROM cfr_documents');
    const lastIngested = timeRes.rows[0].last_ts;

    // Get Title Distribution (Count per Title)
    // We group by title to see volume per title
    const distRes = await client.query('SELECT title_number, COUNT(*) as doc_count FROM cfr_documents GROUP BY title_number ORDER BY doc_count DESC');
    const titleDistribution = distRes.rows.map((r: any) => ({
      title: parseInt(r.title_number, 10),
      count: parseInt(r.doc_count, 10)
    }));

    // Covered Titles (derived from distribution for consistency)
    const coveredTitles = titleDistribution.map(d => d.title).sort((a, b) => a - b);

    // Get Parts Count
    const partsRes = await client.query('SELECT COUNT(DISTINCT part_number) FROM cfr_documents');
    const totalParts = parseInt(partsRes.rows[0].count, 10);

    // Get Distinct Years Count
    const yearsRes = await client.query('SELECT COUNT(DISTINCT year) FROM cfr_documents');
    const totalYears = parseInt(yearsRes.rows[0].count, 10);

    // Get Data Timeline
    const rangeRes = await client.query('SELECT MIN(year) as min_year, MAX(year) as max_year FROM cfr_documents');
    const yearRange = rangeRes.rows[0].min_year ? {
      min: rangeRes.rows[0].min_year,
      max: rangeRes.rows[0].max_year
    } : null;

    // Total Sections in MySQL (Global Progress)
    const db = await getDb();
    let totalSectionsMySQL = 0;
    if (db) {
      const [{ count }] = await db.select({ count: sql`count(*)` }).from(cfrSections);
      totalSectionsMySQL = Number(count);
    }

    await client.end();

    return {
      totalChunks,
      totalDocuments,
      totalSectionsMySQL,
      totalParts,
      totalYears,
      lastIngested,
      coveredTitles,
      titleDistribution,
      yearRange
    };
  } catch (error) {
    console.error("Error fetching Postgres stats:", error);
    return {
      totalChunks: 0,
      totalDocuments: 0,
      totalSectionsMySQL: 0,
      totalParts: 0,
      totalYears: 0,
      lastIngested: null,
      coveredTitles: [],
      titleDistribution: [],
      yearRange: null
    };
  }
}

/**
 * Gap Analysis: MySQL vs Postgres (Vector Store).
 * Identifies what is missing from the RAG system.
 */
export async function getGapAnalysis(): Promise<Array<{
  title: number;
  year: number;
  mysqlCount: number;
  postgresCount: number;
  status: "missing" | "partial" | "complete";
  percentage: number;
}>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const pg = new Client({ connectionString: POSTGRES_URL });
  await pg.connect();

  try {
    // 1. Get counts from MySQL per title/year
    const mysqlRows = await db.execute(sql`
        SELECT t.title_number as title, t.year, COUNT(s.id) as count
        FROM cfr_titles t
        JOIN cfr_parts p ON t.id = p.title_id
        JOIN cfr_sections s ON p.id = s.part_id
        GROUP BY t.title_number, t.year
        ORDER BY t.title_number, t.year DESC
    `);

    // Handle Drizzle result format variations
    let mysqlData: any[] = [];
    if (Array.isArray(mysqlRows)) {
      mysqlData = Array.isArray(mysqlRows[0]) ? mysqlRows[0] : mysqlRows;
    } else if (mysqlRows && typeof mysqlRows === 'object' && (mysqlRows as any).rows) {
      mysqlData = (mysqlRows as any).rows;
    }

    // 2. Get counts from Postgres per title/year
    const pgRes = await pg.query(`
        SELECT (metadata->>'title')::int as title, (metadata->>'year')::int as year, COUNT(*) as count
        FROM cfr_chunks
        GROUP BY (metadata->>'title')::int, (metadata->>'year')::int
    `);
    const pgData = pgRes.rows;

    // 3. Create a map for Postgres data for fast lookup
    const pgMap = new Map<string, number>();
    pgData.forEach((r: any) => {
      pgMap.set(`${r.title}|${r.year}`, parseInt(r.count, 10));
    });

    // 4. Transform and merge
    const analysis = mysqlData.map((row: any) => {
      const title = parseInt(row.title ?? row.TITLE, 10);
      const year = parseInt(row.year ?? row.YEAR, 10);
      const mysqlCount = parseInt(row.count ?? row.COUNT ?? 0, 10);
      const postgresCount = pgMap.get(`${title}|${year}`) ?? 0;

      let status: "missing" | "partial" | "complete" = "missing";
      const percentage = mysqlCount > 0 ? Math.round((postgresCount / mysqlCount) * 100) : 100;

      if (postgresCount === 0 && mysqlCount > 0) status = "missing";
      else if (postgresCount < mysqlCount) status = "partial";
      else status = "complete";

      return { title, year, mysqlCount, postgresCount, status, percentage };
    });

    return analysis as any;
  } catch (error) {
    console.error("Gap Analysis Error:", error);
    return [];
  } finally {
    await pg.end();
  }
}
