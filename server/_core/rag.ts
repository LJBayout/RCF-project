import { Client } from "pg";
import axios from "axios";
import OpenAI from "openai";

// Initialize OpenAI for Chat
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const CHAT_MODEL = "gpt-4o-mini";

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://host.docker.internal:11434";
const EMBEDDING_MODEL = "text-embedding-3-small";
const POSTGRES_URL = process.env.DATABASE_URL_PG || "postgresql://airflow:airflow@postgres:5432/airflow"; // Using Airflow DB for vectors

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
 * PostgreSQL Vector Search
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
 * Semantic search across CFR sections using embeddings
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
}>> {

  // 1. Generate Query Vector via Ollama
  const queryEmbedding = await generateEmbedding(query);

  // 2. Search Postgres
  const chunks = await searchPostgresVectors(queryEmbedding, limit);

  // 3. Map to Frontend Format
  // The frontend expects nested objects { title: {...}, part: {...}, section: {...} }
  // Our Postgres metadata JSON has: { "title": 12, "part": 456, "section": "12.3", "year": 2024 }

  return chunks.map(chunk => {
    const meta = chunk.metadata || {};

    // Heuristic: If part is 0/missing, try to extract from section number (e.g. "11.10" -> Part 11)
    let partNum = meta.part || 0;
    const sectionStr = String(meta.section || "").replace(/§/g, '').trim();

    if (partNum === 0 && sectionStr.includes(".")) {
      const inferred = parseInt(sectionStr.split(".")[0], 10);
      if (!isNaN(inferred) && inferred > 0) {
        partNum = inferred;
      }
    }

    return {
      title: {
        titleNumber: meta.title,
        name: `Title ${meta.title}`
      },
      part: {
        partNumber: partNum,
        name: `Part ${partNum}`
      },
      section: {
        // Remove § symbol and trim for clean ID
        sectionNumber: sectionStr,
        subject: chunk.content.substring(0, 50) + "...",
        content: chunk.content,
        embedding: null
      },
      year: meta.year || "Unknown",
      similarity: chunk.similarity
    };
  });
}

// Note: Ingestion is now handled by Airflow DAG (cfr_rag_ingestion_optimized).
// This function is kept as a stub for compatibility or future implementation.
export async function generateSectionEmbeddings(
  sectionIds: number[],
  batchSize: number = 100
): Promise<{ success: number; failed: number }> {
  console.log("Ingestion requested: Handled by Airflow DAG");
  return { success: 0, failed: 0 };
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
