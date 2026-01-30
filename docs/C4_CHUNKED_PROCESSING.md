# C4 Model: CFR Chunked Data Processing Architecture

## Level 1: System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                     CFR Data Platform System                        │
│                                                                     │
│  ┌──────────────┐         ┌──────────────┐        ┌─────────────┐ │
│  │              │         │              │        │             │ │
│  │  20GB CFR    │────────▶│   Airflow    │───────▶│   MySQL     │ │
│  │  XML Files   │  mount  │  Chunked     │ load   │  Database   │ │
│  │  (30 years)  │  r/o    │  Pipeline    │        │             │ │
│  │              │         │              │        │             │ │
│  └──────────────┘         └──────────────┘        └─────────────┘ │
│       Host                   Container                Container    │
│   /Users/.../CFR/        /opt/airflow/           cfr_platform DB  │
│   cfr_complete           external_data                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ API queries
                                    ▼
                            ┌───────────────┐
                            │               │
                            │  Web App      │
                            │  (tRPC API)   │
                            │               │
                            └───────────────┘
                                  User
```

**Key Actors:**
- **CFR XML Files (External)**: 20GB of regulatory data, 30 years (1996-2021+), ~50 titles per year
- **Airflow Chunked Pipeline**: Orchestrates batch processing (50 files at a time)
- **MySQL Database**: Stores parsed CFR data (titles, parts, sections)
- **Web App**: Provides search/query interface via tRPC API

---

## Level 2: Container Diagram

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          Docker Compose Environment                            │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    Airflow Services (Containers)                        │  │
│  │                                                                         │  │
│  │  ┌──────────────────┐         ┌──────────────────┐                    │  │
│  │  │                  │         │                  │                    │  │
│  │  │  Webserver       │◀───────▶│   Scheduler      │                    │  │
│  │  │  (UI: 8080)      │         │  (Task Runner)   │                    │  │
│  │  │                  │         │                  │                    │  │
│  │  └──────────────────┘         └──────────────────┘                    │  │
│  │           │                             │                              │  │
│  │           │                             │                              │  │
│  │           ▼                             ▼                              │  │
│  │  ┌─────────────────────────────────────────────────┐                  │  │
│  │  │         PostgreSQL (Airflow Metadata)           │                  │  │
│  │  │         - DAG runs, task states, logs           │                  │  │
│  │  └─────────────────────────────────────────────────┘                  │  │
│  │                                                                         │  │
│  │  Volumes:                                                              │  │
│  │  • /opt/airflow/dags        ← ./airflow/dags (DAG code)              │  │
│  │  • /opt/airflow/data        ← ./airflow/data (state file)            │  │
│  │  • /opt/airflow/external_data ← /Users/.../CFR/cfr_complete (r/o)    │  │
│  │                                                                         │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      MySQL Container (3306)                         │  │
│  │                                                                         │  │
│  │  Database: cfr_platform                                                │  │
│  │  Tables:                                                               │  │
│  │    • cfr_titles    (title metadata)                                   │  │
│  │    • cfr_parts     (parts within titles)                              │  │
│  │    • cfr_sections  (sections with full text content)                  │  │
│  │                                                                         │  │
│  │  Volume: mysql-data (persistent storage)                              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      App Container (3000)                           │  │
│  │                                                                         │  │
│  │  • Node.js + Vite                                                      │  │
│  │  • tRPC API server                                                     │  │
│  │  • React frontend                                                      │  │
│  │  • Connects to MySQL for CFR queries                                  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

External (Host Machine):
┌────────────────────────────────┐
│  /Users/lucasbayout/CFR/       │
│  cfr_complete/                 │
│    ├── 1996/ (46 files)        │
│    ├── 1997/ (178 files)       │
│    ├── ...                     │
│    └── 2021/ (227 files)       │
│                                │
│  Total: ~6,000+ XML files      │
└────────────────────────────────┘
```

---

## Level 3: Component Diagram - Chunked Pipeline DAG

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    cfr_pipeline_chunked DAG Flow                             │
│                                                                              │
│  ┌────────────┐                                                             │
│  │   START    │                                                             │
│  └─────┬──────┘                                                             │
│        │                                                                     │
│        ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  Task: discover_next_chunk()                                    │       │
│  │  ─────────────────────────────────────────────────────────────  │       │
│  │  1. Scan /opt/airflow/external_data/**/*.xml (recursive)        │       │
│  │  2. Load state from /opt/airflow/data/chunk_state.json          │       │
│  │  3. Filter: already_processed vs remaining                      │       │
│  │  4. Take next N files (N = chunk_size, default 50)              │       │
│  │  5. Return: {files: [...], chunk_info: {...}}                   │       │
│  │                                                                  │       │
│  │  Output Example:                                                │       │
│  │  {                                                               │       │
│  │    "files": [                                                    │       │
│  │      {"path": ".../1996/CFR-1996-title1.xml", "name": "...", ...},│     │
│  │      ... (50 files)                                              │       │
│  │    ],                                                            │       │
│  │    "chunk_info": {                                               │       │
│  │      "total_files": 6234,                                        │       │
│  │      "processed_count": 0,                                       │       │
│  │      "remaining_count": 6234,                                    │       │
│  │      "chunk_size": 50,                                           │       │
│  │      "chunk_index": 1                                            │       │
│  │    }                                                             │       │
│  │  }                                                               │       │
│  └───────────────────────────┬─────────────────────────────────────┘       │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  Task: extract_files(chunk_data)                                │       │
│  │  ────────────────────────────────────────────────────────────   │       │
│  │  Extract just the files list for dynamic task mapping           │       │
│  │  Return: list of 50 file_info dicts                             │       │
│  └───────────────────────────┬─────────────────────────────────────┘       │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  Task Group: parse_and_load.expand(file_info=files_list)        │       │
│  │  ────────────────────────────────────────────────────────────   │       │
│  │  Dynamic Task Mapping: Creates 50 parallel tasks                │       │
│  │                                                                  │       │
│  │  ┌──────────────────────────────────────────────────────────┐  │       │
│  │  │  parse_and_load[0]  (file 1)                             │  │       │
│  │  │  ─────────────────────────────────────────────────────   │  │       │
│  │  │  1. Open XML file with lxml.etree.iterparse (streaming)  │  │       │
│  │  │  2. Parse: <TITLE>, <PART>, <SECTION> elements           │  │       │
│  │  │  3. Extract: title_num, part_num, section_num, content   │  │       │
│  │  │  4. Connect to MySQL (cfr_mysql connection)              │  │       │
│  │  │  5. UPSERT into cfr_titles, cfr_parts, cfr_sections      │  │       │
│  │  │  6. Return: {titles: X, parts: Y, sections: Z}           │  │       │
│  │  └──────────────────────────────────────────────────────────┘  │       │
│  │  ┌──────────────────────────────────────────────────────────┐  │       │
│  │  │  parse_and_load[1]  (file 2)                             │  │       │
│  │  └──────────────────────────────────────────────────────────┘  │       │
│  │  ┌──────────────────────────────────────────────────────────┐  │       │
│  │  │  parse_and_load[2]  (file 3)                             │  │       │
│  │  └──────────────────────────────────────────────────────────┘  │       │
│  │                          ...                                     │       │
│  │  ┌──────────────────────────────────────────────────────────┐  │       │
│  │  │  parse_and_load[49] (file 50)                            │  │       │
│  │  └──────────────────────────────────────────────────────────┘  │       │
│  │                                                                  │       │
│  │  All tasks run in parallel (LocalExecutor)                      │       │
│  └───────────────────────────┬─────────────────────────────────────┘       │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  Task: update_state(chunk_data, results)                        │       │
│  │  ────────────────────────────────────────────────────────────   │       │
│  │  1. Load current state from chunk_state.json                    │       │
│  │  2. Add successfully processed files to state.processed[]       │       │
│  │  3. Increment state.last_chunk_index                            │       │
│  │  4. Save updated state to chunk_state.json                      │       │
│  │  5. Calculate summary:                                          │       │
│  │     - successful: 50, failed: 0                                 │       │
│  │     - total_processed: 50, remaining: 6184                      │       │
│  │     - progress_pct: 0.8%                                        │       │
│  │  6. Log: "📈 Overall progress: 0.8% (50/6234)"                  │       │
│  │  7. Log: "▶️ Trigger DAG again (6184 files remaining)"          │       │
│  │                                                                  │       │
│  │  Output: {chunk_index: 1, successful: 50, progress_pct: 0.8, ...}│     │
│  └───────────────────────────┬─────────────────────────────────────┘       │
│                              │                                              │
│                              ▼                                              │
│  ┌────────────┐                                                             │
│  │    END     │                                                             │
│  └────────────┘                                                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

State File (chunk_state.json):
┌────────────────────────────────────┐
│ {                                  │
│   "processed": [                   │
│     "/opt/.../1996/CFR-...-1.xml", │
│     "/opt/.../1996/CFR-...-2.xml", │
│     ... (50 paths)                 │
│   ],                               │
│   "last_chunk_index": 1            │
│ }                                  │
└────────────────────────────────────┘

Next DAG Run:
• Reads state.json → sees 50 processed
• Takes next 50 unprocessed files
• Processes them → updates state
• Repeat until all 6,234 files done
```

---

## Level 4: Code Diagram - XML Parsing & Loading

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  parse_and_load_one_file(file_info, conn_id="cfr_mysql")                    │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Input: file_info = {"path": "/opt/.../CFR-2013-title21-vol1.xml", ...}     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Step 1: Open XML with streaming parser                            │    │
│  │  ──────────────────────────────────────────────────────────────    │    │
│  │  import lxml.etree as ET                                           │    │
│  │  context = ET.iterparse(file_path, events=('end',),               │    │
│  │                         tag=['TITLE', 'PART', 'SECTION'])          │    │
│  │                                                                     │    │
│  │  Why streaming? 20GB won't fit in memory; process element-by-elem  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Step 2: Parse elements as they arrive                             │    │
│  │  ──────────────────────────────────────────────────────────────    │    │
│  │  for event, elem in context:                                       │    │
│  │      if elem.tag == 'TITLE':                                       │    │
│  │          title_num = elem.get('N')  # e.g., "21"                   │    │
│  │          title_name = elem.find('HEAD').text                       │    │
│  │          titles.append({                                           │    │
│  │              'title_number': title_num,                            │    │
│  │              'name': title_name,                                   │    │
│  │              'year': extract_year_from_filename(file_path)         │    │
│  │          })                                                         │    │
│  │                                                                     │    │
│  │      elif elem.tag == 'PART':                                      │    │
│  │          part_num = elem.get('N')   # e.g., "1"                    │    │
│  │          part_name = elem.find('HEAD').text                        │    │
│  │          parts.append({                                            │    │
│  │              'title_number': current_title,                        │    │
│  │              'part_number': part_num,                              │    │
│  │              'name': part_name                                     │    │
│  │          })                                                         │    │
│  │                                                                     │    │
│  │      elif elem.tag == 'SECTION':                                   │    │
│  │          section_num = elem.find('SECTNO').text  # "§ 1.1"        │    │
│  │          subject = elem.find('SUBJECT').text                       │    │
│  │          content = ''.join(elem.itertext())  # Full text           │    │
│  │          sections.append({                                         │    │
│  │              'title_number': current_title,                        │    │
│  │              'part_number': current_part,                          │    │
│  │              'section_number': section_num,                        │    │
│  │              'subject': subject,                                   │    │
│  │              'content': content                                    │    │
│  │          })                                                         │    │
│  │                                                                     │    │
│  │      elem.clear()  # Free memory after processing                  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Step 3: Connect to MySQL                                          │    │
│  │  ──────────────────────────────────────────────────────────────    │    │
│  │  from airflow.providers.mysql.hooks.mysql import MySqlHook         │    │
│  │  hook = MySqlHook(mysql_conn_id='cfr_mysql')                       │    │
│  │  conn = hook.get_conn()                                            │    │
│  │  cursor = conn.cursor()                                            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Step 4: UPSERT data (batch inserts)                               │    │
│  │  ──────────────────────────────────────────────────────────────    │    │
│  │  # Insert/update titles                                            │    │
│  │  for title in titles:                                              │    │
│  │      cursor.execute("""                                            │    │
│  │          INSERT INTO cfr_titles                                    │    │
│  │              (title_number, name, year)                            │    │
│  │          VALUES (%s, %s, %s)                                       │    │
│  │          ON DUPLICATE KEY UPDATE                                   │    │
│  │              name = VALUES(name)                                   │    │
│  │      """, (title['title_number'], title['name'], title['year']))   │    │
│  │                                                                     │    │
│  │  # Insert/update parts (batch)                                     │    │
│  │  cursor.executemany("""                                            │    │
│  │      INSERT INTO cfr_parts                                         │    │
│  │          (title_number, part_number, name)                         │    │
│  │      VALUES (%s, %s, %s)                                           │    │
│  │      ON DUPLICATE KEY UPDATE name = VALUES(name)                   │    │
│  │  """, [(p['title_number'], p['part_number'], p['name'])            │    │
│  │         for p in parts])                                           │    │
│  │                                                                     │    │
│  │  # Insert/update sections (batch, largest dataset)                 │    │
│  │  cursor.executemany("""                                            │    │
│  │      INSERT INTO cfr_sections                                      │    │
│  │          (title_number, part_number, section_number,               │    │
│  │           subject, content)                                        │    │
│  │      VALUES (%s, %s, %s, %s, %s)                                   │    │
│  │      ON DUPLICATE KEY UPDATE                                       │    │
│  │          subject = VALUES(subject),                                │    │
│  │          content = VALUES(content)                                 │    │
│  │  """, [(s['title_number'], s['part_number'],                       │    │
│  │         s['section_number'], s['subject'], s['content'])           │    │
│  │         for s in sections])                                        │    │
│  │                                                                     │    │
│  │  conn.commit()                                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Step 5: Return summary                                            │    │
│  │  ──────────────────────────────────────────────────────────────    │    │
│  │  return {                                                          │    │
│  │      "file": file_info['name'],                                    │    │
│  │      "titles": len(titles),      # e.g., 1                         │    │
│  │      "parts": len(parts),        # e.g., 12                        │    │
│  │      "sections": len(sections),  # e.g., 456                       │    │
│  │      "status": "success"                                           │    │
│  │  }                                                                 │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

MySQL Schema:
┌──────────────────────────────────────────────────────────────────────┐
│  cfr_titles                                                          │
│  ─────────────────────────────────────────────────────────────────   │
│  • id (PK, auto_increment)                                           │
│  • title_number (INT, indexed)                                       │
│  • name (VARCHAR)                                                    │
│  • year (INT, indexed)                                               │
│  • UNIQUE KEY (title_number, year)                                   │
├──────────────────────────────────────────────────────────────────────┤
│  cfr_parts                                                           │
│  ─────────────────────────────────────────────────────────────────   │
│  • id (PK)                                                           │
│  • title_number (INT, FK → cfr_titles)                               │
│  • part_number (VARCHAR)                                             │
│  • name (VARCHAR)                                                    │
│  • UNIQUE KEY (title_number, part_number)                            │
├──────────────────────────────────────────────────────────────────────┤
│  cfr_sections                                                        │
│  ─────────────────────────────────────────────────────────────────   │
│  • id (PK)                                                           │
│  • title_number (INT, FK → cfr_parts)                                │
│  • part_number (VARCHAR)                                             │
│  • section_number (VARCHAR)                                          │
│  • subject (TEXT)                                                    │
│  • content (LONGTEXT)  ← Full regulation text                        │
│  • UNIQUE KEY (title_number, part_number, section_number)            │
│  • FULLTEXT INDEX (content, subject)  ← For fast search              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Summary

```
┌──────────────┐
│ Host Machine │  /Users/lucasbayout/CFR/cfr_complete/
│ 20GB XMLs    │    ├── 1996/ (46 XMLs)
│ (30 years)   │    ├── 1997/ (178 XMLs)
└──────┬───────┘    └── ... (6,234 total files)
       │
       │ Docker volume mount (read-only)
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Airflow Container: /opt/airflow/external_data/              │
│                                                              │
│  DAG Run #1 (Chunk 1):                                       │
│  ├─ discover_next_chunk() → finds 6,234 XMLs                │
│  ├─ load state → 0 processed                                │
│  ├─ take 50 files → [file1.xml ... file50.xml]              │
│  ├─ parse_and_load[0..49] → 50 parallel tasks               │
│  │   └─ Each: stream parse → extract data → MySQL upsert    │
│  └─ update_state() → save 50 to processed list              │
│                                                              │
│  Result: 50 files → MySQL (titles/parts/sections)           │
│  Progress: 0.8% (50/6,234)                                   │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ MySQL Container: cfr_platform database                       │
│                                                              │
│  After Chunk 1:                                              │
│  ├─ cfr_titles:   ~50 rows (1 title per file typically)     │
│  ├─ cfr_parts:    ~600 rows (avg 12 parts per title)        │
│  └─ cfr_sections: ~22,800 rows (avg 456 sections per file)  │
│                                                              │
│  After ALL chunks (125 runs × 50 files):                     │
│  ├─ cfr_titles:   ~6,234 rows                                │
│  ├─ cfr_parts:    ~74,808 rows                               │
│  └─ cfr_sections: ~2,842,704 rows (searchable via API)      │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ SQL queries
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ App Container: tRPC API + React Frontend                     │
│                                                              │
│  API Endpoints:                                              │
│  ├─ cfr.searchSections({ query: "safety" })                 │
│  ├─ cfr.getTitle({ titleNumber: 21 })                       │
│  ├─ cfr.getPart({ titleNumber: 21, partNumber: 1 })         │
│  └─ cfr.getSection({ titleNumber: 21, section: "1.1" })     │
│                                                              │
│  Frontend: http://localhost:3000                             │
│  └─ Search UI, browse titles/parts/sections                 │
└──────────────────────────────────────────────────────────────┘
       │
       │ HTTP
       ▼
   ┌────────┐
   │  User  │
   │ Browser│
   └────────┘
```

---

## Processing Timeline

```
Time 0:00  ┌─────────────────────────────────────────────────────────┐
           │ User triggers cfr_pipeline_chunked                      │
           │ Chunk 1: Files 1-50                                     │
           └─────────────────────────────────────────────────────────┘
           ├─ discover_next_chunk (5s)
           ├─ parse_and_load × 50 parallel (2-5 min per file)
           └─ update_state (1s)
           
Time 0:05  ┌─────────────────────────────────────────────────────────┐
           │ Chunk 1 complete: 50/6,234 (0.8%)                      │
           │ Trigger again for next chunk                            │
           └─────────────────────────────────────────────────────────┘
           
Time 0:10  ┌─────────────────────────────────────────────────────────┐
           │ Chunk 2: Files 51-100                                   │
           └─────────────────────────────────────────────────────────┘
           
           ... (repeat 125 times) ...
           
Time 10:25 ┌─────────────────────────────────────────────────────────┐
           │ Chunk 125: Files 6,201-6,234 (last 34 files)           │
           └─────────────────────────────────────────────────────────┘
           
Time 10:30 ┌─────────────────────────────────────────────────────────┐
           │ 🎉 All files processed!                                 │
           │ 6,234/6,234 (100%)                                      │
           │ Ready for API queries                                   │
           └─────────────────────────────────────────────────────────┘

Estimated total time: 10-12 hours (depends on file size, CPU)
- Avg 3 min per file × 6,234 files = ~312 hours sequential
- With 50 parallel: 312 / 50 = ~6.2 hours
- Plus overhead: ~10-12 hours total
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Chunked processing (50 files/run)** | • Prevents memory overflow with 20GB dataset<br>• Allows progress tracking and resume<br>• Can adjust chunk size based on resources |
| **External mount (read-only)** | • XMLs stay on host (no 20GB copy into container)<br>• Read-only prevents accidental modification<br>• Easy to add/remove files |
| **Streaming XML parser (iterparse)** | • Never loads full XML into memory<br>• Processes element-by-element<br>• Can handle multi-GB files |
| **Dynamic task mapping (expand)** | • Creates one Airflow task per file<br>• Parallel execution (LocalExecutor)<br>• Individual task logs for debugging |
| **State file (chunk_state.json)** | • Tracks which files are processed<br>• Enables resume after failure<br>• Shows progress percentage |
| **MySQL UPSERT (ON DUPLICATE KEY)** | • Idempotent: can re-run without duplicates<br>• Updates existing data if re-processed<br>• Safe for incremental loads |
| **Batch inserts (executemany)** | • Much faster than row-by-row inserts<br>• Reduces DB round-trips<br>• Commits once per file |

---

## Monitoring & Operations

**Check progress:**
```bash
# View state file
cat airflow/data/chunk_state.json

# Or check Airflow UI logs
http://localhost:8080/dags/cfr_pipeline_chunked/grid
```

**Adjust chunk size:**
```bash
# Smaller (if memory issues)
docker compose exec airflow-webserver airflow variables set cfr_chunk_size 25

# Larger (if resources available)
docker compose exec airflow-webserver airflow variables set cfr_chunk_size 100
```

**Reset and start over:**
```bash
rm airflow/data/chunk_state.json
# Next trigger starts from file 1
```

**After completion:**
```sql
-- Add fulltext index for fast search
ALTER TABLE cfr_sections ADD FULLTEXT INDEX ft_content (content, subject);

-- Query example
SELECT * FROM cfr_sections 
WHERE MATCH(content, subject) AGAINST('safety regulations' IN NATURAL LANGUAGE MODE)
LIMIT 10;
```
