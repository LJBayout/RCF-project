# CFR pipeline options — what to run for the client

As we ingest the XML we give the client **options**: which pipeline to run and what they get (API, bulk export, fulltext search).

---

## Quick reference

| Pipeline | Purpose | When to run | Client gets |
|----------|---------|-------------|-------------|
| **cfr_pipeline** | Ingest XML → MySQL for API | After placing XML in `airflow/data/` | Relational data in API (search, titles, parts, sections) |
| **cfr_xml_transform** | Same transform (XML → MySQL) | Alternative to `cfr_pipeline`; same result | Same as above |
| **cfr_fulltext_index** | Enable fast fulltext search | After ingest (once or after schema change) | Faster API search on section content/subject |
| **cfr_export_bulk** | Export to JSON (catalog + per-title) | After ingest; on demand or scheduled | Files: `titles_catalog.json`, `title_N.json` for download/integrations |

---

## 1. Ingest: get XML into the API

**Goal:** Raw CFR XML → normalized data in MySQL so the API (and Search UI) can serve titles, parts, sections and search.

### Option A — `cfr_pipeline` (recommended)

- **DAG id:** `cfr_pipeline`
- **Steps:** discover XML → parse each file (stream) → load to MySQL → summarize.
- **Use when:** Full ingest of all XML under `airflow/data/` (e.g. 20GB, 30 years, 50 titles).
- **Client gets:** API immediately usable: `trpc.cfr.listTitles`, `trpc.cfr.searchFulltext`, `trpc.cfr.getTitle`, etc.

### Option B — `cfr_xml_transform`

- **DAG id:** `cfr_xml_transform`
- **Steps:** list XML → transform each file (same stream-parse + MySQL load).
- **Use when:** You want a separate “transform” entry point (e.g. different schedule, or “transform only” in the UI).
- **Client gets:** Same as Option A — MySQL populated, API ready.

**Choose one** for ingest; both write to the same tables. Prefer **cfr_pipeline** for clarity.

---

## 2. After ingest: optional pipelines

### Fulltext search — `cfr_fulltext_index`

- **DAG id:** `cfr_fulltext_index`
- **Steps:** Creates/ensures MySQL FULLTEXT index on `cfr_sections.subject` and `cfr_sections.content`.
- **Use when:** After first ingest or after changing schema; run once or after each ingest.
- **Client gets:** Much faster fulltext search in the API (no heavy `LIKE`).

### Bulk export — `cfr_export_bulk`

- **DAG id:** `cfr_export_bulk`
- **Steps:** Export catalog (`titles_catalog.json`) + one JSON per title (`title_1.json`, …) under `airflow/data/exports/`.
- **Use when:** Client needs files for download, integrations or offline use.
- **Client gets:** Files on disk (or mount); can expose via download API or S3 later.

---

## 3. Suggested order for a new client

1. **Ingest:** Run **cfr_pipeline** (or **cfr_xml_transform**) once XML is in `airflow/data/`.
2. **Search:** Run **cfr_fulltext_index** so API search is fast.
3. **Bulk:** Run **cfr_export_bulk** if the client wants JSON exports.

---

## 4. Summary: “we need more pipelines”

We provide **four** pipeline options:

| Pipeline | Tag in UI | Delivers |
|----------|-----------|----------|
| **cfr_pipeline** | `cfr`, `xml`, `api`, `ingest` | API ingest (XML → MySQL) |
| **cfr_xml_transform** | `cfr`, `xml`, `transform` | Same transform (XML → MySQL) |
| **cfr_fulltext_index** | `cfr`, `api`, `fulltext`, `search` | Fast fulltext search |
| **cfr_export_bulk** | `cfr`, `export`, `bulk`, `client` | JSON catalog + per-title files |

As we ingest the XML, the client can choose: **ingest only** (cfr_pipeline or cfr_xml_transform), **ingest + fulltext** (ingest then cfr_fulltext_index), or **ingest + bulk** (ingest then cfr_export_bulk), or all of the above.
