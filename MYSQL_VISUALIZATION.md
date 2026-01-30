# 📊 MySQL Visualization Options

## 🚀 Quick Options (No Breaking CFR Growth)

### Option 1: Use Built-in Scripts (FASTEST - Already Working!)

```bash
cd "/Users/lucasbayout/Downloads/cfr_data_platform (1) 2"

# Watch live growth
./watch_growth.sh

# Browse data
./view_data.sh counts
./view_data.sh titles
./view_data.sh parts 42
./view_data.sh sections 400
```

---

### Option 2: phpMyAdmin Web Interface (Starting Now)

**URL:** http://localhost:8081

**Login:**
- Server: `mysql`
- Username: `app`
- Password: `app`
- Database: `cfr_platform`

**Status:** Currently downloading Docker image (will be ready in ~2 minutes)

**Check if ready:**
```bash
docker compose ps phpmyadmin
```

Once running, open http://localhost:8081 in your browser!

---

### Option 3: MySQL Workbench (Desktop App)

**Download:** https://dev.mysql.com/downloads/workbench/

**Connection Settings:**
- Hostname: `localhost`
- Port: `3306`
- Username: `app`
- Password: `app`
- Default Schema: `cfr_platform`

**Advantages:**
- Professional GUI
- Query builder
- ER diagrams
- Export tools
- No Docker needed

---

### Option 4: TablePlus (Mac App - Recommended!)

**Download:** https://tableplus.com/

**Connection:**
- Type: MySQL
- Host: `localhost`
- Port: `3306`
- User: `app`
- Password: `app`
- Database: `cfr_platform`

**Advantages:**
- Beautiful modern UI
- Fast and lightweight
- Multi-tab support
- Real-time updates
- Free version available

---

### Option 5: DBeaver (Free & Open Source)

**Download:** https://dbeaver.io/download/

**Connection:**
- Database: MySQL
- Server: `localhost`
- Port: `3306`
- Database: `cfr_platform`
- Username: `app`
- Password: `app`

**Advantages:**
- Completely free
- Cross-platform
- ER diagrams
- Data export
- SQL editor

---

### Option 6: VS Code Extension

**Install:** MySQL extension by Jun Han

**Connection:**
```json
{
  "host": "localhost",
  "port": 3306,
  "user": "app",
  "password": "app",
  "database": "cfr_platform"
}
```

**Advantages:**
- No leaving VS Code
- Integrated with your workflow
- Query results inline

---

### Option 7: Command Line (Always Available)

```bash
# Connect to MySQL
docker compose exec mysql mysql -uapp -papp cfr_platform

# Then run queries:
SHOW TABLES;
SELECT COUNT(*) FROM cfr_sections;
SELECT * FROM cfr_titles ORDER BY title_number;
SELECT * FROM cfr_parts WHERE title_id = 1 LIMIT 10;
SELECT * FROM cfr_sections WHERE part_id = 1 LIMIT 10;
```

---

## 🎯 Recommended Setup

### For Quick Checks:
Use `./watch_growth.sh` and `./view_data.sh` scripts

### For Visual Exploration:
1. **Wait for phpMyAdmin** (http://localhost:8081) - Web-based, no install
2. **Or install TablePlus** - Best Mac experience
3. **Or use MySQL Workbench** - Industry standard

### For Development:
Use VS Code MySQL extension for integrated workflow

---

## 📊 What You Can Visualize

### Tables:
- `cfr_titles` - All CFR titles (1-50)
- `cfr_parts` - Parts within each title
- `cfr_sections` - Full section content

### Relationships:
```
cfr_titles (id)
    ↓
cfr_parts (title_id, id)
    ↓
cfr_sections (part_id)
```

### Sample Queries:

**Get title with all parts:**
```sql
SELECT 
    t.title_number,
    t.name as title_name,
    p.part_number,
    p.name as part_name,
    COUNT(s.id) as section_count
FROM cfr_titles t
JOIN cfr_parts p ON p.title_id = t.id
LEFT JOIN cfr_sections s ON s.part_id = p.id
WHERE t.title_number = 42
GROUP BY t.id, p.id
ORDER BY p.part_number;
```

**Search across all sections:**
```sql
SELECT 
    t.title_number,
    p.part_number,
    s.section_number,
    s.subject,
    LEFT(s.content, 200) as preview
FROM cfr_sections s
JOIN cfr_parts p ON s.part_id = p.id
JOIN cfr_titles t ON p.title_id = t.id
WHERE s.content LIKE '%hospital%'
LIMIT 20;
```

**Growth statistics:**
```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as sections_added
FROM cfr_sections
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## ⚠️ Important Notes

### Won't Break CFR Growth:
- All visualization tools are **read-only** by default
- They connect to MySQL on port 3306
- Airflow continues processing independently
- No impact on data ingestion performance

### Connection is Safe:
- MySQL handles multiple connections
- Read operations don't lock tables
- Airflow uses separate connection pool
- No conflicts with ongoing processing

---

## 🔍 Current Status Check

```bash
# Check phpMyAdmin status
docker compose ps phpmyadmin

# If it says "running", go to: http://localhost:8081
# If it's still starting, wait 1-2 minutes

# Meanwhile, use the scripts:
./watch_growth.sh
```

---

## 📱 Quick Access URLs

- **phpMyAdmin:** http://localhost:8081 (when ready)
- **Airflow:** http://localhost:8080 (airflow / airflow)
- **App:** http://localhost:3000 (when frontend is built)

---

## 💡 Pro Tip

For the best real-time monitoring experience:

**Terminal 1:** Run `./watch_growth.sh`  
**Terminal 2:** Keep auto-processor running  
**Browser:** Open phpMyAdmin at http://localhost:8081  

This gives you:
- Live terminal stats
- Visual table browser
- No interruption to data ingestion!
