# Runbook: Close the CFR Data Gap

Use this when the platform is **“missing too much”** — i.e. you want full or better coverage of CFR titles (1–50) and years.

---

## 1. See what’s missing

From the **project root** (with `DATABASE_URL` in `.env`):

```bash
pnpm run check:cfr
# or
npx tsx scripts/check-cfr-all-years.ts
```

The script prints:

- A **table** of counts per year (titles, parts, sections).
- A **MISSING** section: for each year with fewer than 50 titles, which **title numbers (1–50)** are missing.

Use that list to decide which title/year combinations to ingest next.

---

## 2. Add data for missing titles/years

Ingestion is **file-based**: the pipeline processes **CFR XML files** under the Airflow data directory.

### 2.1 Where files go

- **Airflow (Docker):** XMLs are read from the volume mounted at **`/opt/airflow/data`** (see `docker-compose.yml` and `airflow/dags/cfr_parser.py`).
- **Local path:** Often the same directory is bind-mounted from the host (e.g. `./cfr_xmls` or `CFR_XML_PATH`) into that path.

So: put CFR XML files for the **missing title numbers and years** into that data directory (or the host folder that maps to `/opt/airflow/data`).

### 2.2 File naming

The parser infers **title number** and **year** from the path/filename, e.g.:

- `CFR-1996-title42-vol2.xml` → title **42**, year **1996**
- Paths can include subdirs (e.g. `2013/title7-vol4.xml`).

Ensure you have XMLs for the **missing** (title, year) pairs from step 1.

### 2.3 Run the ingestion

- **Airflow:** Trigger the **`cfr_pipeline`** DAG (no parameters: it discovers all XMLs under the data dir and processes each file).
- **Alternative:** If you use a different script (e.g. `direct_process.py` or a shell script), run it so that the same MySQL database is populated from those XMLs.

After the run, **repeat step 1** to confirm new titles/years and that gaps shrank.

---

## 3. (Optional) Schedule the check

To track coverage over time:

- **Cron:** e.g. daily:  
  `0 8 * * * cd /path/to/cfr_data_platform && pnpm run check:cfr >> /var/log/cfr-coverage.log 2>&1`
- **Airflow:** Add a small DAG that runs `scripts/check-cfr-all-years.ts` (or a shell step that runs it) and logs the output.

---

## Quick reference

| Step | Command / action |
|------|-------------------|
| See what’s missing | `pnpm run check:cfr` |
| Add data | Put CFR XMLs for missing (title, year) into the dir mounted at `/opt/airflow/data` |
| Ingest | Trigger **`cfr_pipeline`** DAG (or your equivalent ingestion) |
| Re-check | Run `pnpm run check:cfr` again |

Target: **50 titles per year**; the script reports how many you have and which title numbers are missing per year.
