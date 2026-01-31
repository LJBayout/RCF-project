# Translation Strategy: PTBR/US with OpenAI

## Overview

Implementing Portuguese (Brazil) ↔ English (US) translation for the CFR Data Platform, leveraging OpenAI for seamless integration with our RAG system.

## Current State

- ✅ **Azure Translator** configured in `.env` (not currently used)
- ✅ **OpenAI API** available for RAG
- ❌ **No translation implementation** yet

## Proposed Approach: OpenAI Translation

### Why OpenAI Instead of Azure Translator?

1. **Unified API** - Same provider as RAG system
2. **Better Context** - GPT models understand regulatory/legal terminology
3. **Cost Efficiency** - Single API key, simpler billing
4. **Quality** - Better handling of technical/compliance terms
5. **Integration** - Seamless with existing RAG pipeline

### Translation Use Cases

#### 1. **User Questions (PTBR → EN)**
- User asks in Portuguese: "Quais são os requisitos da FDA para assinaturas eletrônicas?"
- Translate to English: "What are FDA requirements for electronic signatures?"
- Query RAG system
- Translate response back to Portuguese

#### 2. **CFR Content Translation (EN → PTBR)**
- Translate CFR section content for Brazilian users
- Maintain original citations (21 CFR 820.30 stays the same)
- Translate regulatory text while preserving structure

#### 3. **AI Responses (EN → PTBR)**
- Translate RAG-generated answers to Portuguese
- Keep CFR citations in original format
- Maintain technical accuracy

## Implementation Options

### Option A: Full Translation Pipeline (Recommended)

```
User (PTBR) 
  → Translate Question (PTBR→EN)
  → RAG Query (EN)
  → Translate Answer (EN→PTBR)
  → User (PTBR)
```

**Pros:**
- Complete Portuguese experience
- Better for Brazilian compliance teams
- Can cache translations

**Cons:**
- Additional API calls (cost)
- Slight latency increase

### Option B: Hybrid Approach

```
User (PTBR)
  → Translate Question (PTBR→EN)
  → RAG Query (EN)
  → Return Answer (EN) + Translation Option
  → User chooses language
```

**Pros:**
- Lower cost (optional translation)
- Faster responses
- Users can see original English

**Cons:**
- Less seamless experience

### Option C: Pre-translated CFR Content

- Pre-translate all CFR sections to Portuguese
- Store translations in database
- Query Portuguese content directly

**Pros:**
- Fastest queries
- No translation latency

**Cons:**
- Massive storage requirement
- High upfront cost
- Maintenance burden (updates)

## Recommended Implementation: Option A

### Architecture

```
┌─────────────────┐
│  User (PTBR)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Translation Service    │
│  (OpenAI GPT-4o-mini)   │
│  PTBR → EN              │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  RAG System             │
│  (Semantic Search + GPT) │
│  Returns EN answer      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Translation Service    │
│  (OpenAI GPT-4o-mini)   │
│  EN → PTBR              │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│  User (PTBR)    │
└─────────────────┘
```

### Technical Details

#### Translation Model
- **Model**: `gpt-4o-mini` (cost-effective, high quality)
- **Prompt**: Specialized for regulatory/legal terminology
- **Context**: Include CFR citation format preservation

#### Translation Prompt Template

```typescript
const translationPrompt = `You are a professional translator specializing in U.S. federal regulations and compliance documentation.

Your task:
1. Translate accurately between Portuguese (Brazil) and English (US)
2. Preserve all CFR citations exactly (e.g., "21 CFR 820.30" stays as-is)
3. Maintain technical/legal terminology accuracy
4. Keep formatting and structure intact

Translate the following text:`;
```

#### Cost Estimation

**Per Question:**
- Question translation (PTBR→EN): ~50 tokens × $0.15/1M = $0.0000075
- Answer translation (EN→PTBR): ~500 tokens × $0.15/1M = $0.000075
- **Total per question**: ~$0.00008

**Monthly (1000 questions):**
- Translation cost: ~$0.08/month
- **Negligible compared to RAG costs** ($1.50/month)

## Implementation Plan

### Phase 1: Basic Translation Service
1. Create `server/_core/translation.ts`
2. Implement OpenAI translation function
3. Add language detection
4. Create tRPC endpoint

### Phase 2: RAG Integration
1. Detect user language preference
2. Auto-translate questions before RAG query
3. Auto-translate answers after RAG response
4. Add language toggle in UI

### Phase 3: UI Enhancement
1. Language selector in navbar
2. Language toggle in chatbot
3. Show original language option
4. Translation quality indicators

### Phase 4: Optimization
1. Cache common translations
2. Batch translation requests
3. Pre-translate common CFR sections
4. Monitor translation quality

## Code Structure

```
server/_core/
  └── translation.ts        # OpenAI translation service

server/routers/
  └── translation.ts        # tRPC translation endpoints

client/src/
  └── contexts/
      └── LanguageContext.tsx  # Language preference management
  └── components/
      └── LanguageToggle.tsx   # UI language selector
```

## API Design

### tRPC Endpoints

```typescript
translation: {
  translate: publicProcedure
    .input(z.object({
      text: z.string(),
      from: z.enum(['en', 'pt-BR']),
      to: z.enum(['en', 'pt-BR']),
      preserveCitations: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      return await translateText(input);
    }),

  detectLanguage: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(async ({ input }) => {
      return await detectLanguage(input.text);
    }),
}
```

## Benefits

1. **Accessibility** - Brazilian compliance teams can use platform in Portuguese
2. **Accuracy** - GPT understands regulatory context better than generic translators
3. **Integration** - Seamless with existing RAG system
4. **Cost** - Minimal additional cost (~5% of RAG costs)
5. **Quality** - Better than Azure Translator for technical content

## Next Steps

1. **Decide on approach** (Option A recommended)
2. **Implement translation service** using OpenAI
3. **Integrate with RAG** pipeline
4. **Add UI language selector**
5. **Test with real CFR content**

## Questions to Consider

1. **Default language?** (EN or PTBR?)
2. **Auto-detect or manual selection?**
3. **Show original alongside translation?**
4. **Cache translations?** (Redis)
5. **Pre-translate popular CFR sections?**

---

**Status**: 📋 Proposal - Ready for implementation
**Estimated Implementation**: 2-3 hours
**Cost Impact**: ~$0.08/month per 1000 questions
