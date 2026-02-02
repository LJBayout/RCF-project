# RAG System - Feed CFR Data to AI

## Overview

The RAG (Retrieval-Augmented Generation) system allows the Compliance Intelligence chatbot to answer questions about **all CFR titles** using semantic search and AI.

## How It Works

1. **Embedding Generation**: Each CFR section is converted into a 1536-dimensional vector using OpenAI's `text-embedding-3-small` model
2. **Semantic Search**: User questions are embedded and matched against stored embeddings using cosine similarity
3. **Answer Generation**: The most relevant sections are sent to GPT-4 to generate accurate, cited answers

## Administration Page

Access the RAG admin page at: **`http://localhost:3000/admin/rag`**

### Features:

- ✅ **Status Dashboard**: See how many sections have embeddings  
- ✅ **Progress Tracking**: Real-time progress bar during ingestion
- ✅ **Batch Processing**: Configure batch size and limits  
- ✅ **Cost Estimation**: ~$0.02 per 1000 sections

## Usage Instructions

### 1. **Check Current Status**
   - Navigate to `/admin/rag`
   - View how many sections need embeddings

### 2. **Start Ingestion**
   - Set **Section Limit** (start with 100 for testing)
   - Set **Batch Size** (recommended: 50)
   - Click "Start Ingestion"

### 3. **Monitor Progress**
   - Watch the progress bar
   - Wait for completion message
   - Check success/failed counts

### 4. **Test the Chatbot**
   - Click the floating chatbot icon (bottom right)
   - Ask questions like:
     - "What are the FDA requirements for electronic signatures?"
     - "How do I comply with EPA stormwater permits?"
     - "What changed in 21 CFR 820 between 2016 and 2023?"

## API Endpoints

### **`rag.ingest`** (mutation)
Generates embeddings for CFR sections

```typescript
await trpc.rag.ingest.mutate({
  limit: 100,      // Optional: max sections to process
  batchSize: 50    // Sections per batch
});
```

### **`rag.getIngestStatus`** (query)
Gets current ingestion status

```typescript
const status = await trpc.rag.getIngestStatus.useQuery();
// Returns: { total, completed, missing, progress }
```

### **`rag.ask`** (mutation)
Ask a question and get an AI answer

```typescript
const result = await trpc.rag.ask.mutate({
  question: "What are OSHA lockout/tagout requirements?",
  titleFilter: 29  // Optional: limit to specific title
});
```

## Important Notes

### ⚠️ **Cost Considerations**
- Processing uses OpenAI API credits
- ~$0.02 per 1,000 sections
- Full database ingestion may cost $10-50 depending on size

### ⏱️ **Processing Time**
- ~600 sections per minute (rate-limited)
- Full ingestion may take several hours for large databases

### 🔒 **Requirements**
- Valid `OPENAI_API_KEY` in `.env`
- Authenticated user access
- MySQL database with CFR data

## Troubleshooting

**Problem**: "All sections already have embeddings"  
**Solution**: Data is already ingested! Test the chatbot.

**Problem**: "Failed to generate embedding"  
**Solution**: Check `OPENAI_API_KEY` is valid and has credits

**Problem**: Slow processing  
**Solution**: This is normal - rate limiting prevents API throttling

## Database Schema

Embeddings are stored in the `cfr_sections` table:

```sql
embedding TEXT               -- JSON array of 1536 floats
embedding_updated_at DATETIME -- Last update timestamp
```

## Next Steps

1. Start with a small batch (100 sections) to test
2. Monitor costs and adjust batch size
3. Gradually process all sections
4. Test chatbot responses
5. Iterate on system prompt if needed

---

**Created**: 2026-02-02  
**Version**: 1.0
