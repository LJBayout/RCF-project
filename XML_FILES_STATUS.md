# ⚠️ XML FILES STATUS - NEED RECOVERY

**Date:** January 30, 2026  
**Problem:** cfr_xmls folder missing  
**Impact:** Cannot re-ingest data  
**Status:** 🔴 NEEDS ATTENTION

---

## 🚨 Current Situation

### What Happened
- Docker cleanup removed volumes
- MySQL data lost (expected, can recreate)
- **cfr_xmls folder also missing** (unexpected!)

### What We Found

**Missing:**
```bash
/Users/lucasbayout/Downloads/cfr_data_platform (1) 2/cfr_xmls/
# ❌ Does not exist!
```

**Found in Downloads:**
```
CFR XML Repository (empty folders 1-8)
CFR-2025-title-5/ (has 3 XMLs)
CFR-2025-title-7/ (has XMLs)
cfr_complete.zip (may have all XMLs!)
```

---

## 💡 Recovery Options

### Option 1: Extract from cfr_complete.zip ⭐ RECOMMENDED
```bash
# Check what's in the zip
unzip -l /Users/lucasbayout/Downloads/cfr_complete.zip | head -20

# If it has all XMLs, extract to project
cd "/Users/lucasbayout/Downloads/cfr_data_platform (1) 2"
unzip /Users/lucasbayout/Downloads/cfr_complete.zip -d ./
mv CFR-*/*.xml ./cfr_xmls/ 2>/dev/null || true
```

### Option 2: Re-download from GPO
```bash
# Download all CFR years (1996-2025)
# This will take several hours and ~20GB
python download_cfr_bulk.py
```

### Option 3: Use What We Have
```bash
# Use the few XMLs in Downloads
mkdir -p cfr_xmls
cp "/Users/lucasbayout/Downloads/CFR-2025-title-5/"*.xml ./cfr_xmls/
cp "/Users/lucasbayout/Downloads/CFR-2025-title-7/"*.xml ./cfr_xmls/
# Only ~6 files, but can test the system
```

---

## 🔍 Investigation Needed

### Check cfr_complete.zip
```bash
# See what's inside
unzip -l /Users/lucasbayout/Downloads/cfr_complete.zip

# Expected: All 5,911 XML files
# If yes: Extract and we're back in business!
```

### Check Other Zips
```bash
ls -lh /Users/lucasbayout/Downloads/*.zip | grep -i cfr

# Found:
cfr_complete.zip (unknown size)
cfr_data_platform.zip
cfr_data_platform (1).zip
CFR-2025-title-*.zip (individual titles)
CFR XML Repository-*.zip (may have more data)
```

---

## 🎯 Recommended Action

### STEP 1: Check cfr_complete.zip
```bash
cd /Users/lucasbayout/Downloads
unzip -l cfr_complete.zip | wc -l

# If > 5000 lines, it probably has all XMLs!
```

### STEP 2: Extract XMLs
```bash
cd "/Users/lucasbayout/Downloads/cfr_data_platform (1) 2"
mkdir -p cfr_xmls

# Extract from complete zip
unzip /Users/lucasbayout/Downloads/cfr_complete.zip -d temp/
find temp/ -name "*.xml" -exec mv {} cfr_xmls/ \;
rm -rf temp/
```

### STEP 3: Verify Count
```bash
find cfr_xmls/ -name "*.xml" | wc -l
# Expected: 5,911 files
```

### STEP 4: Re-ingest Data
```bash
# Wait for Docker to finish starting
docker compose ps

# Run direct processor
docker compose exec airflow-webserver python /opt/airflow/dags/direct_process.py
```

---

## ⏱️ Timeline

### If cfr_complete.zip has all XMLs:
- Extract: ~5 min
- Verify: ~1 min
- Wait for Docker: ~5 min (still downloading)
- Re-ingest: ~2-3 hours
- **Total: ~3 hours to full recovery**

### If need to re-download:
- Download: ~6-8 hours (20GB)
- Extract: ~10 min
- Re-ingest: ~2-3 hours
- **Total: ~10-12 hours to full recovery**

---

## 🔧 Prevention for Future

### Backup XMLs Separately
```bash
# Create backup outside Docker volumes
cp -r cfr_xmls /Users/lucasbayout/cfr_xmls_backup

# Or sync to cloud
# aws s3 sync cfr_xmls/ s3://your-bucket/cfr_xmls/
```

### Document XML Location
```yaml
# In docker-compose.yml
volumes:
  - ${CFR_XML_PATH:-./cfr_xmls}:/opt/airflow/external_data:ro
  # XMLs mounted READ-ONLY so they can't be deleted
```

### Regular Backups
```bash
# Weekly: Zip the XMLs
cd "/Users/lucasbayout/Downloads/cfr_data_platform (1) 2"
tar -czf cfr_xmls_backup_$(date +%Y%m%d).tar.gz cfr_xmls/
```

---

## 📋 Immediate Next Steps

1. **Check cfr_complete.zip:**
   ```bash
   unzip -l /Users/lucasbayout/Downloads/cfr_complete.zip | head -50
   ```

2. **If it has XMLs, extract them:**
   ```bash
   mkdir -p cfr_xmls
   # Extract commands here
   ```

3. **Wait for Docker to finish:**
   ```bash
   docker compose ps
   # All should show "Up"
   ```

4. **Verify app is running:**
   ```bash
   curl http://localhost:3000
   # Should return HTML
   ```

5. **Re-run migration:**
   ```bash
   docker compose exec -T mysql mysql -uapp -papp cfr_platform < soc2_migration.sql
   docker compose exec -T mysql mysql -uapp -papp cfr_platform < migrate_to_multi_year.sql
   ```

6. **Re-ingest data:**
   ```bash
   docker compose exec airflow-webserver python /opt/airflow/dags/direct_process.py
   ```

---

## 🎯 Status Summary

**Year Filter:** ✅ FIXED (code updated)  
**UI Enhanced:** ✅ DONE (badges, borders, labels)  
**Docker:** ⏳ STARTING (downloading images...)  
**Database:** 🔴 EMPTY (needs re-creation)  
**XML Files:** 🔴 MISSING (need recovery)  

**Critical Path:**
1. Wait for Docker (5-10 min)
2. Find/extract XMLs (5-60 min depending on source)
3. Re-create database schema (2 min)
4. Re-ingest data (2-3 hours)

---

**FIRST: Let's check that cfr_complete.zip!** 🔍

```bash
unzip -l /Users/lucasbayout/Downloads/cfr_complete.zip | head -50
```

If it has 5,911 XMLs, we're saved! If not, we need to re-download. 😰
