# 🏗️ Arquitetura CFR Data Platform - LIVE

## 📊 Status Atual (30/01/2026)

### Serviços Rodando

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
│  🌐 React App (http://localhost:3000)                   │
│     - Home / Browse / Search / API Docs                 │
│     - Year Filter (1996-2025)                           │
│     - Real-time CFR data browser                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     API LAYER                            │
│  🔌 tRPC Server (Node.js + Express)                     │
│     - /api/cfr.listTitles                              │
│     - /api/cfr.listYears                               │
│     - /api/cfr.searchFulltext                          │
│     - /api/cfr.getTitle                                │
│     - /api/cfr.getPart                                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                         │
│  🗄️  MySQL 8 (localhost:3306)                          │
│     - cfr_titles:    1,390 registros                   │
│     - cfr_parts:     105,032 registros                 │
│     - cfr_sections:  4,757,877 registros               │
│                                                          │
│  📊 phpMyAdmin (http://localhost:8081)                  │
│     - Visual database management                        │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │
┌─────────────────────────────────────────────────────────┐
│                  INGESTION LAYER                         │
│  ⚙️  Apache Airflow (http://localhost:8080)            │
│     - Scheduler: Monitora DAGs                         │
│     - Webserver: UI de gerenciamento                   │
│     - DAGs: cfr_pipeline_chunked                       │
│                                                          │
│  📁 Data Volume                                         │
│     - /cfr_xmls: 5,911 arquivos XML                    │
│     - 20GB de CFR data (1996-2025)                     │
│                                                          │
│  🐍 Python Parser                                       │
│     - XML streaming parser                             │
│     - Batch inserts (300 sections/batch)               │
│     - 24 workers paralelos                             │
│     - Deadlock retry (10x)                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  SUPPORT SERVICES                        │
│  🔴 Redis (localhost:6379)                              │
│     - Caching                                           │
│     - Session storage                                   │
│                                                          │
│  🐘 PostgreSQL (internal)                               │
│     - Airflow metadata                                 │
└─────────────────────────────────────────────────────────┘
```

## 📈 Dados por Ano

| Ano  | Títulos | Partes | Seções    |
|------|---------|--------|-----------|
| 1996 | 10      | ~400   | ~40K      |
| 2000 | 47      | ~3.5K  | ~180K     |
| 2010 | 49      | ~3.8K  | ~190K     |
| 2020 | 49      | ~4.0K  | ~195K     |
| 2024 | 48      | ~4.1K  | ~200K     |
| 2025 | 34      | ~2.9K  | ~150K     |

**Total:** 30 anos de dados (1996-2025)

## 🎯 Exemplo: Title 19 (Customs Duties)

```
Year    Parts   Sections
1997    16      1,354
2000    12      1,384
2005    13      1,500
2010    14      1,625
2015    14      1,710
2020    15      1,821
2024    15      1,856
```

**Crescimento:** 37% de 1997 a 2024

## 🔥 Top 5 Títulos Mais Regulados (2024)

1. **Title 7** - Agriculture: **15,994 seções**
2. **Title 48** - Federal Acquisition: **9,199 seções**
3. **Title 49** - Transportation: **7,929 seções**
4. **Title 46** - Shipping: **7,919 seções**
5. **Title 21** - Food and Drugs: **7,882 seções**

## 🌐 URLs Ativas

- **App Principal:** http://localhost:3000
  - Home: `/`
  - Browse CFR: `/browse`
  - Search: `/search`
  - API Docs: `/api-docs`

- **Airflow UI:** http://localhost:8080
  - User: `admin`
  - Pass: `admin`

- **phpMyAdmin:** http://localhost:8081
  - User: `app`
  - Pass: `app`
  - Database: `cfr_platform`

## 💾 Storage

- **XML Files:** 20GB (external volume)
- **MySQL Database:** ~8GB (estimado)
- **Airflow Logs:** ~1GB
- **Total:** ~29GB

## ⚡ Performance

- **API Response:** < 100ms (cached)
- **Search Query:** < 500ms (full-text)
- **Browse Year:** < 200ms
- **Database Queries:** Indexed (title_number, year)

## 🔒 Security Notes

⚠️ **Desenvolvimento local apenas**
- Sem autenticação no app
- Senhas padrão (admin/admin)
- Portas expostas localmente

**Para produção:**
- Adicionar OAuth/JWT
- Firewall + Rate limiting
- SSL/TLS
- Secrets management
- Backup automático

## 🚀 Próximos Passos

1. **LLM Training**
   - Export Title 19 (1996-2025)
   - Fine-tune GPT-4/Claude
   - Build "Customs Intelligence" API

2. **Monetização**
   - Auth + Subscriptions
   - API rate limits
   - PDF exports
   - Email alerts

3. **Scale**
   - Deploy to AWS/GCP
   - CDN para assets
   - Read replicas MySQL
   - Elasticsearch para search

---

**Data atualizada:** 30/01/2026 08:55 UTC
**Status:** ✅ All systems operational
**Dataset:** 4.76M seções | 30 anos | 5,894 arquivos
