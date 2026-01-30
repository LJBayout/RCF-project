#!/bin/bash
# FAST Auto-process all CFR chunks - keeps going even if some fail

cd "$(dirname "$0")"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}⚡ FAST CFR Processing${NC}"
echo "======================"
echo ""

ITERATION=1
LAST_SECTIONS=0

# Get initial section count
LAST_SECTIONS=$(docker compose exec -T mysql mysql -uapp -papp cfr_platform -N -e "SELECT COUNT(*) FROM cfr_sections" 2>/dev/null | tr -d ' \n' || echo "0")

while true; do
    # Get current section count
    CURRENT_SECTIONS=$(docker compose exec -T mysql mysql -uapp -papp cfr_platform -N -e "SELECT COUNT(*) FROM cfr_sections" 2>/dev/null | tr -d ' \n' || echo "0")
    NEW_SECTIONS=$((CURRENT_SECTIONS - LAST_SECTIONS))
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Chunk #${ITERATION}${NC} | ${GREEN}${CURRENT_SECTIONS} sections${NC} (+${NEW_SECTIONS})"
    
    LAST_SECTIONS=$CURRENT_SECTIONS
    
    # Trigger DAG (ignore errors)
    docker compose exec -T airflow-webserver airflow dags trigger cfr_pipeline_chunked >/dev/null 2>&1 || true
    echo -e "${GREEN}✓ Triggered${NC}"
    
    # Wait for processing (shorter wait, keep moving)
    echo -n "  Processing: "
    for i in {1..12}; do
        sleep 5
        echo -n "."
        
        # Check if sections are growing
        CHECK_SECTIONS=$(docker compose exec -T mysql mysql -uapp -papp cfr_platform -N -e "SELECT COUNT(*) FROM cfr_sections" 2>/dev/null | tr -d ' \n' || echo "$CURRENT_SECTIONS")
        if [ "$CHECK_SECTIONS" -gt "$CURRENT_SECTIONS" ]; then
            DIFF=$((CHECK_SECTIONS - CURRENT_SECTIONS))
            echo -e " ${GREEN}+${DIFF} sections${NC}"
            break
        fi
    done
    echo ""
    
    # Show stats every 5 iterations
    if [ $((ITERATION % 5)) -eq 0 ]; then
        TITLES=$(docker compose exec -T mysql mysql -uapp -papp cfr_platform -N -e "SELECT COUNT(*) FROM cfr_titles" 2>/dev/null | tr -d ' \n')
        PARTS=$(docker compose exec -T mysql mysql -uapp -papp cfr_platform -N -e "SELECT COUNT(*) FROM cfr_parts" 2>/dev/null | tr -d ' \n')
        SECTIONS=$(docker compose exec -T mysql mysql -uapp -papp cfr_platform -N -e "SELECT COUNT(*) FROM cfr_sections" 2>/dev/null | tr -d ' \n')
        echo -e "  ${BLUE}📊 Titles: ${TITLES} | Parts: ${PARTS} | Sections: ${SECTIONS}${NC}"
    fi
    
    ITERATION=$((ITERATION + 1))
    sleep 2
done
