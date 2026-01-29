# C4 — CFR Data Platform

Modelo C4 (Context, Container, Component) da arquitetura.

> **Render:** Requer Mermaid com suporte a C4 (ex.: [mermaid.live](https://mermaid.live), VS Code com extensão Mermaid, ou Mermaid 10+). Ver [C4 syntax](https://mermaid.js.org/syntax/c4.html).

---

## Level 1 — System Context

Quem usa o sistema e com quem o sistema se comunica.

```mermaid
C4Context
    title System Context — CFR Data Platform

    Person(user, "Usuário / Desenvolvedor", "Busca CFR, usa API, acessa docs e dashboard")
    Person(admin, "Admin", "Dispara ingest, gerencia API keys e usuários")

    System(cfr_platform, "CFR Data Platform", "Acesso a dados do Code of Federal Regulations via API e busca web")

    System_Ext(xml_source, "Fonte CFR XML", "20GB, 30 anos, 50 títulos (eCFR/GPO)")

    Rel(user, cfr_platform, "Busca, consulta API, lê docs")
    Rel(admin, cfr_platform, "Gerencia ingest e usuários")
    Rel(cfr_platform, xml_source, "Lê XML para ingest (Airflow)")
```

**Resumo:** Usuários e admins usam a CFR Data Platform; a plataforma consome XML externo para ingest.

---

## Level 2 — Container

Principais “containers” (aplicações e armazenamentos).

```mermaid
C4Container
    title Container — CFR Data Platform

    Person(user, "Usuário")
    Person(admin, "Admin")

    Container_Boundary(platform, "CFR Data Platform") {
        Container(web, "Web App", "React, Vite", "Search, Docs, Dashboard, Landing")
        Container(api, "API", "Node, Express, tRPC", "Auth, CFR search/title/part/section, API keys")
        Container(airflow, "Airflow", "Python, Docker", "DAGs: discover XML, parse, load MySQL")
        ContainerDb(mysql, "MySQL", "Relacional", "cfr_titles, cfr_parts, cfr_sections, users, api_keys, api_usage")
        ContainerDb(postgres, "Postgres", "Relacional", "Metadados Airflow")
        ContainerDb(redis, "Redis", "Cache/Fila", "Opcional cache/sessão")
    }

    System_Ext(xml, "CFR XML (20GB)")

    Rel(user, web, "HTTPS")
    Rel(admin, web, "HTTPS")
    Rel(web, api, "tRPC/HTTP")
    Rel(api, mysql, "Leitura/escrita (CFR + auth)")
    Rel(airflow, mysql, "Escrita (cfr_*)")
    Rel(airflow, xml, "Leitura (mount/S3)")
    Rel(airflow, postgres, "Metadados DAGs")
```

**Resumo:**

| Container   | Tecnologia      | Responsabilidade                                      |
|------------|-----------------|--------------------------------------------------------|
| Web App    | React, Vite     | Search, ApiDocs, Dashboard, Landing                   |
| API        | Node, Express, tRPC | Auth, CFR (search, title, part, section), API keys |
| Airflow    | Python, Docker  | Ingest: discover XML → parse → load MySQL             |
| MySQL      | MySQL           | Dados CFR + usuários, api_keys, api_usage             |
| Postgres   | Postgres        | Metadados Airflow (DAGs, runs)                        |
| Redis      | Redis           | Cache/fila (opcional)                                 |

---

## Level 3 — Component (API)

Componentes principais dentro da API (único ponto de acesso a CFR).

```mermaid
C4Component
    title Component — API (Node)

    Container_Boundary(api, "API") {
        Component(trpc, "tRPC Router", "Roteamento de procedimentos")
        Component(auth_router, "auth", "me, logout")
        Component(cfr_router, "cfr", "searchFulltext, getTitle, getPart, getSection, listTitles")
        Component(system_router, "system", "Rotas de sistema")
        Component(cfr_service, "cfr.ts", "searchFulltext, getTitle, getPart, getSectionById, listTitles")
        Component(db_layer, "db.ts", "getDb, upsertUser, getUserByOpenId")
    }

    ContainerDb(mysql, "MySQL")

    Rel(trpc, auth_router, "")
    Rel(trpc, cfr_router, "")
    Rel(trpc, system_router, "")
    Rel(cfr_router, cfr_service, "chama")
    Rel(cfr_service, db_layer, "getDb")
    Rel(db_layer, mysql, "Drizzle")
    Rel(auth_router, db_layer, "getDb")
```

**Resumo:** Todo acesso a CFR passa por `cfr` router → `cfr.ts` → `db` → MySQL.

---

## Level 3 — Component (Airflow)

Componentes do pipeline de ingest.

```mermaid
C4Component
    title Component — Airflow (ingest CFR)

    Container_Boundary(airflow, "Airflow") {
        Component(dag, "cfr_pipeline DAG", "Orquestração")
        Component(discover, "discover_cfr_xml", "Lista XML em /opt/airflow/data")
        Component(parse_load, "parse_and_load", "Um task por arquivo: parse + load")
        Component(summarize, "summarize", "Total títulos/partes/seções")
        Component(parser, "cfr_parser.py", "discover_xml_files, parse_cfr_xml_stream, load_cfr_file_to_mysql")
    }

    ContainerDb(mysql, "MySQL")
    System_Ext(fs, "Arquivos XML (mount)")

    Rel(dag, discover, "task")
    Rel(dag, parse_load, "expand por arquivo")
    Rel(dag, summarize, "task")
    Rel(discover, parser, "discover_xml_files")
    Rel(parse_load, parser, "parse_and_load_one_file")
    Rel(parser, fs, "lxml iterparse")
    Rel(parser, mysql, "PyMySQL upsert")
```

**Resumo:** DAG descobre XML → um task por arquivo (parser em streaming) → upsert MySQL.

---

## Legenda e convenções

- **Context:** sistema vs pessoas e sistemas externos.
- **Container:** aplicações e bancos (Web App, API, Airflow, MySQL, etc.).
- **Component:** módulos dentro da API e do Airflow.
- **Fonte única de dados CFR:** MySQL; preenchido pelo Airflow; acessado somente pela API.

---

## Referência rápida

| Nível   | O quê |
|--------|--------|
| Context | CFR Data Platform, usuários, admin, fonte XML |
| Container | Web App, API, Airflow, MySQL, Postgres, Redis |
| Component (API) | tRPC, auth, cfr, system, cfr.ts, db.ts |
| Component (Airflow) | cfr_pipeline DAG, discover, parse_and_load, summarize, cfr_parser |

Para diagramas C4 editáveis em ferramentas (Structurizr, draw.io), use os nomes e relações acima.

---

# Diagrama elaborado — Como funciona

Visão detalhada dos fluxos de ingest e de acesso.

---

## 1. Visão geral: dois fluxos principais

```mermaid
flowchart LR
    subgraph INGEST["Pipeline de Ingest (Airflow)"]
        A[CFR XML 20GB<br/>30 anos, 50 títulos] --> B[airflow/data/]
        B --> C[cfr_pipeline DAG]
        C --> D[discover_cfr_xml]
        D --> E[parse_and_load<br/>× 1 task por arquivo]
        E --> F[lxml iterparse<br/>streaming]
        F --> G[PyMySQL upsert]
        G --> H[(MySQL<br/>cfr_titles, cfr_parts, cfr_sections)]
    end

    subgraph ACCESS["Acesso (API)"]
        I[Usuário / API key] --> J[Web App ou cURL]
        J --> K[API tRPC]
        K --> L[cfr.searchFulltext<br/>getTitle, getPart, getSection]
        L --> H
        H --> M[Resposta JSON]
        M --> I
    end

    style H fill:#d4edda
    style A fill:#fff3cd
    style I fill:#cce5ff
```

**Resumo:** À esquerda, o XML é descoberto e processado em streaming (um task por arquivo) e gravado no MySQL. À direita, todo acesso (web ou API) passa pela API, que lê o mesmo MySQL.

---

## 2. Fluxo de ingest (detalhado)

Do disco até as tabelas CFR.

```mermaid
flowchart TB
    subgraph FILES["Armazenamento"]
        XML["airflow/data/<br/>2024/title-21.xml<br/>2024/title-19.xml<br/>... (milhares)"]
    end

    subgraph DAG["DAG cfr_pipeline"]
        T0["start"]
        T1["discover_cfr_xml"]
        T2["parse_and_load"]
        T3["summarize"]
        T4["end"]
        T0 --> T1
        T1 --> T2
        T2 --> T3
        T3 --> T4
    end

    subgraph TASKS["parse_and_load (expand)"]
        P1["Task 1: arquivo A"]
        P2["Task 2: arquivo B"]
        P3["Task N: arquivo N"]
    end

    subgraph PARSE["Por arquivo (streaming)"]
        O1["Abre XML"]
        O2["lxml iterparse"]
        O3["Emite title → part → section"]
        O4["Batch INSERT/ON DUPLICATE KEY UPDATE"]
        O1 --> O2 --> O3 --> O4
    end

    subgraph DB["MySQL"]
        TBL1[("cfr_titles")]
        TBL2[("cfr_parts")]
        TBL3[("cfr_sections")]
    end

    XML --> T1
    T1 --> T2
    T2 --> P1 & P2 & P3
    P1 & P2 & P3 --> PARSE
    PARSE --> TBL1 & TBL2 & TBL3
    TBL1 --> TBL2
    TBL2 --> TBL3
```

**Resumo:** O DAG lista todos os XML; para cada arquivo é criado um task que faz parse em streaming (sem carregar 20GB em memória) e faz upsert nas três tabelas. Títulos e partes são resolvidos por ID antes de inserir seções.

---

## 3. Fluxo de acesso (busca fulltext)

Do clique do usuário até o resultado.

```mermaid
sequenceDiagram
    actor U as Usuário
    participant W as Web App (React)
    participant API as API (tRPC)
    participant CFR as cfr.ts
    participant DB as db.ts
    participant MySQL as MySQL

    U->>W: Digita "vessel", filtro Title 19, clica Search
    W->>API: trpc.cfr.searchFulltext.useQuery({ q: "vessel", titleNumber: 19 })
    API->>CFR: searchFulltext("vessel", { titleNumber: 19 })
    CFR->>DB: getDb()
    DB->>MySQL: connection (Drizzle)
    CFR->>MySQL: SELECT ... FROM cfr_sections<br/>JOIN cfr_parts JOIN cfr_titles<br/>WHERE (subject LIKE '%vessel%' OR content LIKE '%vessel%')<br/>AND title_number = 19 LIMIT 50
    MySQL-->>CFR: rows
    CFR-->>API: array de resultados
    API-->>W: JSON
    W-->>U: Lista de seções (title, part, section, subject, content)
```

**Resumo:** A busca é sempre via tRPC; a API chama `cfr.searchFulltext`, que usa Drizzle para consultar as tabelas CFR no MySQL e devolve os resultados para a UI.

---

## 4. Modelo de dados (XML → MySQL)

Como o XML vira linhas nas tabelas.

```mermaid
erDiagram
    cfr_titles ||--o{ cfr_parts : "title_id"
    cfr_parts ||--o{ cfr_sections : "part_id"

    cfr_titles {
        int id PK
        int title_number UK "ex: 19, 21"
        text name "ex: Customs Duties"
        text subject
        int year
        varchar revised_date
    }

    cfr_parts {
        int id PK
        int title_id FK
        int part_number "ex: 4, 7"
        text name
        text subject
        text authority
        text source
    }

    cfr_sections {
        int id PK
        int part_id FK
        varchar section_number "ex: 4.1, 7.1"
        text subject
        text content "texto completo da regra"
    }

    XML_FILE ["XML (por arquivo)"] --> cfr_titles : "parse stream"
    XML_FILE --> cfr_parts : "parse stream"
    XML_FILE --> cfr_sections : "parse stream"
```

**Resumo:** Um XML pode conter um ou mais títulos; cada título tem partes; cada parte tem seções. O parser em streaming emite registros nessa ordem e faz upsert por (title_number), (title_id, part_number), (part_id, section_number).

---

## 5. Sequência completa: primeiro ingest, depois busca

```mermaid
sequenceDiagram
    actor Admin
    participant FS as airflow/data/
    participant UI as Airflow UI
    participant Sched as Airflow Scheduler
    participant Parser as cfr_parser.py
    participant MySQL as MySQL
    actor User
    participant Web as Web App
    participant API as API

    Note over Admin,MySQL: Fase 1 — Ingest
    Admin->>FS: Coloca 20GB XML (por ano/título)
    Admin->>UI: Trigger DAG cfr_pipeline
    UI->>Sched: Dispara DAG
    loop Por cada arquivo XML
        Sched->>Parser: parse_and_load(file)
        Parser->>Parser: iterparse (streaming)
        Parser->>MySQL: INSERT/ON DUPLICATE KEY UPDATE cfr_titles, cfr_parts, cfr_sections
        MySQL-->>Parser: OK
        Parser-->>Sched: { titles, parts, sections }
    end
    Sched->>UI: DAG concluído, summarize

    Note over User,API: Fase 2 — Acesso
    User->>Web: Abre /search, digita "vessel"
    Web->>API: cfr.searchFulltext("vessel")
    API->>MySQL: SELECT ... LIKE '%vessel%'
    MySQL-->>API: linhas
    API-->>Web: JSON
    Web-->>User: Resultados (Title 19, Part 4, § 4.1, ...)
```

**Resumo:** Primeiro o admin coloca o XML e dispara o DAG; o Airflow processa cada arquivo em streaming e preenche o MySQL. Depois, usuários e API keys acessam os mesmos dados somente pela API (web ou HTTP).

---

## 6. Resumo em um único diagrama

```mermaid
flowchart TB
    subgraph EXTERNAL["Externo"]
        XML[("CFR XML<br/>20GB, 30 anos, 50 títulos")]
        HUMAN[("Usuários / API keys")]
    end

    subgraph PLATFORM["CFR Data Platform"]
        subgraph INGEST["Ingest"]
            AF[("Airflow")]
            DISCOVER["discover XML"]
            PARSE["parse (stream)<br/>× N arquivos"]
            AF --> DISCOVER --> PARSE
        end

        subgraph STORAGE["Storage"]
            MySQL[("MySQL")]
        end

        subgraph ACCESS["Acesso"]
            API[("API tRPC")]
            WEB[("Web App")]
            API --> WEB
        end
    end

    XML --> INGEST
    PARSE --> MySQL
    MySQL --> API
    ACCESS --> HUMAN
    HUMAN --> WEB
```

**Resumo:** XML entra no pipeline de ingest (Airflow); o resultado fica no MySQL; todo acesso humano passa pela Web App e pela API, que leem apenas o MySQL.
