# Arquitetura CFR: Ingest vs Acesso

## Princípio

- **Uma única fonte de verdade:** MySQL (`cfr_titles`, `cfr_parts`, `cfr_sections`).
- **Ingest (20GB XML):** Airflow — batch pesado, um task por arquivo, retries, sem carregar 20GB em memória.
- **Acesso (todos os tipos):** **só pela API** — busca no site, API keys, dashboard. Nada lê o MySQL direto para “dados CFR”; tudo passa pelo tRPC/HTTP.

Assim a API base que você já tem (auth, api_keys, subscriptions, api_usage) continua sendo o único ponto de acesso; o Airflow só **alimenta** as tabelas que a API serve.

## Fluxo

```
[20GB CFR XML] → Airflow (discover → parse → load) → MySQL (cfr_*)
                                                        ↓
[Dashboard / Search / API keys / cURL]  ←──────────  API (tRPC)
```

## O que já existe

- **Schema:** `cfr_titles`, `cfr_parts`, `cfr_sections`, `api_keys`, `api_usage`, `subscriptions`.
- **Frontend:** Search, ApiDocs, Dashboard (hoje com mock).
- **Backend:** tRPC com `system`, `auth`; **não há** rotas CFR ainda.
- **Airflow:** DAG `cfr_pipeline` que preenche as tabelas CFR no MySQL.

## O que falta para fechar

1. **Router CFR na API** — procedimentos tRPC que leem do mesmo MySQL:
   - `cfr.searchFulltext(q, title?, part?)` → busca em `cfr_sections` (e joins).
   - `cfr.getTitle(titleNumber)` → título + partes + contagem de seções.
   - `cfr.getPart(titleNumber, partNumber)` → parte + seções.
   - `cfr.getSection(sectionId)` ou `(partId, sectionNumber)` → uma seção.
2. **Search.tsx** — trocar mock por `trpc.cfr.searchFulltext.useQuery(...)`.
3. **Opcional:** middleware de API key + rate limit nos procedimentos CFR (reutilizar `api_keys` / `api_usage`).
4. **Opcional:** admin pode disparar o DAG via Airflow REST API (trigger a partir da API).

## Resposta à pergunta “é a melhor abordagem?”

Sim. Manter **Airflow só para ingest** e **API como único acesso** é a abordagem que melhor usa o que você já tem:

- A API já é o “produto” (docs, keys, planos); faz sentido que **todo** acesso a CFR passe por ela.
- 20GB/30 anos é batch; Airflow lida bem com isso (tasks por arquivo, retries, agendamento).
- Evita duplicar lógica de parse na API e mantém uma única camada de acesso (auth, rate limit, analytics).
