# CFR Data Platform — Airflow Pipeline Roadmap

Process **20GB CFR XML** (30 years × 50 titles) into the existing MySQL schema using **Apache Airflow** for orchestration.

---

## 1. Scope

| Item | Detail |
|------|--------|
| **Data** | CFR XML (e.g. eCFR / GPO bulk data) |
| **Size** | ~20 GB |
| **Coverage** | 30 years, 50 titles |
| **Target** | Existing tables: `cfr_titles`, `cfr_parts`, `cfr_sections` |
| **Orchestration** | Apache Airflow |

---

## 2. High-Level Flow

```
Raw XML (20GB) → [Airflow] → Chunked parse → Validate → Load MySQL → (optional) Search index
                    │
                    ├── DAG 1: Ingest (copy/list source files)
                    ├── DAG 2: Parse (per-file or per-title, streamed)
                    ├── DAG 3: Load (batch insert into Drizzle/MySQL)
                    └── DAG 4: Notify / reindex (optional)
```

---

## 3. Phases

### Phase 1 — Foundation (Weeks 1–2)

**Goals:** Airflow running, access to XML, one title parsed end-to-end.

- [ ] **1.1** Choose where Airflow runs  
  - **Option A:** Docker Compose (Airflow + worker + MySQL + optional S3/minio for raw XML).  
  - **Option B:** Cloud (MWAA, Cloud Composer, or self-hosted on a VM).
- [ ] **1.2** Define **where the 20GB lives**  
  - e.g. S3, GCS, NFS, or local disk.  
  - Airflow tasks will read from here (streaming preferred).
- [ ] **1.3** Stand up Airflow  
  - Use `apache-airflow` 2.x, Python 3.10+.
  - Configure connection to your **MySQL** (same DB as the app, or dedicated).
- [ ] **1.4** Add a **small sample** (e.g. one year of one title)  
  - Same structure as production XML.  
  - Use it for parser and DAG development.
- [ ] **1.5** Document **exact XML format**  
  - e.g. eCFR XML vs GPO bulk XML: tag names, hierarchy (title → part → section), and how revisions/dates are represented.

**Deliverable:** Airflow UI up, one DAG that lists or copies sample XML; MySQL connection tested.

---

### Phase 2 — Parser & Streaming (Weeks 2–4)

**Goals:** Parse XML in a **streaming/chunked** way so we never load 20GB into memory.

- [ ] **2.1** Pick parsing approach  
  - **Recommended:** `lxml` with `iterparse()` (or `xml.etree.ElementTree` iterparse) to stream events and emit records (title/part/section) as you go.
- [ ] **2.2** Implement a **Python parser** that:
  - Reads from a **file path** or **stream** (e.g. S3 object stream).
  - Emits structured records (e.g. dicts) that map to `cfr_titles`, `cfr_parts`, `cfr_sections` (title number, name, year, part number, section number, subject, content).
  - Handles **revisions / effective dates** per your schema (e.g. `year` on `cfr_titles`, or extra columns if you track multiple editions).
- [ ] **2.3** Add **validation**  
  - Required fields, basic sanity checks, duplicate detection (e.g. same title+part+section+year).
- [ ] **2.4** Output parsed data in **batches**  
  - e.g. write to temporary CSV/Parquet per file or per title, or stream directly to a “staging” table.  
  - Avoid holding millions of rows in memory.

**Deliverable:** CLI or script: “given path to one XML file, stream-parse and write to staging or batch files.” Unit tests on a small fixture.

---

### Phase 3 — Airflow DAGs (Weeks 4–6)

**Goals:** DAGs that orchestrate discovery → parse → load, with idempotency and retries.

- [ ] **3.1** **Ingest DAG**  
  - List/copy raw XML from source (e.g. S3 prefix, directory).  
  - Optionally split by year/title into logical “tasks” (e.g. one task per file or per title).
- [ ] **3.2** **Parse DAG**  
  - For each logical unit (file or title):
    - Run parser in a **Python task** (or `BashOperator` calling your script).
    - Write output to **staging storage**: e.g. CSV/Parquet in object storage or a staging table in MySQL.
  - Use **pooling / parallelism** so you don’t run 100 heavy parses at once (e.g. 2–4 concurrent parse tasks).
- [ ] **3.3** **Load DAG**  
  - Read from staging (files or staging table).  
  - **Upsert** into `cfr_titles`, `cfr_parts`, `cfr_sections` (match on title number, part number, section number, year; then update or insert).  
  - Use batch inserts (e.g. 1k–10k rows per batch) to avoid long transactions and lock contention.
- [ ] **3.4** Idempotency  
  - Re-running a task (or DAG run) should not duplicate data. Use unique constraints (you already have `unique_title_part`, `unique_part_section`) and “insert or update” logic.
- [ ] **3.5** Failure handling  
  - Retry failed parse/load tasks (e.g. 2 retries, exponential backoff).  
  - Consider “dead letter” logging for files that fail repeatedly (path + error written to a table or file).

**Deliverable:** End-to-end run: raw XML (at least one full title or one year) → parsed → loaded into MySQL. No full 20GB in memory.

---

### Phase 4 — Full 20GB Run & Tuning (Weeks 6–8)

**Goals:** Run on full dataset, tune for time and resource usage.

- [ ] **4.1** Run pipeline on **full 20GB** (or a large subset, e.g. 5 years × 50 titles).
- [ ] **4.2** Monitor  
  - Runtime per task, memory of workers, MySQL connections and lock wait.
- [ ] **4.3** Tune  
  - Chunk size (e.g. one file per task vs one title per task).  
  - Batch size for DB inserts.  
  - Airflow parallelism and worker count.  
  - Consider partitioning `cfr_sections` by `title_id` or `year` if the table gets very large.
- [ ] **4.4** Scheduling  
  - Decide how often to refresh (e.g. monthly for new CFR editions).  
  - Add a schedule to the DAG (e.g. `@monthly`) or keep manual trigger.

**Deliverable:** Full (or near-full) load completed; runbook for re-runs and monitoring.

---

### Phase 5 — Platform Integration (Ongoing)

**Goals:** Make the loaded data usable by your existing app and API.

- [ ] **5.1** Expose via existing **tRPC/API**  
  - Search by title, part, section, keyword (already in your todo).  
  - Ensure filters use indexes (`title_number`, `title_id`, `part_id`, etc.).
- [ ] **5.2** Optional: **full-text search**  
  - Add MySQL full-text index on `cfr_sections.content` (and maybe `subject`) if you need keyword search.
- [ ] **5.3** Optional: **reindex step** in Airflow  
  - After load, call an API or run a job that refreshes search indexes or caches.

---

## 4. Suggested Tech Stack

| Layer | Choice | Notes |
|-------|--------|--------|
| **Orchestration** | Apache Airflow 2.x | DAGs, retries, scheduling, UI. |
| **Runtime** | Python 3.10+ | Parser and Airflow tasks. |
| **XML parsing** | `lxml` (iterparse) | Streaming, low memory. |
| **Storage (raw)** | S3 / GCS / NFS | Where 20GB XML lives. |
| **Staging** | CSV/Parquet in object storage, or MySQL staging table | Batched parser output. |
| **App DB** | Existing MySQL + Drizzle | `cfr_titles`, `cfr_parts`, `cfr_sections`. |
| **Airflow executors** | LocalExecutor or CeleryExecutor | Celery if you need multiple workers. |

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| 20GB in memory | Stream-only parsing (iterparse); never load full file into DOM. |
| Long-running tasks | Split by file or title; use Airflow retries and checkpointing if needed. |
| DB lock contention | Batch inserts; avoid huge single transactions; consider loading in off-peak. |
| XML schema changes | Pin parser to a documented schema; add validation step; version raw data. |
| Duplicate data | Use DB unique constraints + upsert logic; idempotent DAG runs. |

---

## 6. Next Steps (Immediate)

1. **Confirm XML source** — Exact URL or path, format (eCFR vs GPO), and one sample file.
2. **Confirm Airflow host** — Local Docker vs cloud; then add `docker-compose.yml` (or equivalent) for Airflow + MySQL.
3. **Implement Phase 1.4–1.5** — Sample dataset + one-page “XML structure” doc.
4. **Implement Phase 2.1–2.2** — Single-file streaming parser and mapping to `cfr_titles` / `cfr_parts` / `cfr_sections`.

After that, Phase 3 DAGs can call the parser and load into your existing schema.
