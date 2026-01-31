import OpenAI from "openai";
import { getDb } from "../db";
import { cfrSections, cfrParts, cfrTitles } from "../../drizzle/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Embedding model configuration
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const CHAT_MODEL = "gpt-4o-mini";

/**
 * Generate embedding for a text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: "float",
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Parse stored embedding string to number array
 */
function parseEmbedding(embeddingStr: string): number[] {
  try {
    return JSON.parse(embeddingStr);
  } catch {
    // Fallback for comma-separated format
    return embeddingStr.split(",").map(parseFloat);
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
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // Fetch sections with embeddings
  const sectionsQuery = db
    .select({
      section: cfrSections,
      part: cfrParts,
      title: cfrTitles,
    })
    .from(cfrSections)
    .innerJoin(cfrParts, eq(cfrSections.partId, cfrParts.id))
    .innerJoin(cfrTitles, eq(cfrParts.titleId, cfrTitles.id))
    .where(
      and(
        isNotNull(cfrSections.embedding),
        titleFilter ? eq(cfrTitles.titleNumber, titleFilter) : undefined
      )
    )
    .limit(1000); // Fetch a reasonable batch for similarity calculation
  
  const sections = await sectionsQuery;
  
  // Calculate similarities
  const results = sections
    .map((row) => {
      const embedding = parseEmbedding(row.section.embedding!);
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      return {
        ...row,
        similarity,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
  
  return results;
}

/**
 * Generate embeddings for a batch of sections
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
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < sectionIds.length; i += batchSize) {
    const batch = sectionIds.slice(i, i + batchSize);
    
    for (const sectionId of batch) {
      try {
        // Fetch section with metadata
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
        
        if (!row) continue;
        
        // Create enriched text for embedding
        const text = `Title ${row.title.titleNumber}: ${row.title.name}
Part ${row.part.partNumber}: ${row.part.name}
Section ${row.section.sectionNumber}: ${row.section.subject}
${row.section.content}`;
        
        // Generate embedding
        const embedding = await generateEmbedding(text);
        
        // Store embedding
        await db
          .update(cfrSections)
          .set({
            embedding: JSON.stringify(embedding),
            embedding_updated_at: new Date(),
          })
          .where(eq(cfrSections.id, sectionId));
        
        success++;
        
        // Rate limiting - wait between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to generate embedding for section ${sectionId}:`, error);
        failed++;
      }
    }
    
    console.log(`Processed batch ${i / batchSize + 1}: ${success} success, ${failed} failed`);
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
  
  // Build context from search results
  const context = searchResults
    .map(
      (result, idx) =>
        `[Source ${idx + 1}] Title ${result.title.titleNumber} (${result.title.name}), Part ${result.part.partNumber} (${result.part.name}), Section ${result.section.sectionNumber}
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
