# CFR Chunked Processing Guide

Process 20GB of CFR XMLs in manageable chunks with files stored **outside** the Airflow container.

## Quick Start

### 1. Set XML folder location

Tell docker-compose where your 20GB XML folder is:

```bash
cd "/Users/lucasbayout/Downloads/cfr_data_platform (1) 2"

# Option A: Set env var (recommended)
echo "CFR_XML_PATH=/path/to/your/cfr_xmls" >> .env

# Option B: Edit docker-compose.yml directly
# Change: ${CFR_XML_PATH:-./cfr_xmls}:/opt/airflow/external_data:ro
```

**Example:**
```bash
echo "CFR_XML_PATH=/Users/lucasbayout/Documents/cfr_20gb" >> .env
```

### 2. Start the stack

```bash
echo "AIRFLOW_UID=$(id -u)" >> .env
docker compose up -d
docker compose run --rm airflow-init
docker compose up -d
```

### 3. Configure MySQL connection

- Go to http://localhost:8080 (airflow / airflow)
- Admin → Connections → Add
- **Connection Id:** `cfr_mysql`
- **Type:** MySQL
- **Host:** `mysql`
- **Schema:** `cfr_platform`
- **Login:** `app`
- **Password:** `app`
- **Port:** 3306

### 4. (Optional) Set chunk size

Default is 50 files per run. To change:

```bash
# Process 100 files per run
docker compose exec airflow-webserver airflow variables set cfr_chunk_size 100

# Or in Airflow UI: Admin → Variables → Add
# Key: cfr_chunk_size, Value: 100
```

### 5. Run the chunked pipeline

- UI → DAGs → `cfr_pipeline_chunked` → Trigger DAG
- Check logs for progress: "📈 Overall progress: X%"
- **Repeat:** Trigger again when done to process next chunk
- Continue until logs show "🎉 All files processed!"

## How It Works

1. **External mount:** Your XMLs stay on your machine at the path you specified. They're mounted read-only into the container at `/opt/airflow/external_data`.

2. **Chunked processing:** Each DAG run processes a batch (default 50 files). The DAG:
   - Discovers all XMLs in external folder
   - Loads state file to see what's already processed
   - Takes next N unprocessed files
   - Parses and loads them to MySQL
   - Updates state file with completed files

3. **Progress tracking:** State is saved in `airflow/data/chunk_state.json`. If a run fails, just trigger again — it resumes from where it left off.

4. **Completion:** When all files are processed, logs show "🎉 All files processed!" and remaining count = 0.

## Commands

### Check progress

```bash
# View state file
cat airflow/data/chunk_state.json

# Or check in logs after triggering DAG
```

### Reset progress (start over)

```bash
rm airflow/data/chunk_state.json
# Next DAG run will start from beginning
```

### Change chunk size mid-processing

```bash
# Smaller chunks (if running out of memory)
docker compose exec airflow-webserver airflow variables set cfr_chunk_size 25

# Larger chunks (if you have resources)
docker compose exec airflow-webserver airflow variables set cfr_chunk_size 200
```

### Process everything at once (not recommended for 20GB)

```bash
docker compose exec airflow-webserver airflow variables set cfr_chunk_size 99999
# Then trigger DAG once
```

## Troubleshooting

### "No files found"

Check the mount:

```bash
docker compose exec airflow-webserver ls -la /opt/airflow/external_data
# Should show your XML files
```

If empty, check `.env` has correct `CFR_XML_PATH` and restart:

```bash
docker compose down
docker compose up -d
```

### "Permission denied" reading XMLs

The mount is read-only (`:ro`). Make sure your host folder is readable:

```bash
chmod -R +r /path/to/your/cfr_xmls
```

### Out of memory

Reduce chunk size:

```bash
docker compose exec airflow-webserver airflow variables set cfr_chunk_size 10
```

### Want to process specific files only

Edit the external folder to contain only the files you want, or modify the `discover_next_chunk` task in `cfr_pipeline_chunked.py` to filter by pattern (e.g., only 2024 files).

## Comparison: Chunked vs Full Pipeline

| Feature | `cfr_pipeline` | `cfr_pipeline_chunked` |
|---------|----------------|------------------------|
| **XML location** | Inside container (`airflow/data/`) | Outside container (your machine) |
| **Processing** | All files in one run | Batches (chunks) |
| **Memory** | High (all files at once) | Lower (chunk at a time) |
| **Resume** | No (start over if fails) | Yes (tracks progress) |
| **Use case** | Small datasets, one-time load | Large datasets (20GB), incremental |

For 20GB with 30 years of data, **use `cfr_pipeline_chunked`**.

## Next Steps

After all files are processed:

1. **Add fulltext index** for fast search:
   ```sql
   ALTER TABLE cfr_sections ADD FULLTEXT INDEX ft_content (content, subject);
   ```

2. **Run derived pipelines** (if needed):
   - `cfr_fulltext_index` — create/update search index
   - `cfr_export_bulk` — generate JSON exports

3. **Query via API:** Your app at http://localhost:3000 can now query the loaded CFR data.
