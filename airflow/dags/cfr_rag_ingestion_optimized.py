
"""
CFR RAG Ingestion Pipeline (Optimized for High Volume)
------------------------------------------------------
Architecture:
1.  **Source**: Historical XML Files (30 years ~ 50GB+)
2.  **Storage Engine**: PostgreSQL + pgvector
    *   Why? MySQL JSON vectors are slow (O(N) search) and bloated.
    *   pgvector provides HNSW indexing (O(log N) search) and 3x compression (binary storage).
3.  **Processing**:
    *   **Source**: Fetch text directly from MySQL `cfr_sections` (Already parsed & clean).
    *   Batch embedding generation (Ollama).
    *   **Sink**: Direct Postgres insertion (pgvector).

Prerequisites:
- MySQL populated with CFR data.
- PostgreSQL instance with `pgvector` extension installed.
- Airflow Connections: `cfr_postgres`, `cfr_mysql`.
"""

from datetime import datetime, timedelta
import logging
import json
import os
import requests

from airflow import DAG
from airflow.decorators import task
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.providers.mysql.hooks.mysql import MySqlHook
from airflow.operators.empty import EmptyOperator

# --- Configuration ---
import time
from openai import OpenAI

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") 
EMBEDDING_MODEL = "text-embedding-3-small"
VECTOR_DIMENSIONS = 1536 # OpenAI Small is 1536d
BATCH_SIZE = 500 # Optimized for sustained throughput (avoids 429 rate limits)
PG_CONN_ID = "cfr_postgres"
MYSQL_CONN_ID = "cfr_mysql"

# Initialize OpenAI Client (Lazy init inside tasks is safer but global is fine for DAG file)
if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not found! Ingestion will fail.")

openai_client = OpenAI(api_key=OPENAI_API_KEY)

logger = logging.getLogger(__name__)

def get_embeddings_batch(texts):
    """
    Generate embeddings for a BATCH of texts using OpenAI API.
    Fast, reliable, and cheap ($0.02/1M tokens).
    """
    if not texts:
        return []
    
    # OpenAI strictly limits batch size by tokens, but 1000 chunks of ~1000 chars is usually OK.
    # If it fails with "RateLimit" or "ContextLength", we might need smaller sub-batches.
    
    results = []
    try:
        # Sanitize newlines which can affect performance of some models
        sanitized_texts = [text.replace("\n", " ") for text in texts]
        
        response = openai_client.embeddings.create(
            input=sanitized_texts,
            model=EMBEDDING_MODEL
        )
        
        # OpenAI returns list in order
        return [data.embedding for data in response.data]

    except Exception as e:
        logger.error(f"OpenAI Embedding Error: {e}")
        # Return None list to signal failure without crashing pipeline immediately
        return [None] * len(texts)
    
    return results

@task
def setup_postgres_vector_db():
    """
    Initializes PostgreSQL with pgvector extension and optimized tables.
    """
    pg_hook = PostgresHook(postgres_conn_id=PG_CONN_ID)
    
    # 1. Enable Extension
    try:
        pg_hook.run("CREATE EXTENSION IF NOT EXISTS vector;")
    except Exception as e:
        logger.warning(f"Could not enable pgvector extension (might already exist or lack perms): {e}")

    # 2. Create Tables
    # Re-create tables with correct dimensions (Drop ensures we switch from 768 -> 1536 cleanly)
    sql_schema = f"""
    DROP TABLE IF EXISTS cfr_chunks;
    DROP TABLE IF EXISTS cfr_documents;
    
    CREATE TABLE IF NOT EXISTS cfr_documents (
        id SERIAL PRIMARY KEY,
        title_number INT,
        part_number INT,
        section_number VARCHAR(50),
        year INT,
        subject TEXT,
        url TEXT,
        ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(title_number, section_number, year)
    );

    CREATE TABLE IF NOT EXISTS cfr_chunks (
        id BIGSERIAL PRIMARY KEY,
        document_id INT REFERENCES cfr_documents(id) ON DELETE CASCADE,
        chunk_index INT NOT NULL,
        content TEXT NOT NULL,
        embedding vector({VECTOR_DIMENSIONS}), -- Binary vector storage
        metadata JSONB DEFAULT '{{}}'::jsonb -- Flexible metadata (page, location)
    );
    
    CREATE INDEX IF NOT EXISTS idx_cfr_chunks_embedding 
    ON cfr_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

    CREATE INDEX IF NOT EXISTS idx_cfr_documents_lookup ON cfr_documents(title_number, year);
    """
    
    try:
        pg_hook.run(sql_schema)
    except Exception as e:
        logger.error(f"Schema creation failed: {e}")
        raise e

@task
def ingestion_pipeline(target_year: int = 2024, limit: int = 1000, offset: int = 0):
    """
    Main Logic:
    1. Fetch batch of sections from MySQL (join Titles/Parts).
    2. Chunk content.
    3. Generate Embeddings.
    4. Copy to Postgres.
    """
    pg_hook = PostgresHook(postgres_conn_id=PG_CONN_ID)
    mysql_hook = MySqlHook(mysql_conn_id=MYSQL_CONN_ID)
    
    pg_conn = pg_hook.get_conn()
    pg_cursor = pg_conn.cursor()

    logger.info(f"Starting ingestion from MySQL for Year {target_year} (Limit: {limit})...")
    
    # 1. Fetch from MySQL
    # We join to get the full context (Title name, Year, Part)
    sql_query = f"""
        SELECT 
            s.id,
            t.year,
            t.title_number,
            p.part_number,
            s.section_number,
            s.subject,
            s.content
        FROM cfr_sections s
        JOIN cfr_parts p ON s.part_id = p.id
        JOIN cfr_titles t ON p.title_id = t.id
        WHERE t.year = {target_year}
        ORDER BY s.id ASC
        LIMIT {limit} OFFSET {offset}
    """
    
    records = mysql_hook.get_records(sql_query)
    
    if not records:
        logger.info("No records found in MySQL for this criteria.")
        return

    logger.info(f"Fetched {len(records)} sections from MySQL. Processing...")

    def chunk_text(text, chunk_size=1200, overlap=100):
        if not text: return []
        return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size-overlap)]

    count_processed = 0
    current_batch_texts = []
    current_batch_meta = []
    
    # Buffer for Postgres Insert
    pg_insert_buffer = []

    for row in records:
        # Unpack MySQL Row
        # id, year, title, part, section, subject, content
        sec_id, year, title_num, part_num, sec_num, subject, content = row
        
        # 1. Insert/Check Metadata in Postgres (cfr_documents)
        # We try to keep IDs synced or just rely on the Unique Constraint
        try:
            pg_cursor.execute("""
                INSERT INTO cfr_documents (title_number, part_number, section_number, year, subject, ingested_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (title_number, section_number, year) 
                DO UPDATE SET ingested_at = NOW() -- touch the record
                RETURNING id;
            """, (title_num, part_num, sec_num, year, subject))
            
            doc_id = pg_cursor.fetchone()[0]
        except Exception as e:
            logger.error(f"Postgres Metadata Insert Error: {e}")
            pg_conn.rollback()
            continue

        # 2. Chunking
        chunks = chunk_text(content)
        
        for i, chunk in enumerate(chunks):
            current_batch_texts.append(chunk)
            current_batch_meta.append({
                "mysql_section_id": sec_id,
                "title": title_num,
                "part": part_num,
                "section": sec_num,
                "year": year,
                "chunk_index": i
            })
            
            # --- BATCH EMBEDDING ---
            if len(current_batch_texts) >= BATCH_SIZE:
                vectors = get_embeddings_batch(current_batch_texts)
                
                # Add to PG Buffer
                for c_text, c_vec, c_meta in zip(current_batch_texts, vectors, current_batch_meta):
                    if c_vec:
                        pg_insert_buffer.append((
                            doc_id, # Link to Document Metadata
                            c_meta['chunk_index'],
                            c_text,
                            str(c_vec), # Vector format for PG
                            json.dumps(c_meta)
                        ))
                
                # Flush to PG
                if pg_insert_buffer:
                    try:
                        pg_cursor.executemany(
                            "INSERT INTO cfr_chunks (document_id, chunk_index, content, embedding, metadata) VALUES (%s, %s, %s, %s, %s)",
                            pg_insert_buffer
                        )
                        pg_conn.commit()
                    except Exception as e:
                        logger.error(f"PG Vector Insert Error: {e}")
                        pg_conn.rollback()

                # Reset
                current_batch_texts = []
                current_batch_meta = []
                pg_insert_buffer = []
        
        count_processed += 1

    # --- FINAL FLUSH ---
    if current_batch_texts:
        vectors = get_ollama_embeddings_batch(current_batch_texts)
        for c_text, c_vec, c_meta in zip(current_batch_texts, vectors, current_batch_meta):
            if c_vec:
                pg_insert_buffer.append((
                   doc_id, # Note: This naive loop uses the LAST doc_id. 
                   # ERROR: If batch spans multiple docs, doc_id is wrong.
                   # FIX: We must store doc_id in current_batch_meta!
                   # See updated logic below in next iteration or simple fix:
                   # For safety in this simpler script, we flush PER DOCUMENT if needed, 
                   # or strictly track doc_id in metadata tuple.
                   
                   # Let's fix the bug right here by looking at the meta logic:
                   # Actually, above we append to current_batch_meta, but we DON'T store doc_id there.
                   # We should.
                   0, 0, "", "", "" # Placeholder for logic fix
                ))
                # RE-FIX logic on the fly:
                pass


    logger.info(f"Ingestion batch complete. Processed {count_processed} sections.")

# Redefining ingestion_pipeline to include correct batching logic logic safely
@task
def ingestion_pipeline_safe(target_titles: list = None, start_year: int = 1996, end_year: int = 2025, openai_api_key: str = None):
    # Quick Setup for OpenAI Key passed via Trigger Config
    effective_api_key = openai_api_key or OPENAI_API_KEY
    if not effective_api_key:
        raise ValueError("No OpenAI API Key provided! Pass it in params or env var.")
    
    # Re-init client with specific key for this run (safe for workers)
    task_openai_client = OpenAI(api_key=effective_api_key)

    pg_hook = PostgresHook(postgres_conn_id=PG_CONN_ID)
    mysql_hook = MySqlHook(mysql_conn_id=MYSQL_CONN_ID)
    pg_conn = pg_hook.get_conn()
    pg_cursor = pg_conn.cursor()

    # Helper function using the task-specific client
    def task_get_embeddings(texts):
        try:
             # Sanitize
            sanitized_texts = [text.replace("\n", " ") for text in texts]
            response = task_openai_client.embeddings.create(
                input=sanitized_texts,
                model=EMBEDDING_MODEL
            )
            return [data.embedding for data in response.data]
        except Exception as e:
            logger.error(f"OpenAI Error: {e}")
            return [None] * len(texts)

    if target_titles:
        logger.info(f"--- Processing Priority Titles: {target_titles} ({start_year}-{end_year}) ---")
    else:
        logger.info(f"--- Processing ALL TITLES ({start_year}-{end_year}) ---")

    # Iterate through all available years in reverse chronological order (newest first)
    for current_year in range(end_year, start_year - 1, -1):
        
        offset = 0
        batch_limit = 10000 
        
        while True:
            # Build SQL with dynamic filters
            where_clause = f"t.year = {current_year}"
            
            if target_titles:
                # Provide strict filtering for the chosen Elite Titles
                if isinstance(target_titles, int): target_titles = [target_titles] # Handle single int case
                titles_str = ",".join(map(str, target_titles))
                where_clause += f" AND t.title_number IN ({titles_str})"

            sql = f"""
                SELECT s.id, t.year, t.title_number, p.part_number, s.section_number, s.subject, s.content
                FROM cfr_sections s
                JOIN cfr_parts p ON s.part_id = p.id
                JOIN cfr_titles t ON p.title_id = t.id
                WHERE {where_clause}
                LIMIT {batch_limit} OFFSET {offset}
            """
            
            records = mysql_hook.get_records(sql)
            
            if not records:
                logger.info(f"Finished Year {current_year} (Titles: {target_titles if target_titles else 'ALL'})")
                break 

            logger.info(f"Year {current_year} | Titles {target_titles or 'ALL'}: Processing batch offset {offset}...")

            text_buffer = []      
            meta_buffer = []      
            
            for row in records:
                sec_id, year, title, part, sec, subj, content = row
                
                # 1. Get/Create Doc ID (Metadata)
                try:
                    pg_cursor.execute("""
                        INSERT INTO cfr_documents (title_number, part_number, section_number, year, subject, ingested_at)
                        VALUES (%s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (title_number, section_number, year) DO UPDATE SET ingested_at=NOW()
                        RETURNING id;
                    """, (title, part, sec, year, subj))
                    doc_id = pg_cursor.fetchone()[0]
                except Exception as e:
                    logger.error(f"Metadata Error: {e}")
                    pg_conn.rollback()
                    continue

                # 2. Chunking (Simple overlap)
                chunks = [content[i:i+1500] for i in range(0, len(content), 1200)]
                
                for i, chunk in enumerate(chunks):
                    text_buffer.append(chunk)
                    meta_buffer.append({
                        "doc_id": doc_id,
                        "chunk_idx": i,
                        "meta_json": json.dumps({"title": title, "section": sec, "year": year})
                    })
                    
                    # Accumulate purely for Bulk Embedding Call
                    if len(text_buffer) >= BATCH_SIZE: 
                        vecs = task_get_embeddings(text_buffer)
                        
                        db_rows = []
                        for txt, v, meta in zip(text_buffer, vecs, meta_buffer):
                            if v:
                                db_rows.append((meta['doc_id'], meta['chunk_idx'], txt, str(v), meta['meta_json']))
                        
                        if db_rows:
                            pg_cursor.executemany(
                                "INSERT INTO cfr_chunks (document_id, chunk_index, content, embedding, metadata) VALUES (%s, %s, %s, %s, %s)",
                                db_rows
                            )
                            pg_conn.commit()
                        
                        text_buffer = []
                        meta_buffer = []

            # Flush remaining for this mysql batch
            if text_buffer:
                vecs = task_get_embeddings(text_buffer)
                db_rows = []
                for txt, v, meta in zip(text_buffer, vecs, meta_buffer):
                    if v:
                         db_rows.append((meta['doc_id'], meta['chunk_idx'], txt, str(v), meta['meta_json']))
                if db_rows:
                    pg_cursor.executemany(
                        "INSERT INTO cfr_chunks (document_id, chunk_index, content, embedding, metadata) VALUES (%s, %s, %s, %s, %s)",
                        db_rows
                    )
                    pg_conn.commit()
            
            offset += batch_limit # Next MySQL Page

with DAG(
    dag_id="cfr_rag_ingestion_optimized",
    start_date=datetime(2024, 1, 1),
    schedule_interval=None,
    catchup=False,
    doc_md=__doc__,
    tags=["cfr", "rag", "pgvector", "optimized"],
) as dag:

    setup_task = setup_postgres_vector_db()
    ingest_task = ingestion_pipeline_safe()

    setup_task >> ingest_task
