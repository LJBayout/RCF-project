# CFR Data Platform - Database Schema

## Visual Database Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MySQL Database: cfr_platform                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          CFR DATA TABLES (Core)                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│         cfr_titles                  │  ← TOP LEVEL (e.g., Title 21: Food & Drugs)
├─────────────────────────────────────┤
│ • id (PK, auto)                     │
│ • title_number (UNIQUE, indexed)    │  Example: 21
│ • name                              │  Example: "Food and Drugs"
│ • subject                           │  Example: "FDA regulations..."
│ • year                              │  Example: 1997
│ • revised_date                      │  Example: "2024-01-15"
│ • created_at                        │
├─────────────────────────────────────┤
│ Indexes:                            │
│ • title_number_idx                  │
│                                     │
│ Current: ~650 rows                  │
│ Final: ~5,911 rows                  │
└─────────────────────────────────────┘
              │
              │ 1:N relationship
              ▼
┌─────────────────────────────────────┐
│         cfr_parts                   │  ← SUBDIVISIONS (e.g., Part 1: General)
├─────────────────────────────────────┤
│ • id (PK, auto)                     │
│ • title_id (FK → cfr_titles.id)    │  CASCADE DELETE
│ • part_number                       │  Example: 1
│ • name                              │  Example: "General Provisions"
│ • subject                           │  Example: "Definitions and scope"
│ • authority                         │  Example: "21 U.S.C. 321"
│ • source                            │  Example: "42 FR 14308"
│ • created_at                        │
├─────────────────────────────────────┤
│ Indexes:                            │
│ • title_part_idx (title_id, part_number) │
│ Constraints:                        │
│ • unique_title_part (title_id, part_number) │
│                                     │
│ Current: ~7,800 rows                │
│ Final: ~70,932 rows                 │
└─────────────────────────────────────┘
              │
              │ 1:N relationship
              ▼
┌─────────────────────────────────────┐
│       cfr_sections                  │  ← REGULATIONS (Full text content)
├─────────────────────────────────────┤
│ • id (PK, auto)                     │
│ • part_id (FK → cfr_parts.id)      │  CASCADE DELETE
│ • section_number                    │  Example: "§ 1.1"
│ • subject                           │  Example: "Definitions"
│ • content (TEXT - LARGE!)           │  Full regulation text (can be 10KB+)
│ • created_at                        │
├─────────────────────────────────────┤
│ Indexes:                            │
│ • part_section_idx (part_id, section_number) │
│ Constraints:                        │
│ • unique_part_section (part_id, section_number) │
│                                     │
│ Current: ~296,400 rows              │
│ Final: ~2,842,704 rows              │
│                                     │
│ ⚠️  LARGEST TABLE - Contains all    │
│    searchable regulation text       │
└─────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                      USER & AUTH TABLES (Platform)                           │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│            users                    │  ← User accounts
├─────────────────────────────────────┤
│ • id (PK, auto)                     │
│ • openId (UNIQUE)                   │  OAuth identifier
│ • name                              │
│ • email                             │
│ • loginMethod                       │  e.g., "google", "github"
│ • role (ENUM)                       │  "user" | "admin"
│ • createdAt                         │
│ • updatedAt                         │
│ • lastSignedIn                      │
└─────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────┐
│       subscriptions                 │  ← Subscription plans
├─────────────────────────────────────┤
│ • id (PK, auto)                     │
│ • user_id (FK → users.id)           │  CASCADE DELETE
│ • plan (ENUM)                       │  "Free" | "Pro" | "Enterprise"
│ • status (ENUM)                     │  "active" | "cancelled" | "expired"
│ • stripe_customer_id                │
│ • stripe_subscription_id            │
│ • current_period_start              │
│ • current_period_end                │
│ • createdAt                         │
│ • updatedAt                         │
├─────────────────────────────────────┤
│ Indexes:                            │
│ • user_id_idx                       │
│ • stripe_customer_idx               │
└─────────────────────────────────────┘

              │
              │ 1:N
              ▼
┌─────────────────────────────────────┐
│          api_keys                   │  ← API authentication
├─────────────────────────────────────┤
│ • id (PK, auto)                     │
│ • user_id (FK → users.id)           │  CASCADE DELETE
│ • key (UNIQUE, indexed)             │  64-char API key
│ • name                              │  Key nickname
│ • last_used_at                      │
│ • createdAt                         │
├─────────────────────────────────────┤
│ Indexes:                            │
│ • key_idx                           │
│ • user_id_idx                       │
└─────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────┐
│         api_usage                   │  ← Usage tracking & analytics
├─────────────────────────────────────┤
│ • id (PK, auto, BIGINT)             │
│ • api_key_id (FK → api_keys.id)     │  CASCADE DELETE
│ • endpoint                          │  e.g., "/api/cfr/search"
│ • method                            │  e.g., "GET", "POST"
│ • status_code                       │  e.g., 200, 404
│ • response_time (ms)                │
│ • timestamp                         │
├─────────────────────────────────────┤
│ Indexes:                            │
│ • api_key_timestamp_idx             │
│ • timestamp_idx                     │
│                                     │
│ ⚠️  GROWS QUICKLY - Consider        │
│    archiving old records            │
└─────────────────────────────────────┘
```

---

## Relationships Diagram

```
users (1) ────┬──── (N) subscriptions
              │
              ├──── (N) api_keys ──── (N) api_usage
              │
              └──── (access to) ───────────────────┐
                                                    │
                                                    ▼
cfr_titles (1) ──── (N) cfr_parts ──── (N) cfr_sections
    ↑                                        ↑
    │                                        │
    └──── Queried by API ────────────────────┘
```

---

## Current Data Status (Live)

### CFR Data (Currently Processing - 11% Complete)

| Table | Current Rows | Final Rows (Est.) | Size | Purpose |
|-------|--------------|-------------------|------|---------|
| **cfr_titles** | 650 | 5,911 | Small | Title metadata |
| **cfr_parts** | 7,800 | 70,932 | Medium | Part metadata |
| **cfr_sections** | 296,400 | 2,842,704 | **HUGE** | Full regulation text |

**Total CFR data when complete:** ~2.9 million rows, ~15-20 GB

### Platform Data (Not yet populated)

| Table | Current Rows | Purpose |
|-------|--------------|---------|
| **users** | 0 | User accounts |
| **subscriptions** | 0 | Subscription plans |
| **api_keys** | 0 | API authentication |
| **api_usage** | 0 | Usage tracking |

---

## Example Data Flow

### 1. XML File → Database

```
Input: CFR-1997-title21-vol1.xml

Parsing:
┌─────────────────────────────────────┐
│ <TITLE N="21">                      │
│   <HEAD>Food and Drugs</HEAD>       │
│   <PART N="1">                      │
│     <HEAD>General Provisions</HEAD> │
│     <SECTION>                       │
│       <SECTNO>§ 1.1</SECTNO>        │
│       <SUBJECT>Definitions</SUBJECT>│
│       <CONTENT>...</CONTENT>        │
│     </SECTION>                      │
│   </PART>                           │
│ </TITLE>                            │
└─────────────────────────────────────┘
         ↓ Parser extracts
         ↓
┌─────────────────────────────────────┐
│ INSERT INTO cfr_titles              │
│   (title_number, name, year)        │
│ VALUES (21, 'Food and Drugs', 1997) │
└─────────────────────────────────────┘
         ↓ Returns title_id = 42
         ↓
┌─────────────────────────────────────┐
│ INSERT INTO cfr_parts               │
│   (title_id, part_number, name)     │
│ VALUES (42, 1, 'General Provisions')│
└─────────────────────────────────────┘
         ↓ Returns part_id = 123
         ↓
┌─────────────────────────────────────┐
│ INSERT INTO cfr_sections            │
│   (part_id, section_number,         │
│    subject, content)                │
│ VALUES (123, '§ 1.1',               │
│    'Definitions', '...')            │
└─────────────────────────────────────┘
```

### 2. API Query → Response

```
User Request:
GET /api/cfr/search?query=safety&title=21

API Query:
┌─────────────────────────────────────┐
│ SELECT                              │
│   t.title_number,                   │
│   p.part_number,                    │
│   s.section_number,                 │
│   s.subject,                        │
│   s.content                         │
│ FROM cfr_sections s                 │
│ JOIN cfr_parts p ON s.part_id = p.id│
│ JOIN cfr_titles t ON p.title_id=t.id│
│ WHERE t.title_number = 21           │
│   AND s.content LIKE '%safety%'     │
│ LIMIT 20                            │
└─────────────────────────────────────┘
         ↓
Response:
[
  {
    "title": 21,
    "part": 1,
    "section": "§ 1.1",
    "subject": "Safety definitions",
    "content": "...safety requirements..."
  },
  ...
]
```

---

## Database Size Estimates

### Current (650 files processed)

```
cfr_titles:    650 rows × ~200 bytes    = ~130 KB
cfr_parts:     7,800 rows × ~500 bytes  = ~3.9 MB
cfr_sections:  296,400 rows × ~5 KB     = ~1.48 GB
────────────────────────────────────────────────────
Total:                                    ~1.48 GB
```

### Final (5,911 files)

```
cfr_titles:    5,911 rows × ~200 bytes     = ~1.2 MB
cfr_parts:     70,932 rows × ~500 bytes    = ~35 MB
cfr_sections:  2,842,704 rows × ~5 KB      = ~14.2 GB
──────────────────────────────────────────────────────
Total:                                       ~14.2 GB
+ Indexes:                                   ~3-5 GB
──────────────────────────────────────────────────────
Grand Total:                                 ~17-19 GB
```

---

## Indexes & Performance

### Current Indexes

**cfr_titles:**
- `title_number_idx` - Fast lookup by title number

**cfr_parts:**
- `title_part_idx` - Fast lookup by title + part
- `unique_title_part` - Prevents duplicates

**cfr_sections:**
- `part_section_idx` - Fast lookup by part + section
- `unique_part_section` - Prevents duplicates

### Recommended After Load Complete

**Add FULLTEXT index for search:**
```sql
ALTER TABLE cfr_sections 
ADD FULLTEXT INDEX ft_content_subject (content, subject);
```

This enables fast full-text search:
```sql
SELECT * FROM cfr_sections 
WHERE MATCH(content, subject) AGAINST('safety regulations' IN NATURAL LANGUAGE MODE);
```

---

## How to View the Database

### 1. Connect to MySQL
```bash
docker compose exec mysql mysql -uapp -papp cfr_platform
```

### 2. Check tables
```sql
SHOW TABLES;
```

### 3. Count rows
```sql
SELECT 
    'cfr_titles' as table_name, 
    COUNT(*) as rows 
FROM cfr_titles
UNION ALL
SELECT 'cfr_parts', COUNT(*) FROM cfr_parts
UNION ALL
SELECT 'cfr_sections', COUNT(*) FROM cfr_sections;
```

### 4. View sample data
```sql
-- See a title
SELECT * FROM cfr_titles LIMIT 1\G

-- See a part
SELECT * FROM cfr_parts LIMIT 1\G

-- See a section (with content preview)
SELECT 
    id,
    section_number,
    subject,
    LEFT(content, 200) as content_preview
FROM cfr_sections 
LIMIT 5;
```

### 5. Test a join query
```sql
SELECT 
    t.title_number,
    t.name as title_name,
    p.part_number,
    p.name as part_name,
    s.section_number,
    s.subject
FROM cfr_sections s
JOIN cfr_parts p ON s.part_id = p.id
JOIN cfr_titles t ON p.title_id = t.id
LIMIT 10;
```

---

## Schema Files Location

- **TypeScript Schema:** `drizzle/schema.ts` (Drizzle ORM definitions)
- **SQL Migrations:** `drizzle/*.sql` (Generated SQL)
- **Current Schema:** Tables created by Airflow parser on first insert

---

## Notes

1. **Tables are created automatically** by the Airflow parser on first data insert
2. **Foreign keys enforce referential integrity** (CASCADE DELETE)
3. **Unique constraints prevent duplicates** (title+part, part+section)
4. **Indexes speed up queries** but add ~20% storage overhead
5. **cfr_sections is the largest table** - contains all searchable text
6. **User tables are empty** until authentication is implemented
7. **Data persists** in Docker volume `mysql-data` (survives restarts)

---

## Database Access

**From Docker:**
```bash
docker compose exec mysql mysql -uapp -papp cfr_platform
```

**From Host (if port 3306 exposed):**
```bash
mysql -h 127.0.0.1 -P 3306 -uapp -papp cfr_platform
```

**From Application:**
```typescript
DATABASE_URL=mysql://app:app@mysql:3306/cfr_platform
```

---

## Summary

Your database structure:
- ✅ **3 core CFR tables** (titles → parts → sections) with hierarchical relationships
- ✅ **4 platform tables** (users, subscriptions, api_keys, api_usage) for API management
- ✅ **Proper indexes** for fast queries
- ✅ **Foreign keys** for data integrity
- ✅ **Unique constraints** to prevent duplicates
- ✅ **Currently loading:** 296,400 sections (11% complete)
- ✅ **Final size:** ~2.8 million sections, ~17-19 GB with indexes
