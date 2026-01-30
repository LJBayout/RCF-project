#!/bin/bash
# Watch database grow in real-time

cd "$(dirname "$0")"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 CFR Data Growth Monitor${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

while true; do
    clear
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🚀 CFR Data Growth Monitor${NC}"
    echo -e "${CYAN}$(date)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Get counts
    echo -e "${YELLOW}📊 Current Database Counts:${NC}"
    docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "
        SELECT 
            'Titles' as metric, 
            COUNT(*) as count,
            COUNT(DISTINCT title_number) as unique_values
        FROM cfr_titles
        UNION ALL
        SELECT 
            'Parts',
            COUNT(*),
            COUNT(DISTINCT part_number)
        FROM cfr_parts
        UNION ALL
        SELECT 
            'Sections',
            COUNT(*),
            NULL
        FROM cfr_sections;
    " 2>&1 | grep -v Warning
    
    echo ""
    echo -e "${YELLOW}📈 Processing Progress:${NC}"
    if [ -f airflow/data/chunk_state.json ]; then
        PROCESSED=$(cat airflow/data/chunk_state.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('processed', [])))")
        CHUNK=$(cat airflow/data/chunk_state.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('last_chunk_index', 0))")
        TOTAL=5911
        PCT=$(python3 -c "print(f'{($PROCESSED / $TOTAL * 100):.1f}')")
        REMAINING=$((TOTAL - PROCESSED))
        
        echo "  Files processed: $PROCESSED / $TOTAL ($PCT%)"
        echo "  Chunks completed: $CHUNK"
        echo "  Files remaining: $REMAINING"
        
        # Calculate ETA
        if [ $PROCESSED -gt 0 ]; then
            SECTIONS=$(docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "SELECT COUNT(*) FROM cfr_sections;" 2>&1 | grep -v Warning | tail -1)
            AVG_PER_FILE=$(python3 -c "print(int($SECTIONS / $PROCESSED))")
            ESTIMATED_TOTAL=$(python3 -c "print(int($AVG_PER_FILE * $TOTAL))")
            echo "  Avg sections/file: $AVG_PER_FILE"
            echo "  Estimated total: $(printf "%'d" $ESTIMATED_TOTAL) sections"
        fi
    else
        echo "  No progress file yet..."
    fi
    
    echo ""
    echo -e "${YELLOW}🕐 Latest 5 Sections Added:${NC}"
    docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "
        SELECT 
            CONCAT('Title ', t.title_number, ' - Part ', p.part_number, ' - § ', s.section_number) as location,
            LEFT(s.subject, 50) as subject,
            DATE_FORMAT(s.created_at, '%H:%i:%s') as time
        FROM cfr_sections s
        JOIN cfr_parts p ON s.part_id = p.id
        JOIN cfr_titles t ON p.title_id = t.id
        ORDER BY s.created_at DESC
        LIMIT 5;
    " 2>&1 | grep -v Warning
    
    echo ""
    echo -e "${CYAN}Refreshing in 10 seconds... (Ctrl+C to stop)${NC}"
    sleep 10
done
