# Airflow — CFR Pipeline (20GB, 30 anos, todos os títulos)

Orquestração para processar CFR XML e carregar no MySQL para acesso via API.

## Quick start

1. **UID (Linux/Mac):** `echo "AIRFLOW_UID=$(id -u)" >> .env`

2. **Subir stack e init Airflow:**
   ```bash
   docker compose up -d
   docker compose run --rm airflow-init
   docker compose up -d
   ```

3. **Criar conexão MySQL no Airflow** (obrigatório para o pipeline):
   - UI: http://localhost:8080 → Admin → Connections → Add
   - **Connection Id:** `cfr_mysql`
   - **Connection Type:** MySQL
   - **Host:** `mysql` (nome do serviço no compose)
   - **Schema:** `cfr_platform`
   - **Login:** `app`
   - **Password:** `app`
   - **Port:** 3306

4. **Colocar os XMLs** em `airflow/data/` (ex.: por ano/título):
   ```
   airflow/data/
     2024/
       title-21.xml
       title-19.xml
     ...
   ```

5. **Rodar o DAG:** UI → DAGs → `cfr_pipeline` → Trigger DAG.

## Pipeline options (client)

See **docs/PIPELINE_OPTIONS.md** for which DAG to run and what the client gets (API ingest, fulltext, bulk export).

- **cfr_pipeline** — full ingest (discover → parse_and_load → summarize) → API.
- **cfr_xml_transform** — same transform (list XML → transform each file) → API.
- **cfr_fulltext_index** — after ingest: FULLTEXT index for fast search.
- **cfr_export_bulk** — after ingest: JSON catalog + per-title files.

## O que o pipeline faz

- **DAG:** `cfr_pipeline`
  - **discover_cfr_xml:** lista todos os `.xml` em `airflow/data/` (recursivo).
  - **parse_and_load:** um task por arquivo — parse em streaming (lxml) e upsert em MySQL.
  - **summarize:** total de títulos/partes/seções carregados.

- **Tabelas:** `cfr_titles`, `cfr_parts`, `cfr_sections` (mesmo schema da API).

- **Escala:** 20GB = muitos arquivos; cada arquivo vira um task (não carrega 20GB em memória).

## Ajustar o parser ao seu XML

O parser em `airflow/dags/cfr_parser.py` usa tags genéricas (TITLE, PART, SECTION ou eCFR DIV5/DIV6/DIV8). Se o seu XML for diferente (eCFR, GPO, outro), edite `parse_cfr_xml_stream()` e os nomes de tags/atributos (ex.: `@N`, `@TYPE`, `HEAD`, `SECTNO`, `CONTENT`).

## Layout

- `airflow/dags/cfr_pipeline.py` — DAG principal (discover → expand parse_load → summarize).
- `airflow/dags/cfr_parser.py` — Descoberta de arquivos, parse em streaming, carga MySQL.
- `airflow/data/` — Onde ficam os 20GB de XML (montado no container).
