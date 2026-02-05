import { Client } from "pg";
import OpenAI from "openai";
import { getDb } from "../db";
import { cfrSections, cfrParts, cfrTitles } from "../../drizzle/schema";
import { eq, and, isNotNull } from "drizzle-orm";

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

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function parseEmbeddingStr(s: string | null): number[] {
  if (!s) return [];
  try {
    return JSON.parse(s) as number[];
  } catch {
    return s.split(",").map(Number);
  }
}

/**
 * MySQL: search sections that have embeddings (in-memory similarity)
 */
async function searchMySQLVectors(
  embedding: number[],
  limit: number = 5,
  titleFilter?: number
): Promise<Array<{ section: any; part: any; title: any; similarity: number }>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      section: cfrSections,
      part: cfrParts,
      title: cfrTitles,
    })
    .from(cfrSections)
    .innerJoin(cfrParts, eq(cfrSections.partId, cfrParts.id))
    .innerJoin(cfrTitles, eq(cfrParts.titleId, cfrTitles.id))
    .where(
      titleFilter != null
        ? and(isNotNull(cfrSections.embedding), eq(cfrTitles.titleNumber, titleFilter))
        : isNotNull(cfrSections.embedding)
    )
    .limit(2000);
  const withSimilarity = rows
    .map((row) => {
      const vec = parseEmbeddingStr(row.section.embedding);
      if (vec.length === 0) return null;
      return {
        ...row,
        similarity: cosineSimilarity(embedding, vec),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return withSimilarity.map(({ section, part, title, similarity }) => ({
    section: {
      sectionNumber: section.sectionNumber,
      subject: section.subject,
      content: section.content,
    },
    part: { partNumber: part.partNumber, name: part.name },
    title: { titleNumber: title.titleNumber, name: title.name },
    similarity,
    year: title.year,
  }));
}

/**
 * PostgreSQL Vector Search (cfr_chunks + pgvector)
 */
async function searchPostgresVectors(embedding: number[], limit: number = 5): Promise<any[]> {
  const client = new Client({ connectionString: POSTGRES_URL });
  try {
    await client.connect();

    // Convert embedding to pgvector format string "[0.1, 0.2, ...]"
    const vectorStr = `[${embedding.join(",")}]`;

    // Query for nearest neighbors using cosine distance (<=>) or L2 (<->)
    // We use <=> (cosine) for best semantic match
    const query = `
      SELECT 
        id, 
        content, 
        metadata, 
        embedding <=> $1 as distance 
      FROM cfr_chunks 
      ORDER BY embedding <=> $1 ASC 
      LIMIT $2
    `;

    const res = await client.query(query, [vectorStr, limit]);

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
 * Semantic search: uses BOTH MySQL (cfr_sections.embedding) and Postgres (cfr_chunks).
 * Results are merged and sorted by similarity. You control MySQL via the admin Embeddings tab.
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

  const [mysqlResults, postgresChunks] = await Promise.all([
    searchMySQLVectors(queryEmbedding, fetchLimit, titleFilter),
    searchPostgresVectors(queryEmbedding, fetchLimit),
  ]);

  const postgresMapped = postgresChunks.map((chunk: any) => {
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

  const merged = [...mysqlResults, ...postgresMapped]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return merged;
}

/**
 * Generate embeddings for CFR sections and store in MySQL (cfr_sections.embedding).
 * This is what the admin "Start ingestion" controls. RAG search uses these + Postgres.
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

    // Get Data Timeline
    const rangeRes = await client.query('SELECT MIN(year) as min_year, MAX(year) as max_year FROM cfr_documents');
    const yearRange = rangeRes.rows[0].min_year ? {
      min: rangeRes.rows[0].min_year,
      max: rangeRes.rows[0].max_year
    } : null;

    await client.end();

    return { totalChunks, totalDocuments, lastIngested, coveredTitles, titleDistribution, yearRange };
  } catch (error) {
    console.error("Error fetching Postgres stats:", error);
    return {
      totalChunks: 0,
      totalDocuments: 0,
      lastIngested: null,
      coveredTitles: [],
      titleDistribution: [],
      yearRange: null
    };
  }
}
