"""
CFR Pipeline (Chunked): Process 20GB XML in batches from external folder.
- XMLs stay outside container (mounted read-only at /opt/airflow/external_data)
- Each DAG run processes a chunk (configurable batch size)
- Tracks progress in a state file to resume from where it left off
"""

from datetime import datetime
from pathlib import Path
import json
import logging

from airflow import DAG
from airflow.decorators import task
from airflow.operators.empty import EmptyOperator
from airflow.models.baseoperator import chain
from airflow.models import Variable

from cfr_parser import parse_and_load_one_file, CFR_MYSQL_CONN_ID

# Setup logging
logger = logging.getLogger(__name__)


# Config
EXTERNAL_DATA_DIR = Path("/opt/airflow/external_data")  # Mounted from host
STATE_FILE = Path("/opt/airflow/data/chunk_state.json")  # Track progress
DEFAULT_CHUNK_SIZE = 50  # Files per DAG run


def get_chunk_size() -> int:
    """Get chunk size from Airflow Variable or use default."""
    try:
        return int(Variable.get("cfr_chunk_size", default_var=DEFAULT_CHUNK_SIZE))
    except:
        return DEFAULT_CHUNK_SIZE


def load_state() -> dict:
    """Load processing state (which files already processed)."""
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"processed": [], "last_chunk_index": 0}


def save_state(state: dict):
    """Save processing state."""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))


@task
def discover_next_chunk() -> dict:
    """
    Discover all XMLs in external folder and return the next chunk to process.
    Returns: {
        "files": [list of file dicts for this chunk],
        "chunk_info": {total, processed, remaining, chunk_index}
    }
    """
    # Find all XMLs
    all_files = sorted(EXTERNAL_DATA_DIR.rglob("*.xml"))
    all_file_paths = [str(f) for f in all_files]
    
    # Load state
    state = load_state()
    processed = set(state.get("processed", []))
    
    # Filter unprocessed
    remaining = [f for f in all_file_paths if f not in processed]
    
    # Get chunk
    chunk_size = get_chunk_size()
    chunk = remaining[:chunk_size]
    
    # Prepare file info for tasks
    file_infos = [
        {
            "path": str(f),
            "name": Path(f).name,
            "relative_path": str(Path(f).relative_to(EXTERNAL_DATA_DIR))
        }
        for f in chunk
    ]
    
    chunk_info = {
        "total_files": len(all_file_paths),
        "processed_count": len(processed),
        "remaining_count": len(remaining),
        "chunk_size": len(chunk),
        "chunk_index": state.get("last_chunk_index", 0) + 1,
        "is_complete": len(remaining) == 0
    }
    
    logger.info("=" * 80)
    logger.info(f"📊 PROGRESS: {chunk_info['processed_count']}/{chunk_info['total_files']} files")
    logger.info(f"📦 THIS CHUNK: {chunk_info['chunk_size']} files (chunk #{chunk_info['chunk_index']})")
    logger.info(f"⏳ REMAINING: {chunk_info['remaining_count']} files")
    logger.info("=" * 80)
    
    print(f"📊 Progress: {chunk_info['processed_count']}/{chunk_info['total_files']} files")
    print(f"📦 This chunk: {chunk_info['chunk_size']} files (chunk #{chunk_info['chunk_index']})")
    print(f"⏳ Remaining: {chunk_info['remaining_count']} files")
    
    return {
        "files": file_infos,
        "chunk_info": chunk_info
    }


@task
def parse_and_load(file_info: dict[str, str]) -> dict:
    """Parse one CFR XML file and load into MySQL."""
    logger.info(f"🔄 Processing: {file_info['name']}")
    result = parse_and_load_one_file(file_info, conn_id=CFR_MYSQL_CONN_ID)
    if result.get("error"):
        logger.error(f"❌ Failed: {file_info['name']} - {result.get('error')}")
    else:
        logger.info(f"✅ Completed: {file_info['name']} - {result.get('sections', 0)} sections")
    return result


@task
def update_state(chunk_data: dict, results: list) -> dict:
    """Update state file with processed files from this chunk."""
    chunk_info = chunk_data["chunk_info"]
    files = chunk_data["files"]
    
    # Load current state
    state = load_state()
    processed = set(state.get("processed", []))
    
    # Add successfully processed files
    successful = 0
    for file_info, result in zip(files, results):
        if isinstance(result, dict) and not result.get("error"):
            processed.add(file_info["path"])
            successful += 1
    
    # Save updated state
    state["processed"] = list(processed)
    state["last_chunk_index"] = chunk_info["chunk_index"]
    save_state(state)
    
    summary = {
        "chunk_index": chunk_info["chunk_index"],
        "files_in_chunk": len(files),
        "successful": successful,
        "failed": len(files) - successful,
        "total_processed": len(processed),
        "total_files": chunk_info["total_files"],
        "remaining": chunk_info["total_files"] - len(processed),
        "progress_pct": round(len(processed) / chunk_info["total_files"] * 100, 1) if chunk_info["total_files"] > 0 else 0,
        "is_complete": len(processed) >= chunk_info["total_files"]
    }
    
    logger.info("=" * 80)
    logger.info(f"✅ CHUNK COMPLETE: {successful}/{len(files)} files processed")
    logger.info(f"📈 OVERALL PROGRESS: {summary['progress_pct']}% ({summary['total_processed']}/{summary['total_files']})")
    
    if summary["is_complete"]:
        logger.info("🎉 ALL FILES PROCESSED!")
        print("🎉 All files processed!")
    else:
        logger.info(f"▶️  TRIGGER DAG AGAIN: {summary['remaining']} files remaining")
        print(f"▶️  Trigger DAG again to process next chunk ({summary['remaining']} files remaining)")
    
    logger.info("=" * 80)
    
    print(f"✅ Chunk complete: {successful}/{len(files)} files processed")
    print(f"📈 Overall progress: {summary['progress_pct']}% ({summary['total_processed']}/{summary['total_files']})")
    
    return summary


@task
def extract_files(chunk_data: dict) -> list:
    """Extract just the files list from chunk data for mapping."""
    return chunk_data["files"]


with DAG(
    dag_id="cfr_pipeline_chunked",
    start_date=datetime(2025, 1, 1),
    schedule=None,
    catchup=False,
    max_active_tasks=100,  # Allow 100 parallel file processors
    tags=["cfr", "xml", "chunked", "external"],
    doc_md="""
    ## CFR Pipeline - Chunked Processing
    
    Process large CFR XML dataset in manageable chunks.
    
    **Setup:**
    1. Set `CFR_XML_PATH` env var to your XML folder path (or edit docker-compose.yml)
    2. Optionally set chunk size: `airflow variables set cfr_chunk_size 100`
    3. Trigger this DAG repeatedly until all files are processed
    
    **Features:**
    - XMLs stay outside container (read-only mount)
    - Processes in batches (default 50 files per run)
    - Tracks progress automatically
    - Resume from where it left off
    - Shows progress percentage
    
    **Usage:**
    - Trigger DAG → processes next chunk → repeat until complete
    - Check logs for progress and remaining file count
    - Reset progress: delete `airflow/data/chunk_state.json`
    """
) as dag:
    start = EmptyOperator(task_id="start")
    
    # Discover next chunk to process
    chunk_data = discover_next_chunk()
    
    # Extract files list for mapping
    files_list = extract_files(chunk_data)
    
    # Process each file in the chunk (dynamic task mapping)
    loaded = parse_and_load.expand(file_info=files_list)
    
    # Update state with processed files
    summary = update_state(chunk_data, loaded)
    
    end = EmptyOperator(task_id="end")
    
    chain(start, chunk_data, files_list, loaded, summary, end)
