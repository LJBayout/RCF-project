#!/bin/bash
# Auto-process all CFR chunks until complete

set -e

cd "$(dirname "$0")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 CFR Auto-Processing Started${NC}"
echo "=================================="
echo ""
echo "This will automatically trigger chunks until all files are processed."
echo "Press Ctrl+C to stop at any time (progress is saved)."
echo ""

# Wait time between chunks (in seconds)
WAIT_TIME=360  # 6 minutes (adjust based on your chunk processing time)

# Counter
ITERATION=1

while true; do
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Iteration #${ITERATION}${NC}"
    echo ""
    
    # Check current progress
    if [ -f "airflow/data/chunk_state.json" ]; then
        PROCESSED=$(cat airflow/data/chunk_state.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('processed', [])))" 2>/dev/null || echo "0")
        CHUNK_INDEX=$(cat airflow/data/chunk_state.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('last_chunk_index', 0))" 2>/dev/null || echo "0")
        
        echo -e "${GREEN}📊 Current Progress:${NC}"
        echo "   Files processed: ${PROCESSED}"
        echo "   Chunks completed: ${CHUNK_INDEX}"
        echo ""
    fi
    
    # Check if already complete
    if [ -f "airflow/data/chunk_state.json" ]; then
        TOTAL_FILES=$(docker compose exec -T airflow-webserver find /opt/airflow/external_data -name "*.xml" -type f 2>/dev/null | wc -l | tr -d ' ')
        
        if [ "$PROCESSED" -ge "$TOTAL_FILES" ] && [ "$TOTAL_FILES" -gt "0" ]; then
            echo -e "${GREEN}🎉 All files processed! (${PROCESSED}/${TOTAL_FILES})${NC}"
            echo ""
            echo "Next steps:"
            echo "  1. Add fulltext index: ./monitor_pipeline.sh state"
            echo "  2. Test API: http://localhost:3000"
            exit 0
        fi
    fi
    
    # Trigger next chunk
    echo -e "${YELLOW}🚀 Triggering chunk #$((CHUNK_INDEX + 1))...${NC}"
    docker compose exec -T airflow-webserver airflow dags trigger cfr_pipeline_chunked >/dev/null 2>&1
    echo -e "${GREEN}✓ Triggered${NC}"
    echo ""
    
    # Wait for processing
    echo -e "${BLUE}⏳ Waiting ${WAIT_TIME} seconds for chunk to process...${NC}"
    echo "   (Showing progress every 30 seconds)"
    echo ""
    
    # Wait with periodic updates
    ELAPSED=0
    while [ $ELAPSED -lt $WAIT_TIME ]; do
        sleep 30
        ELAPSED=$((ELAPSED + 30))
        
        # Show mini progress update
        if [ -f "airflow/data/chunk_state.json" ]; then
            CURRENT_PROCESSED=$(cat airflow/data/chunk_state.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('processed', [])))" 2>/dev/null || echo "$PROCESSED")
            if [ "$CURRENT_PROCESSED" != "$PROCESSED" ]; then
                NEW_FILES=$((CURRENT_PROCESSED - PROCESSED))
                echo -e "   ${GREEN}▶ Progress: +${NEW_FILES} files (${CURRENT_PROCESSED} total)${NC}"
            fi
        fi
        
        # Show time remaining
        REMAINING=$((WAIT_TIME - ELAPSED))
        if [ $REMAINING -gt 0 ]; then
            echo -e "   ⏱  ${REMAINING}s remaining..."
        fi
    done
    
    echo ""
    echo -e "${GREEN}✓ Wait complete${NC}"
    echo ""
    
    # Increment iteration
    ITERATION=$((ITERATION + 1))
    
    # Optional: Add a small buffer between iterations
    sleep 5
done
