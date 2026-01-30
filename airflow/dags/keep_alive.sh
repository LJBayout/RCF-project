#!/bin/bash
# Watchdog script to keep direct_process.py running

LOG_FILE="/opt/airflow/data/direct_process.log"
SCRIPT_PATH="/opt/airflow/dags/direct_process.py"
CHECK_INTERVAL=10

echo "🔄 Starting Watchdog for direct_process.py"
echo "📋 Log: $LOG_FILE"
echo "⏱️  Check interval: ${CHECK_INTERVAL}s"
echo "---"

while true; do
  if ! ps aux | grep -v grep | grep "python.*direct_process.py" > /dev/null; then
    echo "⚠️  [$(date)] Process died! Restarting..."
    cd /opt/airflow/dags
    python direct_process.py >> "$LOG_FILE" 2>&1 &
    PID=$!
    echo "✅ [$(date)] Restarted with PID: $PID"
  else
    PID=$(ps aux | grep -v grep | grep "python.*direct_process.py" | awk '{print $2}' | head -1)
    echo "✅ [$(date)] Process running (PID: $PID)"
  fi
  
  sleep $CHECK_INTERVAL
done
