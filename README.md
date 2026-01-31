# CFR Data Platform

Acesso a dados do Code of Federal Regulations (CFR) via API e busca web. **Tudo roda no Docker.**

---

## Stack (tudo no Docker)

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| **app** | 3000 | Web App + API (Node, Express, tRPC) |
| **mysql** | 3306 | Banco da aplicação (cfr_titles, cfr_parts, cfr_sections, users, api_keys) |
| **redis** | 6379 | Redis |
| **postgres** | (interno) | Metadados do Airflow |
| **airflow-webserver** | 8080 | UI do Airflow (DAGs, trigger) |
| **airflow-scheduler** | — | Scheduler do Airflow |
| **airflow-init** | — | One-off: cria DB e usuário do Airflow |

---

## Como subir (tudo no Docker)

1. **Criar `.env`** (Linux/Mac, para permissões do Airflow):
   ```bash
   echo "AIRFLOW_UID=$(id -u)" >> .env
   ```

2. **Subir todos os serviços:**
   ```bash
   docker compose up -d --build
   ```

3. **Primeira vez: inicializar o Airflow** (cria DB e usuário):
   ```bash
   docker compose run --rm airflow-init
   docker compose up -d
   ```
   Se aparecer "airflow already exist in the db" ou "user already exists", é esperado (DB/usuário já foram criados). Pode ignorar e seguir; o `|| true` evita falha ao re-rodar o init.

4. **Acessar:**
   - **App:** http://localhost:3000  
   - **Airflow:** http://localhost:8080 (login: `airflow` / `airflow`)

Nada precisa rodar fora do Docker: app, API, Airflow, MySQL, Redis e Postgres estão no `docker-compose.yml`.

**Importante:** O app e o Airflow usam o **mesmo MySQL** (`cfr_platform`). Os títulos/partes/seções que o Airflow ingere aparecem no app quando ambos rodam no Docker. Se você rodar o app **fora** do Docker (ex.: `pnpm dev`), configure no `.env` o mesmo banco: `DATABASE_URL=mysql://app:app@127.0.0.1:3306/cfr_platform` (com o MySQL do Docker em pé e a porta 3306 exposta).

**Cache Redis:** O app usa Redis para cachear respostas dos endpoints CFR (reduz carga no MySQL). Se Redis não estiver configurado ou indisponível, o app funciona normalmente sem cache. Configure `REDIS_URL` ou `REDIS_PASSWORD` no `.env` se rodar o app fora do Docker. TTLs: `listYears` (1h), `listTitles` (30m), `getTitle`/`getPart` (15m).

---

## Pipeline CFR (Airflow)

- **XML:** Coloque os XMLs em `airflow/data/` (ex.: por ano/título).
- **Conexão MySQL no Airflow:** Admin → Connections → Add → `cfr_mysql` (Host: `mysql`, Schema: `cfr_platform`, Login: `app`, Password: `app`).
- **DAG:** Na UI do Airflow, dispare o DAG `cfr_pipeline`; ele descobre os XMLs, faz parse em stream e carrega no MySQL.
- Detalhes: [airflow/README.md](airflow/README.md).

---

## Documentação

- [docs/C4_CFR_Data_Platform.md](docs/C4_CFR_Data_Platform.md) — Arquitetura (C4 + diagramas).
- [docs/AIRFLOW_CFR_PROCESSING.md](docs/AIRFLOW_CFR_PROCESSING.md) — Processamento do XML no Airflow (tipos de dado, estratégia).
- [docs/ROADMAP_CFR_AIRFLOW.md](docs/ROADMAP_CFR_AIRFLOW.md) — Roadmap do pipeline.
