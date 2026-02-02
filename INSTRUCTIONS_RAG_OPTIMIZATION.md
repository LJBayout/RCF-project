
# CFR RAG Optimization Plan: "The 30-Year Archive"

## Overview
To ingest and search **30 years of CFR history (~50GB+ of XML)**, using MySQL JSON storage is not viable. It will be slow, expensive on storage, and difficult to scale.

We have moved to a **PostgreSQL + pgvector** architecture.
- **Storage**: Binary Vectors (3x smaller than JSON).
- **Speed**: HNSW Indexing (Logarithmic search speed vs Linear).
- **Capacity**: Handles millions of chunks easily.

## Action Items

### 1. Update `docker-compose.yml`
You must use a PostgreSQL image that has the `pgvector` extension installed. The standard `postgres:13` image does not have it.

**Change your `postgres` service to:**
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg15  # <--- CHANGED FROM postgres:15
    # ... keep your other env vars (POSTGRES_USER, etc) ...
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
```
*Note: If you have existing data in the postgres volume consistent with PG 13, upgrading to PG 16 might require a dump/restore or starting with a fresh volume (`docker volume rm cfr_data_platform_postgres_data`). For a dev environment, starting fresh is easiest.*

### 2. Configure Airflow
1.  Login to Airflow (http://localhost:8080).
2.  Go to **Admin -> Connections**.
3.  Create/Update a connection named `cfr_postgres`:
    *   **Conn Id**: `cfr_postgres`
    *   **Conn Type**: `Postgres`
    *   **Host**: `postgres` (service name in docker-compose)
    *   **Login**: (your postgres user, e.g., `airflow` or `postgres`)
    *   **Password**: (your postgres password, e.g., `airflow`)
    *   **Port**: `5432`

### 3. Run the New DAG
Use the `cfr_rag_ingestion_optimized` DAG.
- It will automatically run `CREATE EXTENSION IF NOT EXISTS vector;` on the first task.
- It creates optimized tables: `cfr_documents` (metadata) and `cfr_chunks` (vectors).
