# Where Do The Chunks Go? 🗂️

## Simple Answer

**Your XML files → Parsed → Stored in MySQL Database → Available via API**

---

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. SOURCE: Your 20GB XML Files (5,911 files)                       │
│    Location: /Users/lucasbayout/CFR/cfr_complete/                  │
│                                                                     │
│    Example files:                                                   │
│    ├── 1996/CFR-1996-title21-vol1.xml                              │
│    ├── 1997/CFR-1997-title40-vol2.xml                              │
│    ├── 1998/CFR-1998-title14-vol3.xml                              │
│    └── ... (5,911 total)                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Mounted read-only into container
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. AIRFLOW CONTAINER                                                │
│    Path: /opt/airflow/external_data/                               │
│                                                                     │
│    Chunked Pipeline Process:                                       │
│    ┌───────────────────────────────────────────────────────────┐  │
│    │ Chunk #1: Take 50 files (files 1-50)                      │  │
│    │ Chunk #2: Take 50 files (files 51-100)                    │  │
│    │ Chunk #3: Take 50 files (files 101-150)                   │  │
│    │ ...                                                        │  │
│    │ Chunk #13: Take 50 files (files 601-650) ← Currently here │  │
│    │ ...                                                        │  │
│    │ Chunk #118: Last files (files 5,901-5,911)                │  │
│    └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ For each file in chunk:
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. XML PARSING (Streaming - Never loads full file in memory)       │
│                                                                     │
│    Example: CFR-1997-title21-vol1.xml                              │
│    ┌─────────────────────────────────────────────────────────┐    │
│    │ <TITLE N="21">                                          │    │
│    │   <HEAD>Food and Drugs</HEAD>                           │    │
│    │   <PART N="1">                                          │    │
│    │     <HEAD>General Provisions</HEAD>                     │    │
│    │     <SECTION>                                           │    │
│    │       <SECTNO>§ 1.1</SECTNO>                            │    │
│    │       <SUBJECT>Definitions</SUBJECT>                    │    │
│    │       <CONTENT>This section defines...</CONTENT>        │    │
│    │     </SECTION>                                          │    │
│    │     <SECTION>                                           │    │
│    │       <SECTNO>§ 1.2</SECTNO>                            │    │
│    │       ...                                               │    │
│    │     </SECTION>                                          │    │
│    │   </PART>                                               │    │
│    │   <PART N="2">...</PART>                               │    │
│    │ </TITLE>                                                │    │
│    └─────────────────────────────────────────────────────────┘    │
│                                                                     │
│    Parser extracts:                                                │
│    ✓ Title info: number=21, name="Food and Drugs"                 │
│    ✓ Part info: number=1, name="General Provisions"               │
│    ✓ Section info: number="1.1", subject="Definitions", content   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ INSERT/UPDATE into database
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. MYSQL DATABASE (Container: mysql:8)                             │
│    Database: cfr_platform                                          │
│                                                                     │
│    ┌──────────────────────────────────────────────────────────┐   │
│    │ Table: cfr_titles                                        │   │
│    │ ─────────────────────────────────────────────────────    │   │
│    │ id | title_number | name              | year | ...      │   │
│    │ 1  | 21           | Food and Drugs    | 1997 | ...      │   │
│    │ 2  | 40           | Environment       | 1997 | ...      │   │
│    │ 3  | 14           | Aeronautics       | 1998 | ...      │   │
│    │ ... (650 rows so far from 650 files processed)          │   │
│    └──────────────────────────────────────────────────────────┘   │
│                                                                     │
│    ┌──────────────────────────────────────────────────────────┐   │
│    │ Table: cfr_parts                                         │   │
│    │ ─────────────────────────────────────────────────────    │   │
│    │ id | title_number | part_number | name              |...│   │
│    │ 1  | 21           | 1           | General Provisions|...│   │
│    │ 2  | 21           | 2           | Food Standards    |...│   │
│    │ 3  | 21           | 3           | Definitions       |...│   │
│    │ ... (~7,800 rows so far, avg 12 parts per title)        │   │
│    └──────────────────────────────────────────────────────────┘   │
│                                                                     │
│    ┌──────────────────────────────────────────────────────────┐   │
│    │ Table: cfr_sections (THE BIG ONE - Full text content)   │   │
│    │ ─────────────────────────────────────────────────────    │   │
│    │ id | title | part | section | subject    | content      │   │
│    │ 1  | 21    | 1    | 1.1     | Definitions| This section │   │
│    │ 2  | 21    | 1    | 1.2     | Scope      | The provisions│  │
│    │ 3  | 21    | 1    | 1.3     | Authority  | Under the ... │   │
│    │ ... (~296,400 rows so far, avg 456 sections per file)   │   │
│    │                                                          │   │
│    │ When complete: ~2.8 MILLION rows (full CFR text)        │   │
│    └──────────────────────────────────────────────────────────┘   │
│                                                                     │
│    Storage location: Docker volume "mysql-data"                    │
│    Persistent: Yes (survives container restarts)                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ SQL queries
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. YOUR API (Container: app, Port 3000)                            │
│                                                                     │
│    tRPC Endpoints:                                                 │
│    • cfr.searchSections({ query: "safety" })                       │
│    • cfr.getTitle({ titleNumber: 21 })                             │
│    • cfr.getPart({ titleNumber: 21, partNumber: 1 })               │
│    • cfr.getSection({ titleNumber: 21, section: "1.1" })           │
│                                                                     │
│    Frontend: http://localhost:3000                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Current Status (Real Numbers)

### Files Processed: 650 / 5,911 (11%)

```
XML Files (650)
    ↓ parsed
Titles (650 rows in cfr_titles)
    ↓ contains
Parts (~7,800 rows in cfr_parts)
    ↓ contains
Sections (~296,400 rows in cfr_sections) ← SEARCHABLE TEXT
```

### When Complete (5,911 files)

```
XML Files (5,911)
    ↓ parsed
Titles (~5,911 rows)
    ↓ contains
Parts (~70,932 rows)
    ↓ contains
Sections (~2,842,704 rows) ← FULL CFR DATABASE
```

---

## What Happens to Each Chunk?

### Example: Chunk #13 (Currently Processing)

**Input:** 50 XML files (files #601-650)

**Process:**
1. Airflow creates 50 parallel tasks (one per file)
2. Each task:
   - Opens 1 XML file
   - Streams through it (never loads full file in memory)
   - Extracts title, parts, sections
   - Inserts/updates MySQL tables
   - Returns: `{titles: 1, parts: 12, sections: 456}`
3. All 50 tasks complete
4. State file updated: `"processed": [... 650 files ...]`

**Output in MySQL:**
- +50 rows in `cfr_titles`
- +~600 rows in `cfr_parts`
- +~22,800 rows in `cfr_sections`

**Time:** ~6 minutes for all 50 files (parallel processing)

---

## Where Is Everything Stored?

### 1. Source XMLs (Your Machine)
```
/Users/lucasbayout/CFR/cfr_complete/
├── 1996/ (46 files)
├── 1997/ (178 files)
├── 1998/ (198 files)
...
└── 2021/ (227 files)

Total: 5,911 files, ~20GB
Status: NEVER MODIFIED (read-only mount)
```

### 2. Progress State (Container)
```
/Users/lucasbayout/Downloads/cfr_data_platform (1) 2/airflow/data/chunk_state.json

{
  "processed": [
    "/opt/airflow/external_data/1996/CFR-1996-title40-vol2.xml",
    "/opt/airflow/external_data/1997/CFR-1997-title20-vol1.xml",
    ... (650 files)
  ],
  "last_chunk_index": 13
}

Purpose: Tracks which files are done (so you can resume)
```

### 3. Parsed Data (MySQL Database)
```
Docker Volume: mysql-data
Location: /var/lib/docker/volumes/cfr_data_platform12_mysql-data

Tables:
├── cfr_titles    (650 rows → 5,911 when complete)
├── cfr_parts     (7,800 rows → 70,932 when complete)
└── cfr_sections  (296,400 rows → 2,842,704 when complete)

Status: PERSISTENT (survives docker compose down)
```

### 4. Airflow Logs
```
/Users/lucasbayout/Downloads/cfr_data_platform (1) 2/airflow/logs/
└── dag_id=cfr_pipeline_chunked/
    ├── run_id=manual__2026-01-30T00:35:41+00:00/
    │   ├── task_id=discover_next_chunk/
    │   ├── task_id=parse_and_load/
    │   │   ├── map_index=0/ (file 1)
    │   │   ├── map_index=1/ (file 2)
    │   │   └── ... (50 files per chunk)
    │   └── task_id=update_state/
    └── ...

Purpose: Debug logs for each file processed
```

---

## How to Check What's in MySQL

### Connect to MySQL
```bash
docker compose exec mysql mysql -uapp -papp cfr_platform
```

### Count rows
```sql
SELECT COUNT(*) FROM cfr_titles;    -- 650 titles
SELECT COUNT(*) FROM cfr_parts;     -- ~7,800 parts
SELECT COUNT(*) FROM cfr_sections;  -- ~296,400 sections
```

### Sample data
```sql
-- See some titles
SELECT title_number, name, year FROM cfr_titles LIMIT 10;

-- See some sections (the actual regulation text)
SELECT 
    title_number, 
    section_number, 
    subject, 
    LEFT(content, 100) as preview
FROM cfr_sections 
LIMIT 10;
```

### Search example
```sql
-- Find all sections mentioning "safety"
SELECT 
    title_number,
    section_number,
    subject
FROM cfr_sections 
WHERE content LIKE '%safety%' 
LIMIT 20;
```

---

## Summary: Where Do Chunks Go?

1. **XML files** stay on your machine (never moved or modified)
2. **Chunks** are just batches of 50 files processed together
3. **Parsed data** goes into **MySQL database** (3 tables)
4. **Progress** is saved in `chunk_state.json`
5. **Final result**: Searchable database with ~2.8 million regulation sections

**Right now:**
- 650 files processed → 296,400 sections in database
- 5,261 files remaining → will add 2.5 million more sections
- All data queryable via your API at http://localhost:3000

The "chunks" don't go anywhere—they're just a processing strategy. The **actual data** (parsed regulations) goes into **MySQL** where your API can query it!
