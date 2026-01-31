# RAG Implementation Guide

## Overview

This CFR Data Platform now includes **Retrieval-Augmented Generation (RAG)** powered by OpenAI, enabling users to ask natural language questions and receive precise answers with authoritative CFR citations.

## Architecture

### Components

1. **Vector Embeddings** - OpenAI `text-embedding-3-small` (1536 dimensions)
2. **Storage** - MySQL `TEXT` column in `cfr_sections` table
3. **Semantic Search** - Cosine similarity calculation in-memory
4. **Answer Generation** - OpenAI `gpt-4o-mini` for response synthesis

### Data Flow

```
User Question
    ↓
Generate Query Embedding
    ↓
Search cfr_sections (Cosine Similarity)
    ↓
Retrieve Top 5 Relevant Sections
    ↓
Build Context Prompt
    ↓
GPT-4 Generates Answer
    ↓
Return Answer + Source Citations
```

## Setup

### 1. Environment Variables

The OpenAI API key is already configured in `.env`:

```bash
OPENAI_API_KEY=sk-proj-...
```

### 2. Database Migration

Migration has been applied automatically. To verify:

```sql
mysql -h 127.0.0.1 -u app -papp cfr_platform

DESCRIBE cfr_sections;
-- Should show 'embedding' and 'embedding_updated_at' columns
```

### 3. Generate Embeddings

Generate embeddings for all CFR sections:

```bash
# Generate all embeddings (this will take time!)
tsx scripts/generate-embeddings.ts

# Or test with a small batch
tsx scripts/generate-embeddings.ts --limit=100

# Process only specific title
tsx scripts/generate-embeddings.ts --title=21 --batch-size=50
```

**Performance:**
- ~100ms per section (OpenAI API latency)
- ~10 sections/second
- For 10,000 sections: ~15-20 minutes
- Rate limit: Built-in 100ms delay between requests

**Progress:**
```
🚀 Starting embedding generation...
📊 Batch size: 100
📝 Found 10000 sections without embeddings
⏳ Starting in 3 seconds... (Ctrl+C to cancel)

Processed batch 1: 100 success, 0 failed
Processed batch 2: 200 success, 0 failed
...

✅ Embedding generation complete!
   Success: 10000
   Failed: 0
   Duration: 1000.45s
   Rate: 9.99 sections/sec
```

## Usage

### Web Interface

Navigate to `/ask` in the application:

1. **Ask Questions**
   - "What are the FDA requirements for electronic signatures?"
   - "How do I comply with EPA stormwater permits?"
   - "What changed in 21 CFR 820 between 2016 and 2023?"

2. **View Sources**
   - Right panel shows top 5 relevant sections
   - Each source includes similarity score
   - Click "View full text" to see complete regulation

### API Endpoints

#### 1. Ask Question (RAG)

```typescript
const response = await trpc.rag.ask.mutate({
  question: "What are the FDA requirements for electronic signatures?",
  titleFilter: 21 // Optional: filter by CFR title
});

// Response:
{
  answer: "According to 21 CFR Part 11...",
  sources: [
    {
      titleNumber: 21,
      titleName: "Food and Drugs",
      partNumber: 11,
      partName: "Electronic Records; Electronic Signatures",
      sectionNumber: "11.10",
      sectionSubject: "Controls for closed systems",
      similarity: 0.87
    },
    // ... more sources
  ]
}
```

#### 2. Semantic Search

```typescript
const results = await trpc.rag.search.query({
  query: "validation requirements",
  limit: 10,
  titleFilter: 21
});

// Returns array of sections with similarity scores
```

## How It Works

### 1. Embedding Generation

Each CFR section is converted to a rich text representation:

```
Title 21: Food and Drugs
Part 820: Quality System Regulation
Section 820.30: Design Controls
[Full section content...]
```

This text is sent to OpenAI to generate a 1536-dimensional vector embedding that captures semantic meaning.

### 2. Semantic Search

When a user asks a question:

1. Generate embedding for the question
2. Fetch all sections with embeddings (max 1000 for performance)
3. Calculate cosine similarity between question embedding and each section embedding
4. Sort by similarity descending
5. Return top N results

**Cosine Similarity Formula:**

```
similarity(A, B) = (A · B) / (||A|| * ||B||)
```

Range: 0.0 (completely different) to 1.0 (identical)

### 3. Answer Generation

Retrieved sections are formatted into a context prompt:

```
[Source 1] Title 21 (Food and Drugs), Part 820, Section 820.30
Design Controls
[section content...]

[Source 2] Title 21 (Food and Drugs), Part 11, Section 11.10
Controls for closed systems
[section content...]
```

GPT-4 synthesizes an answer based ONLY on the provided sections, with citations.

## Cost Estimation

### OpenAI Pricing (as of 2026)

- **text-embedding-3-small**: $0.02 / 1M tokens
- **gpt-4o-mini**: $0.15 / 1M input tokens, $0.60 / 1M output tokens

### Example Costs

**One-time Embedding Generation:**
- 10,000 sections × 500 tokens/section = 5M tokens
- Cost: 5M × $0.02 / 1M = **$0.10**

**Per Question:**
- Query embedding: 50 tokens × $0.02 / 1M = $0.000001
- Context: 5 sections × 1000 tokens = 5000 tokens
- Answer generation: 5000 input + 500 output tokens
- Cost: (5000 × $0.15 + 500 × $0.60) / 1M = **$0.0015 per question**

**Monthly (1000 questions/month):**
- 1000 questions × $0.0015 = **$1.50/month**

## Production Considerations

### Scaling

For production with >100K sections, consider:

1. **Dedicated Vector Database**
   - Pinecone, Weaviate, or Qdrant
   - Sub-millisecond similarity search
   - Native indexing and filtering

2. **PostgreSQL with pgvector**
   - Native vector support
   - SQL-based filtering
   - Good for <1M embeddings

3. **Caching Layer**
   - Redis cache for common questions
   - Cache embeddings in-memory
   - Pre-compute answers for FAQs

### Monitoring

Track these metrics:

- **Search Latency**: Time to retrieve relevant sections
- **Answer Quality**: User feedback on answer accuracy
- **API Costs**: OpenAI token usage
- **Embedding Coverage**: % of sections with embeddings

### Security

- ✅ API key stored in `.env` (server-side only)
- ✅ Protected routes require authentication
- ✅ Input validation (Zod schemas)
- ⚠️ Rate limiting recommended for production

## Troubleshooting

### Embeddings Not Generated

**Issue:** Sections have `NULL` embeddings

**Solution:**
```bash
# Check how many sections need embeddings
mysql -h 127.0.0.1 -u app -papp cfr_platform -e "SELECT COUNT(*) FROM cfr_sections WHERE embedding IS NULL;"

# Run generation script
tsx scripts/generate-embeddings.ts
```

### Poor Answer Quality

**Issue:** AI gives irrelevant or incorrect answers

**Possible Causes:**
1. **Low Similarity Scores** - If top results have <0.6 similarity, embeddings may not capture the domain well
2. **Insufficient Context** - Increase top-N results (currently 5)
3. **Query Ambiguity** - Ask users to be more specific

**Solution:**
```typescript
// Adjust in server/_core/rag.ts
const searchResults = await semanticSearch(question, 10, titleFilter); // Increase to 10
```

### OpenAI Rate Limits

**Issue:** `RateLimitError: You exceeded your rate limit`

**Solution:**
```typescript
// Adjust delay in server/_core/rag.ts generateSectionEmbeddings()
await new Promise((resolve) => setTimeout(resolve, 500)); // Increase from 100ms to 500ms
```

### High API Costs

**Issue:** Unexpected OpenAI billing

**Monitoring:**
```bash
# Check OpenAI dashboard: https://platform.openai.com/usage
# Set up billing alerts
```

**Optimization:**
- Cache common questions (Redis)
- Reduce max_tokens in chat completion (currently 1000)
- Use cheaper models for simple queries
- Implement question deduplication

## Next Steps

### Recommended Enhancements

1. **Query Expansion**
   - Auto-expand acronyms (FDA → Food and Drug Administration)
   - Include synonyms (record → documentation)

2. **Hybrid Search**
   - Combine semantic search with keyword search
   - Boost exact phrase matches

3. **Fine-Tuned Model**
   - Fine-tune OpenAI model on CFR Q&A pairs
   - Improve domain-specific understanding

4. **Multi-Turn Conversations**
   - Maintain conversation history
   - Reference previous answers

5. **Citation Verification**
   - Add direct links to official eCFR
   - Show regulation effective dates

## Support

For issues or questions:
- Check logs: `server/_core/rag.ts` console output
- Review OpenAI dashboard for API errors
- Test embeddings: `tsx scripts/generate-embeddings.ts --limit=10`

---

**Status:** ✅ Fully implemented and ready for testing
**Last Updated:** 2026-01-31
