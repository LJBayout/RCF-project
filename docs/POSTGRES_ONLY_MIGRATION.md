# Migração: tudo em Postgres (remover MySQL)

## Por que hoje existem MySQL e Postgres?

| Banco   | Uso atual |
|---------|-----------|
| **MySQL** | App principal: `users`, `api_keys`, `audit_logs`, **cfr_titles**, **cfr_parts**, **cfr_sections** (incluindo coluna `embedding` em texto). Airflow (parser XML) grava CFR aqui. |
| **Postgres** | (1) **Airflow**: metadados (DAGs, runs). (2) **Vetores**: tabelas `cfr_chunks` e `cfr_documents` com pgvector para busca semântica. |

Ou seja: MySQL = dados relacionais da app + CFR; Postgres = Airflow + store de vetores. O RAG hoje usa **os dois** (MySQL para seções com embedding, Postgres para cfr_chunks).

## Precisamos dos dois?

**Não.** Dá para ficar só com Postgres:

- Um único banco para: app (users, api_keys, etc.), CFR (titles, parts, sections) e vetores (pgvector).
- Stack mais simples: menos serviços, uma conexão, um backup.
- Busca RAG só em Postgres (pgvector nativo, sem merge MySQL + Postgres).

## O que “tudo em Postgres” implica?

1. **Schema Postgres**  
   - Recriar em Postgres: `users`, `api_keys`, `audit_logs`, `cfr_titles`, `cfr_parts`, `cfr_sections`.  
   - Em `cfr_sections` (ou numa tabela de chunks): coluna **vector** (pgvector) em vez de `embedding` (text/JSON).  
   - Opção: manter `cfr_chunks` (pgvector) e preencher a partir de `cfr_sections` no Postgres.

2. **App (Node)**  
   - `server/db.ts`: usar **Postgres** (ex.: `drizzle-orm/pg`, `pg`) em vez de `mysql2`.  
   - `drizzle/schema.ts`: trocar `mysqlTable` por `pgTable` e tipos MySQL por equivalentes Postgres (incluindo tipo vector onde for o caso).  
   - Ajustar sintaxe específica de MySQL (ex.: `onDuplicateKeyUpdate` → `onConflictDoUpdate`).

3. **RAG**  
   - Uma única fonte: Postgres (pgvector).  
   - Remover leitura/escrita de embeddings no MySQL; buscar só em `cfr_chunks` (ou em `cfr_sections` com coluna vector).  
   - Ingestão de embeddings: ler seções do Postgres, gerar vetores, gravar no Postgres (cfr_chunks ou cfr_sections.embedding).

4. **Airflow**  
   - Parser CFR passar a gravar em **Postgres** (conexão `cfr_postgres` ou reutilizar o mesmo Postgres do Airflow) em vez de MySQL.  
   - DAGs e scripts que hoje usam `cfr_mysql` passam a usar Postgres.

5. **Docker e env**  
   - Remover o serviço **mysql** do `docker-compose.yml`.  
   - App: `DATABASE_URL=postgresql://...` (mesmo Postgres ou um DB dedicado para a app).  
   - Opcional: um único Postgres com dois databases (ex.: `airflow` e `cfr_platform`) ou um DB só para tudo.

6. **Admin / UI**  
   - Aba Embeddings e textos: deixar de falar em “MySQL vs Postgres”; uma única fonte “Postgres (vetores)”.

## Ordem sugerida (por fases)

1. **Fase 1 – Schema e DB app em Postgres**  
   - Criar schema Drizzle para Postgres (tabelas app + CFR).  
   - Migrations ou scripts SQL para criar tabelas no Postgres.  
   - Trocar `server/db.ts` para Postgres; ajustar `schema.ts` e queries que usem sintaxe MySQL.

2. **Fase 2 – CFR e vetores só no Postgres**  
   - Garantir que `cfr_titles`, `cfr_parts`, `cfr_sections` existam no Postgres.  
   - Decidir: vetores em `cfr_sections` (coluna vector) ou em `cfr_chunks`.  
   - RAG: usar só Postgres (busca vetorial + ingestão).

3. **Fase 3 – Airflow e docker**  
   - Parser e DAGs gravando CFR no Postgres.  
   - Remover MySQL do docker-compose e da documentação.

4. **Fase 4 – Limpeza**  
   - Remover código morto (MySQL, merge MySQL+Postgres no RAG).  
   - Atualizar docs e runbooks.

---

**Resumo:** Não é obrigatório ter MySQL e Postgres. Preparar “apenas tudo para Postgres” é possível e simplifica a arquitetura; a migração pode ser feita por fases como acima.
