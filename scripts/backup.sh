#!/bin/bash
# SOC 2 - Automated Backup Script (A1.2, C1.2)
# Ensures data availability and disaster recovery

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="cfr_platform"

echo "🔒 SOC 2 Compliance - Database Backup"
echo "======================================"
echo "Date: $(date)"
echo "Database: $DB_NAME"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# MySQL Backup
echo "📦 Creating MySQL backup..."
docker compose exec -T mysql mysqldump \
  -uapp -papp \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  $DB_NAME | gzip > "$BACKUP_DIR/cfr_backup_${DATE}.sql.gz"

BACKUP_SIZE=$(du -h "$BACKUP_DIR/cfr_backup_${DATE}.sql.gz" | cut -f1)
echo "✅ Backup created: cfr_backup_${DATE}.sql.gz ($BACKUP_SIZE)"

# Verify backup integrity
echo "🔍 Verifying backup integrity..."
gunzip -t "$BACKUP_DIR/cfr_backup_${DATE}.sql.gz"
echo "✅ Backup verification successful"

# Clean old backups (retention policy)
echo "🗑️  Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "cfr_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/cfr_backup_*.sql.gz 2>/dev/null | wc -l)
echo "✅ Retention policy applied. $REMAINING backups remaining."

# Log to audit
echo ""
echo "📋 Backup Summary:"
echo "  - Backup file: cfr_backup_${DATE}.sql.gz"
echo "  - Size: $BACKUP_SIZE"
echo "  - Total backups: $REMAINING"
echo "  - Retention: $RETENTION_DAYS days"
echo ""
echo "✅ SOC 2 Backup Complete"

# In production: Upload to S3/GCS with encryption
# aws s3 cp "$BACKUP_DIR/cfr_backup_${DATE}.sql.gz" s3://your-bucket/ --sse AES256
