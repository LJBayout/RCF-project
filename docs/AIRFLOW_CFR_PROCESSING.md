# Processamento do CFR XML no Airflow — Tipos de dado e estratégia

Objetivo: processar 20GB de XML (30 anos, 50 títulos) no Airflow e **entregar diferentes tipos de dado** para a API e outros consumidores.

---

## 1. Que “tipos de dado” precisamos fornecer?

| Tipo | Descrição | Consumidor | Formato / onde |
|------|------------|------------|----------------|
| **A. Relacional (API)** | Títulos → Partes → Seções, busca por texto, por título/parte/seção | API tRPC, Web Search | MySQL: `cfr_titles`, `cfr_parts`, `cfr_sections` |
| **B. Por edição/ano** | “CFR como estava em 2020” vs “em 2024” (30 anos = 30 edições) | API com filtro “as of date”, compliance, histórico | MySQL com chave `(year, title_number, …)` ou tabelas por ano |
| **C. Fulltext otimizado** | Busca rápida em todo o texto (sem LIKE pesado) | API search, alta carga | MySQL FULLTEXT index ou índice externo (Elasticsearch/OpenSearch) |
| **D. Bulk / export** | Dump por título, por ano, ou completo (JSON/CSV/Parquet) | Download, integrações, analytics | Arquivos em S3/disco ou endpoint de download |
| **E. Metadados / índice** | Lista de títulos, partes, seções (sem conteúdo); “o que existe” | Navegação, filtros, catálogo | Mesmo MySQL (views) ou tabela de índice leve |
| **F. Analytics / agregados** | Contagens, “seções alteradas em X”, estatísticas | Dashboard, relatórios | Tabelas agregadas ou warehouse (opcional) |

Hoje temos só **A** (relacional no MySQL). B a F são evoluções conforme a necessidade.

---

## 2. Estratégia de processamento no Airflow (alto nível)

Fluxo em **estágios** para não carregar 20GB em memória e permitir vários outputs:

```
[XML 20GB] → (1) Discover → (2) Parse por arquivo (stream) → (3) Staging / Normalized → (4) Derived outputs
```

- **Estágio 1 — Discover:** listar todos os XML (por ano/título conforme a organização em disco).
- **Estágio 2 — Parse por arquivo:** um task por arquivo; dentro do task: `lxml` iterparse (streaming), nunca carregar o XML inteiro.
- **Estágio 3 — Staging / Normalized:** gravar o resultado “canônico” (títulos, partes, seções). Pode ser direto no MySQL (como hoje) ou em arquivos intermediários (Parquet/CSV) e depois load.
- **Estágio 4 — Derived outputs:** a partir dos dados normalizados, gerar os outros tipos (B–F): índices por ano, fulltext, bulk export, etc.

Assim o XML é processado **uma vez** (parse + normalizado) e os “diferentes tipos de dado” vêm de **derivações** sobre esse normalizado.

---

## 3. Opções de arquitetura no Airflow

### Opção A — Tudo no mesmo DAG (simples)

Um único DAG, por exemplo `cfr_pipeline`:

1. **discover_cfr_xml** → lista de arquivos.
2. **parse_and_load** (expand por arquivo) → parse em stream + upsert MySQL (tabelas atuais).
3. **summarize** → totais.
4. (Opcional) **build_fulltext_index** → após o load, criar/atualizar índice FULLTEXT no MySQL ou enviar para Elasticsearch.
5. (Opcional) **export_bulk** → tarefa que exporta por título/ano para S3 ou disco.

**Prós:** simples, um lugar para configurar. **Contras:** DAG grande; qualquer “tipo de dado” novo vira mais uma task no fim.

### Opção B — Dois estágios: ingest + derived (recomendado)

**DAG 1 — `cfr_ingest`**  
Só coloca os dados normalizados no MySQL (ou em staging):

- discover → parse_and_load (por arquivo, stream) → summarize.  
- Saída: MySQL com `cfr_titles`, `cfr_parts`, `cfr_sections` (e, se quiser múltiplas edições, com `year` na chave).

**DAG 2 — `cfr_derived`** (roda após o ingest ou em schedule):

- Lê do MySQL (ou de staging) e gera os outros tipos:
  - **fulltext:** criar/atualizar FULLTEXT no MySQL ou sync para Elasticsearch.
  - **bulk_export:** gerar JSON/CSV/Parquet por título ou ano.
  - **catalog:** atualizar tabela/views de metadados (listas de títulos/partes/seções).

**Prós:** ingest pesado separado de derivações; dá para re-rodar só derived sem re-parse do XML. **Contras:** dois DAGs para manter.

### Opção C — Staging em arquivo + load + derived

- **Parse por arquivo** grava em **arquivos intermediários** (ex.: Parquet por arquivo XML ou por título/ano) em disco ou S3.
- **Load** lê esses arquivos e faz INSERT/upsert no MySQL (em batch).
- **Derived** consome o mesmo staging (Parquet) ou o MySQL para gerar fulltext, bulk, catálogo.

**Prós:** reprocessamento sem re-parse; staging serve para analytics. **Contras:** mais infra (disco/S3, formato Parquet).

---

## 4. Qual é a mais performática e simples de aplicar?

**Recomendação: Opção A (um único DAG)** — mais performática e mais simples.

| Critério | Opção A (1 DAG) | Opção B (ingest + derived) | Opção C (staging Parquet) |
|----------|------------------|-----------------------------|----------------------------|
| **Performance** | Parse em stream (igual em todas). Load direto no MySQL, menos I/O. | Igual ao A no ingest; derived é leve. | Mais I/O (escrever Parquet, depois ler e load). |
| **Simplicidade** | Um DAG, poucas tasks, fácil de debugar e operar. | Dois DAGs e dependência entre eles. | Mais peças: staging, formato Parquet, onde guardar (S3/disco). |
| **Manutenção** | Um lugar para configurar e rodar. | Dois DAGs para manter. | Infra de staging + código de leitura/escrita Parquet. |

**Por que A é a melhor agora:**

1. **Performance:** O gargalo é o parse do XML (20GB). Em todas as opções o parse é em **stream** e **um task por arquivo** — então a performance do parse é a mesma. O que muda é o que vem depois: em A você grava direto no MySQL (batch INSERT/upsert). Não há etapa extra de staging (Parquet), então menos I/O e menos passos.
2. **Simplicidade:** Um DAG só: discover → parse_and_load → summarize. Para ganhar busca rápida, basta **uma task no fim** (ex.: criar índice FULLTEXT no MySQL). Sem segundo DAG, sem staging, sem S3/Parquet.
3. **Evolução:** Se mais tarde precisar de bulk export ou “derived” (catálogo, analytics), você adiciona um **segundo DAG** que lê do MySQL (Opção B) — sem reescrever o ingest. A Opção C só vale a pena se houver necessidade clara de data lake ou consumo por ferramentas que preferem Parquet.

**Resumo:** Fique com **um DAG** (discover → parse_and_load → summarize) e acrescente **uma task opcional** no fim para índice FULLTEXT. É o mais performático (menos etapas, load direto) e o mais simples (um DAG, poucas tasks). Opção B quando precisar de outputs derivados (bulk, catálogo); Opção C só se precisar de staging em Parquet para outros consumidores.

---

## 6. Recomendações práticas

- **Curto prazo (agora):**  
  - Manter **um DAG** (`cfr_pipeline`): discover → parse_and_load (stream) → summarize → MySQL.  
  - Isso já entrega o **tipo A** (relacional para a API).  
  - Adicionar **uma task opcional** no fim: `build_mysql_fulltext` (ALTER TABLE para FULLTEXT em `cfr_sections.content`/`subject`) para melhorar busca (**tipo C**).

- **Médio prazo (quando precisar de “por ano” e bulk):**  
  - Introduzir **DAG 2** `cfr_derived` que lê do MySQL e gera **bulk export** (tipo D) e/ou **catálogo** (tipo E).  
  - Se quiser **tipo B** (30 anos como edições): ajustar schema para `(year, title_number)` em títulos e o parser inserir uma linha por (year, title, part, section).

- **Longo prazo (analytics, muitos consumidores):**  
  - Considerar **staging em Parquet** (opção C) e **derived** com índice externo (Elasticsearch) e dumps para data lake.

---

## 7. Resumo: “diferentes tipos de dado” e onde nascem

| Tipo de dado | Onde nasce no pipeline | Onde é consumido |
|--------------|-------------------------|-------------------|
| **A. Relacional (API)** | Parse + load direto no MySQL (DAG ingest) | API tRPC, Web |
| **B. Por edição/ano** | Mesmo parse; schema com `year`; load com (year, title, part, section) | API com filtro “as of” |
| **C. Fulltext** | Task após load (FULLTEXT no MySQL) ou DAG derived (Elasticsearch) | API search |
| **D. Bulk** | DAG derived lê MySQL (ou staging) e gera arquivos | Download, integrações |
| **E. Catálogo** | Views ou tabela derivada no MySQL (DAG derived) | Navegação, filtros |
| **F. Analytics** | Opcional: DAG derived ou outro job sobre staging/MySQL | Dashboard, relatórios |

Assim, o **XML grande é processado uma vez** (parse em stream por arquivo); os **diferentes tipos de dado** vêm de **como** gravamos no MySQL (A, B) e de **tarefas adicionais** no Airflow (C, D, E, F) em cima dos dados já normalizados.

Se você disser quais tipos quer primeiro (só A; A+C; A+B+C; etc.), dá para desenhar o próximo passo concreto no DAG (tasks e ordem).