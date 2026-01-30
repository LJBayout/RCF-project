# 📊 Where to See Your CFR Data

## Current Status

✅ **Parser is working!**
✅ **Data is being saved to MySQL!**
✅ **1,154 sections from 1 file already processed!**

---

## 🗄️ Data Location

All data is stored in **MySQL database** inside Docker:

```
Database: cfr_platform
Host: mysql (inside Docker)
Port: 3306
User: app
Password: app
```

### Tables:
- `cfr_titles` → Title-level data (Title 42, Title 21, etc.)
- `cfr_parts` → Part-level data (Part 400, Part 401, etc.)
- `cfr_sections` → Section-level data (§ 401.101, § 401.102, etc.)

---

## 📁 Source Files Location

Your XML files are mounted at:
- **Host:** `/Users/lucasbayout/CFR/cfr_complete`
- **Container:** `/opt/airflow/external_data`

The pipeline reads from the container path.

---

## 🔍 How to View the Data

### Method 1: Use the Data Viewer Script (EASIEST!)

```bash
cd "/Users/lucasbayout/Downloads/cfr_data_platform (1) 2"

# Show total counts
./view_data.sh counts

# List all titles
./view_data.sh titles

# List parts for a title (e.g., Title 42)
./view_data.sh parts 42

# List sections for a part (e.g., Part 400)
./view_data.sh sections 400

# View full section content
./view_data.sh section "401.101"

# Search for keyword
./view_data.sh search "medicare"

# Show latest sections added
./view_data.sh latest
```

### Method 2: Direct MySQL Queries

```bash
cd "/Users/lucasbayout/Downloads/cfr_data_platform (1) 2"

# Connect to MySQL
docker compose exec mysql mysql -uapp -papp cfr_platform

# Then run SQL queries:
SELECT COUNT(*) FROM cfr_sections;
SELECT * FROM cfr_titles;
SELECT * FROM cfr_parts WHERE title_id = 1;
SELECT * FROM cfr_sections WHERE part_id = 1 LIMIT 10;
```

### Method 3: One-line Queries

```bash
# Count sections
docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "SELECT COUNT(*) FROM cfr_sections;"

# Show latest sections
docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "SELECT * FROM cfr_sections ORDER BY created_at DESC LIMIT 5;"

# Search content
docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "SELECT section_number, subject FROM cfr_sections WHERE content LIKE '%hospital%' LIMIT 10;"
```

---

## 📈 Current Data (As of Test)

From processing **1 file** (CFR-1996-title42-vol2.xml):

| Table | Count | Example |
|-------|-------|---------|
| **Titles** | 1 | Title 42 (Public Health) |
| **Parts** | 18 | Part 400 (Introduction; Definitions) |
| **Sections** | 1,154 | § 401.101 (Purpose and scope) |

### Sample Data:

**Title:**
```
Title 42 - Public Health (1996)
```

**Parts:**
```
Part 400 - INTRODUCTION; DEFINITIONS (32 sections)
Part 401 - GENERAL ADMINISTRATIVE REQUIREMENTS (40 sections)
Part 403 - SPECIAL PROGRAMS AND PROJECTS (239 sections)
Part 406 - HOSPITAL INSURANCE ELIGIBILITY AND ENTITLEMENT (23 sections)
...
```

**Section Example:**
```
§ 401.101 - Purpose and scope

(a) The regulations in this subpart:
(1) Implement section 1106(a) of the Social Security Act...
(2) Relate to the availability to the public...
(3) Supplement the regulations of the Department...
```

---

## 🚀 Watch Data Grow in Real-Time

As the auto-processor runs, watch the database grow:

```bash
# Terminal 1: Watch counts update every 5 seconds
watch -n 5 'docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "SELECT COUNT(*) as sections FROM cfr_sections;"'

# Terminal 2: Monitor pipeline logs
./monitor_pipeline.sh logs

# Terminal 3: Check latest sections being added
watch -n 10 './view_data.sh latest'
```

---

## 📊 Expected Final Data

After processing all **5,911 files**:

| Metric | Estimate |
|--------|----------|
| **Titles** | ~50 unique titles |
| **Parts** | ~106,000 parts |
| **Sections** | ~6.8 million sections |
| **Database Size** | ~15-20 GB |

---

## 🔗 Access via API (Coming Soon)

Once the web app is running, you'll access data via:

```
http://localhost:3000/api/search?q=hospital
http://localhost:3000/api/title/42
http://localhost:3000/api/section/401.101
```

---

## 🛠️ Useful Commands

### Check Processing Progress
```bash
./monitor_pipeline.sh status
```

### Check Database Stats
```bash
./view_data.sh counts
```

### Stop Auto-Processor
```bash
pkill -f auto_process.sh
```

### Restart Auto-Processor
```bash
./auto_process.sh &
```

### Reset Progress (Start Over)
```bash
rm -f airflow/data/chunk_state.json
```

---

## 📝 Summary

✅ **Data is in MySQL** (inside Docker container)
✅ **Use `./view_data.sh`** to browse data easily
✅ **Watch it grow** with `watch` commands
✅ **~6.8 million sections** coming from 5,911 files
✅ **Auto-processor is running** in background

**The data is being saved RIGHT NOW!** 🎉
