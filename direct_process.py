#!/usr/bin/env python3
"""
Direct CFR XML processor - bypasses Airflow for speed.
Run inside docker: docker compose exec airflow-webserver python3 /opt/airflow/dags/direct_process.py
"""

import os
import sys
import time
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, '/opt/airflow/dags')
from cfr_parser import load_cfr_file_to_mysql, CFR_MYSQL_CONN_ID

DATA_DIR = "/opt/airflow/external_data"
STATE_FILE = "/opt/airflow/data/direct_state.json"
MAX_WORKERS = 24  # Higher parallelism; deadlock retries in parser handle contention

def get_all_xml_files():
    """Find all XML files."""
    files = []
    for root, _, filenames in os.walk(DATA_DIR):
        for f in filenames:
            if f.lower().endswith('.xml'):
                files.append(os.path.join(root, f))
    return sorted(files)

def load_state():
    """Load processed files state."""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return set(json.load(f).get('processed', []))
    return set()

def save_state(processed):
    """Save processed files state."""
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump({'processed': list(processed)}, f)

def process_file(filepath):
    """Process a single file."""
    try:
        result = load_cfr_file_to_mysql(filepath, CFR_MYSQL_CONN_ID)
        return filepath, result, None
    except Exception as e:
        return filepath, None, str(e)

def main():
    print("🚀 Direct CFR Processor")
    print("=" * 50)
    
    # Get all files
    all_files = get_all_xml_files()
    print(f"📁 Found {len(all_files)} XML files")
    
    # Load state
    processed = load_state()
    print(f"✅ Already processed: {len(processed)} files")
    
    # Filter unprocessed
    to_process = [f for f in all_files if f not in processed]
    print(f"📋 To process: {len(to_process)} files")
    print()
    
    if not to_process:
        print("🎉 All files already processed!")
        return
    
    # Process files
    total_sections = 0
    total_parts = 0
    errors = 0
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_file, f): f for f in to_process}
        
        for i, future in enumerate(as_completed(futures)):
            filepath, result, error = future.result()
            
            if error:
                errors += 1
                print(f"❌ Error: {os.path.basename(filepath)}: {error[:50]}")
            else:
                processed.add(filepath)
                total_sections += result.get('sections', 0)
                total_parts += result.get('parts', 0)
            
            # Progress update every 25 files (save state less often for speed)
            if (i + 1) % 25 == 0:
                elapsed = time.time() - start_time
                rate = (i + 1) / elapsed
                remaining = len(to_process) - (i + 1)
                eta_mins = remaining / rate / 60 if rate > 0 else 0
                
                print(f"📊 Progress: {i+1}/{len(to_process)} ({(i+1)*100//len(to_process)}%) | "
                      f"+{total_sections} sections | ETA: {eta_mins:.0f}m")
                
                save_state(processed)
    
    # Final save
    save_state(processed)
    
    elapsed = time.time() - start_time
    print()
    print("=" * 50)
    print(f"✅ Completed in {elapsed/60:.1f} minutes")
    print(f"📊 Processed: {len(processed)} files")
    print(f"📄 Sections added: {total_sections}")
    print(f"❌ Errors: {errors}")

if __name__ == "__main__":
    main()
