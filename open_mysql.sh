#!/bin/bash
# Quick access to MySQL visualization

cd "$(dirname "$0")"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📊 MySQL Visualization Options${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if phpMyAdmin is running
PMA_STATUS=$(docker compose ps phpmyadmin --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4)

if [ "$PMA_STATUS" = "running" ]; then
    echo -e "${GREEN}✅ phpMyAdmin is running!${NC}"
    echo -e "   ${BLUE}→ http://localhost:8081${NC}"
    echo ""
    echo -e "${YELLOW}Login credentials:${NC}"
    echo "   Server: mysql"
    echo "   Username: app"
    echo "   Password: app"
    echo "   Database: cfr_platform"
    echo ""
    echo -e "${GREEN}Opening in browser...${NC}"
    open http://localhost:8081 2>/dev/null || xdg-open http://localhost:8081 2>/dev/null || echo "Please open: http://localhost:8081"
else
    echo -e "${YELLOW}⏳ phpMyAdmin is still starting...${NC}"
    echo ""
    echo -e "${GREEN}Meanwhile, use these options:${NC}"
    echo ""
    echo -e "${BLUE}1. Command Line Tools:${NC}"
    echo "   ./view_data.sh counts"
    echo "   ./view_data.sh titles"
    echo "   ./watch_growth.sh"
    echo ""
    echo -e "${BLUE}2. Direct MySQL:${NC}"
    echo "   docker compose exec mysql mysql -uapp -papp cfr_platform"
    echo ""
    echo -e "${BLUE}3. Desktop Apps (Install):${NC}"
    echo "   • TablePlus: https://tableplus.com/"
    echo "   • MySQL Workbench: https://dev.mysql.com/downloads/workbench/"
    echo "   • DBeaver: https://dbeaver.io/"
    echo ""
    echo -e "${YELLOW}Connection Details:${NC}"
    echo "   Host: localhost"
    echo "   Port: 3306"
    echo "   User: app"
    echo "   Password: app"
    echo "   Database: cfr_platform"
    echo ""
    echo -e "${GREEN}Checking phpMyAdmin status...${NC}"
    docker compose ps phpmyadmin
fi
