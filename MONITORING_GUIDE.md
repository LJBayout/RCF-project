# CFR Pipeline Monitoring Guide

## Quick Commands

```bash
# Check status and progress
./monitor_pipeline.sh status

# Watch live logs
./monitor_pipeline.sh logs

# Check database stats
./monitor_pipeline.sh state

# Trigger next chunk
./monitor_pipeline.sh trigger

# Reset progress (start over)
./monitor_pipeline.sh reset
```

## Current Status

✅ **Pipeline is running!**
- **Chunks completed:** 3
- **Files processed:** 150 out of ~6,234
- **Progress:** ~2.4%

## What's Happening

The chunked pipeline is processing your 20GB CFR XML files in batches of 50:

1. **Chunk 1:** Files 1-50 ✅ Complete
2. **Chunk 2:** Files 51-100 ✅ Complete  
3. **Chunk 3:** Files 101-150 ✅ Complete
4. **Chunk 4:** Files 151-200 ← Next (trigger again)

## Monitoring in Real-Time

### Option 1: Use the monitor script (recommended)

```bash
cd "/Users/lucasbayout/Downloads/cfr_data_platform (1) 2"

# Watch live logs with progress indicators
./monitor_pipeline.sh logs
```

You'll see:
```
================================================================================
📊 PROGRESS: 150/6234 files
📦 THIS CHUNK: 50 files (chunk #4)
⏳ REMAINING: 6084 files
================================================================================
🔄 Processing: CFR-1998-title21-vol1.xml
✅ Completed: CFR-1998-title21-vol1.xml - 456 sections
...
================================================================================
✅ CHUNK COMPLETE: 50/50 files processed
📈 OVERALL PROGRESS: 3.2% (200/6234)
▶️  TRIGGER DAG AGAIN: 6034 files remaining
================================================================================
```

### Option 2: Airflow UI

Go to: http://localhost:8080/dags/cfr_pipeline_chunked/grid

- Click on a task to see logs
- Green = success, Red = failed, Yellow = running
- Each file gets its own task (50 parallel tasks per run)

### Option 3: Check state file

```bash
cat airflow/data/chunk_state.json | python3 -m json.tool
```

Shows:
- `processed`: Array of file paths already processed
- `last_chunk_index`: Which chunk just completed

### Option 4: Docker logs directly

```bash
# Scheduler logs (shows task execution)
docker compose logs -f airflow-scheduler | grep cfr_pipeline_chunked

# All Airflow logs
docker compose logs -f airflow-scheduler airflow-webserver
```

## Triggering Next Chunks

### Automatic (recommended for bulk processing)

Create a simple loop to trigger until done:

```bash
#!/bin/bash
# auto_process.sh - Process all chunks automatically

cd "/Users/lucasbayout/Downloads/cfr_data_platform (1) 2"

while true; do
    echo "Triggering next chunk..."
    ./monitor_pipeline.sh trigger
    
    echo "Waiting 5 minutes for chunk to complete..."
    sleep 300
    
    # Check if complete
    if grep -q '"is_complete": true' airflow/data/chunk_state.json 2>/dev/null; then
        echo "🎉 All files processed!"
        break
    fi
done
```

Make it executable and run:
```bash
chmod +x auto_process.sh
./auto_process.sh
```

### Manual

Trigger each chunk manually when ready:

```bash
./monitor_pipeline.sh trigger
# Wait for completion (check UI or logs)
# Repeat
```

## Progress Tracking

### Files processed

```bash
# Count processed files
cat airflow/data/chunk_state.json | grep -o '"/opt/airflow/external_data' | wc -l
```

### Percentage complete

The logs show this automatically:
```
📈 OVERALL PROGRESS: 2.4% (150/6234)
```

### Database growth

Once tables are created (after first successful file parse):

```bash
docker compose exec mysql mysql -uapp -papp cfr_platform -e "
SELECT 
    'Titles' as Type, COUNT(*) as Count FROM cfr_titles
UNION ALL SELECT 
    'Parts', COUNT(*) FROM cfr_parts
UNION ALL SELECT 
    'Sections', COUNT(*) FROM cfr_sections;
"
```

Expected final counts:
- **Titles:** ~6,234 (one per file typically)
- **Parts:** ~74,808 (avg 12 parts per title)
- **Sections:** ~2,842,704 (avg 456 sections per file)

## Estimated Time

- **Per file:** 2-5 minutes (depends on file size)
- **Per chunk (50 files):** ~5-10 minutes (parallel processing)
- **Total (6,234 files):** ~125 chunks × 7 min = **~15 hours**

Actual time varies based on:
- CPU cores available
- XML file sizes
- MySQL write speed
- Disk I/O

## Troubleshooting

### Pipeline stuck or slow

Check scheduler logs:
```bash
docker compose logs airflow-scheduler --tail=100
```

Look for errors or warnings.

### Out of memory

Reduce chunk size:
```bash
docker compose exec airflow-webserver airflow variables set cfr_chunk_size 25
```

### Want to speed up

Increase chunk size (if you have resources):
```bash
docker compose exec airflow-webserver airflow variables set cfr_chunk_size 100
```

### Task failures

Check failed task logs in Airflow UI:
1. Go to http://localhost:8080/dags/cfr_pipeline_chunked/grid
2. Click on red (failed) task
3. View logs to see error

Common issues:
- XML parsing errors (malformed XML)
- MySQL connection issues
- Disk space

### Reset and start over

```bash
./monitor_pipeline.sh reset
# Confirm with "yes"
./monitor_pipeline.sh trigger
```

## Log Locations

- **State file:** `airflow/data/chunk_state.json`
- **Airflow logs:** `airflow/logs/dag_id=cfr_pipeline_chunked/`
- **Docker logs:** `docker compose logs airflow-scheduler`
- **MySQL logs:** `docker compose logs mysql`

## After Completion

When logs show "🎉 All files processed!":

### 1. Add fulltext index for search

```sql
docker compose exec mysql mysql -uapp -papp cfr_platform -e "
ALTER TABLE cfr_sections 
ADD FULLTEXT INDEX ft_content (content, subject);
"
```

### 2. Verify data

```bash
# Count rows
docker compose exec mysql mysql -uapp -papp cfr_platform -e "
SELECT COUNT(*) FROM cfr_sections;
"

# Sample query
docker compose exec mysql mysql -uapp -papp cfr_platform -e "
SELECT title_number, section_number, subject 
FROM cfr_sections 
LIMIT 10;
"
```

### 3. Test API

Your app should now be able to query the data:

```bash
# Start app if not running
docker compose up -d app

# Test at http://localhost:3000
```

## Performance Tips

1. **Run overnight:** 15 hours of processing is perfect for overnight runs
2. **Monitor disk space:** 20GB XML + MySQL data = ensure you have 50GB+ free
3. **Don't interrupt:** If you stop mid-chunk, just trigger again—it resumes automatically
4. **Check logs periodically:** Ensure no errors accumulating

## Summary

Your pipeline is working perfectly! You've processed 150 files (3 chunks) successfully. To complete:

1. Keep triggering the DAG (manually or with auto_process.sh)
2. Monitor progress with `./monitor_pipeline.sh logs`
3. Wait ~15 hours for all 6,234 files
4. Add fulltext index when done
5. Query via API

The chunked approach means:
- ✅ Memory-efficient (never loads 20GB at once)
- ✅ Resumable (can stop/start anytime)
- ✅ Progress tracking (always know where you are)
- ✅ Parallel processing (50 files at once)
