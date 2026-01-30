#!/bin/bash
# Monitor CFR Pipeline Progress in Real-Time

set -e

cd "$(dirname "$0")"

echo "🔍 CFR Pipeline Monitor"
echo "======================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to get latest DAG run
get_latest_run() {
    docker compose exec -T airflow-webserver airflow dags list-runs -d cfr_pipeline_chunked --no-backfill -o plain 2>/dev/null | tail -n 1 | awk '{print $2}'
}

# Function to check state file
check_state() {
    if [ -f "airflow/data/chunk_state.json" ]; then
        echo -e "${BLUE}📊 Current Progress:${NC}"
        cat airflow/data/chunk_state.json | python3 -m json.tool 2>/dev/null || cat airflow/data/chunk_state.json
        echo ""
        
        # Calculate stats
        PROCESSED=$(cat airflow/data/chunk_state.json | grep -o '"processed"' | wc -l)
        CHUNK_INDEX=$(cat airflow/data/chunk_state.json | grep -o '"last_chunk_index": [0-9]*' | grep -o '[0-9]*' || echo "0")
        
        echo -e "${GREEN}✓ Chunks completed: ${CHUNK_INDEX}${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠ No state file yet (first run not started)${NC}"
        echo ""
    fi
}

# Function to show DAG status
show_dag_status() {
    echo -e "${BLUE}📋 DAG Status:${NC}"
    docker compose exec -T airflow-webserver airflow dags list-runs -d cfr_pipeline_chunked --no-backfill -o table 2>/dev/null | head -20 || echo "No runs yet"
    echo ""
}

# Function to tail logs
tail_logs() {
    echo -e "${BLUE}📝 Live Logs (Ctrl+C to stop):${NC}"
    echo "================================"
    echo ""
    
    # Try to get latest run ID
    RUN_ID=$(get_latest_run)
    
    if [ -z "$RUN_ID" ]; then
        echo -e "${YELLOW}No active run found. Showing scheduler logs...${NC}"
        docker compose logs -f --tail=50 airflow-scheduler
    else
        echo -e "${GREEN}Following run: ${RUN_ID}${NC}"
        echo ""
        
        # Follow scheduler logs (shows task execution)
        docker compose logs -f --tail=100 airflow-scheduler | grep -E "(cfr_pipeline_chunked|discover_next_chunk|parse_and_load|update_state|📊|📦|📈|✅|🎉)" --color=always
    fi
}

# Main menu
case "${1:-status}" in
    status)
        echo -e "${BLUE}Current Status:${NC}"
        echo ""
        check_state
        show_dag_status
        echo ""
        echo "Commands:"
        echo "  ./monitor_pipeline.sh logs     - Watch live logs"
        echo "  ./monitor_pipeline.sh state    - Show progress state"
        echo "  ./monitor_pipeline.sh trigger  - Trigger next chunk"
        echo "  ./monitor_pipeline.sh reset    - Reset progress (start over)"
        ;;
    
    logs)
        check_state
        tail_logs
        ;;
    
    state)
        check_state
        
        # Also show MySQL row counts
        echo -e "${BLUE}📊 Database Stats:${NC}"
        docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "
            SELECT 'cfr_titles' as table_name, COUNT(*) as rows FROM cfr_titles
            UNION ALL
            SELECT 'cfr_parts', COUNT(*) FROM cfr_parts
            UNION ALL
            SELECT 'cfr_sections', COUNT(*) FROM cfr_sections;
        " 2>/dev/null || echo "Database not ready or empty"
        echo ""
        ;;
    
    trigger)
        echo -e "${YELLOW}🚀 Triggering next chunk...${NC}"
        docker compose exec -T airflow-webserver airflow dags trigger cfr_pipeline_chunked
        echo ""
        echo -e "${GREEN}✓ Triggered! Run './monitor_pipeline.sh logs' to watch progress${NC}"
        ;;
    
    reset)
        echo -e "${RED}⚠️  This will reset all progress and start from file 1!${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            rm -f airflow/data/chunk_state.json
            echo -e "${GREEN}✓ Progress reset. Run './monitor_pipeline.sh trigger' to start over${NC}"
        else
            echo "Cancelled."
        fi
        ;;
    
    *)
        echo "Usage: $0 {status|logs|state|trigger|reset}"
        exit 1
        ;;
esac
