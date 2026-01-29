# Pipelines CFR — Proposta para opções ao cliente

Conforme o XML é ingerido, estes pipelines entregam **diferentes opções** ao cliente (API, download, catálogo, busca rápida, etc.).

---

## Visão geral

| Pipeline | Objetivo | Opção para o cliente | Trigger |
|----------|----------|----------------------|--------|
| **cfr_pipeline** | Ingest: XML → MySQL (títulos, partes, seções) | Acesso via API (search, title, part, section) | Manual |
| **cfr_fulltext_index** | Criar/atualizar índice FULLTEXT no MySQL | Busca fulltext **rápida** na API | Após ingest ou manual |
| **cfr_export_bulk** | Exportar por título/ano (JSON/CSV) | Download **bulk** (por título, ano ou completo) | Após ingest ou manual |
| **cfr_catalog** | Atualizar catálogo (listas + contagens) | Navegação e **filtros** (o que existe, por título/parte) | Após ingest ou manual |
| **cfr_snapshot_year** | (Opcional) Snapshot “CFR as of year X” | API “**as of date**” para compliance | Manual, quando houver multi-ano |
| **cfr_xml_transform** | Transform genérico (placeholder) | Pode ser removido ou virar outro fluxo | Manual |

---

## Detalhe por pipeline

### 1. cfr_pipeline (já existe)
- **O quê:** Descobre XML → parse em stream → upsert MySQL.
- **Cliente:** API tRPC (searchFulltext, getTitle, getPart, getSection, listTitles).
- **Opção:** “Acesso relacional e busca por texto/título/parte/seção.”

### 2. cfr_fulltext_index (novo)
- **O quê:** Lê MySQL e executa `ALTER TABLE cfr_sections ADD FULLTEXT(content, subject)` (ou equivalente).
- **Cliente:** Mesma API; busca fulltext usa o índice e fica mais rápida.
- **Opção:** “Busca fulltext **otimizada** (sem LIKE pesado).”

### 3. cfr_export_bulk (novo)
- **O quê:** Exporta dados do MySQL para arquivos (ex.: `airflow/data/exports/` ou S3): por título, por ano, ou dump completo (JSON/CSV).
- **Cliente:** Download via link ou endpoint “download bulk”.
- **Opção:** “**Download em lote** (por título, ano ou tudo).”

### 4. cfr_catalog (novo)
- **O quê:** Gera/atualiza tabela ou view de catálogo: lista de títulos com contagem de partes/seções; lista de partes por título; opcionalmente cache em Redis.
- **Cliente:** API “list titles”, “list parts by title”, filtros na UI.
- **Opção:** “**Catálogo** para navegar e filtrar (o que existe, onde).”

### 5. cfr_snapshot_year (opcional)
- **O quê:** Se o ingest tiver múltiplos anos, gera snapshot “CFR as of year X” (tabelas ou views por ano).
- **Cliente:** API com parâmetro “asOf=2020”.
- **Opção:** “**Regulação em uma data** (compliance, histórico).”

### 6. cfr_xml_transform (existente)
- **O quê:** DAG placeholder “cfr transform xml”.
- **Cliente:** Pode ser descontinuado ou reaproveitado (ex.: só validação/estatísticas do XML).
- **Opção:** Manter como “transform genérico” ou remover quando os outros cobrirem.

---

## Ordem sugerida de implementação

1. **cfr_pipeline** — já feito (ingest).
2. **cfr_fulltext_index** — uma task; melhora direta na busca.
3. **cfr_catalog** — views ou tabela + API “list”; melhora navegação.
4. **cfr_export_bulk** — export por título/ano; atende “preciso do dump”.
5. **cfr_snapshot_year** — quando o modelo de dados tiver ano/edição.
6. **cfr_xml_transform** — manter como está ou substituir por um dos acima.

---

## Resumo “opções ao cliente”

| Opção | Pipeline(s) | Como o cliente usa |
|-------|-------------|---------------------|
| API relacional + busca | cfr_pipeline | searchFulltext, getTitle, getPart, getSection |
| Busca fulltext rápida | cfr_fulltext_index | Mesma API, com índice |
| Catálogo / navegação | cfr_catalog | listTitles, listParts, filtros na UI |
| Download bulk | cfr_export_bulk | Link ou endpoint de download (JSON/CSV) |
| “As of date” | cfr_snapshot_year | Parâmetro asOf na API |

Assim, ao ingerir o XML você passa a oferecer ao cliente: **API completa**, **busca rápida**, **catálogo**, **bulk** e (quando fizer sentido) **as of date**.
