#!/bin/bash
# View CFR data in MySQL database

cd "$(dirname "$0")"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📊 CFR Data Viewer${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

case "$1" in
  counts)
    echo -e "\n${YELLOW}📈 Total Counts:${NC}"
    docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "
      SELECT 
          'Titles' as table_name, COUNT(*) as count FROM cfr_titles
      UNION ALL
      SELECT 'Parts', COUNT(*) FROM cfr_parts
      UNION ALL
      SELECT 'Sections', COUNT(*) FROM cfr_sections;
    " 2>&1 | grep -v Warning
    ;;
    
  titles)
    echo -e "\n${YELLOW}📚 All Titles:${NC}"
    docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "
      SELECT title_number, name, year, 
             (SELECT COUNT(*) FROM cfr_parts WHERE title_id = cfr_titles.id) as parts_count,
             created_at
      FROM cfr_titles 
      ORDER BY title_number;
    " 2>&1 | grep -v Warning
    ;;
    
  parts)
    TITLE=${2:-42}
    echo -e "\n${YELLOW}📖 Parts for Title $TITLE:${NC}"
    docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "
      SELECT p.part_number, p.name, 
             (SELECT COUNT(*) FROM cfr_sections WHERE part_id = p.id) as sections_count
      FROM cfr_parts p
      JOIN cfr_titles t ON p.title_id = t.id
      WHERE t.title_number = $TITLE
      ORDER BY p.part_number;
    " 2>&1 | grep -v Warning
    ;;
    
  sections)
    PART=${2:-400}
    echo -e "\n${YELLOW}📄 Sections for Part $PART:${NC}"
    docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "
      SELECT s.section_number, s.subject, LEFT(s.content, 80) as preview
      FROM cfr_sections s
      JOIN cfr_parts p ON s.part_id = p.id
      WHERE p.part_number = $PART
      ORDER BY s.section_number
      LIMIT 20;
    " 2>&1 | grep -v Warning
    ;;
    
  section)
    SECTION_NUM=${2:-"401.101"}
    echo -e "\n${YELLOW}📜 Full Section $SECTION_NUM:${NC}"
    docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "
      SELECT s.section_number, s.subject, s.content
      FROM cfr_sections s
      WHERE s.section_number LIKE '%$SECTION_NUM%'
      LIMIT 1;
    " 2>&1 | grep -v Warning
    ;;
    
  search)
    QUERY=${2:-"medicare"}
    echo -e "\n${YELLOW}🔍 Searching for '$QUERY':${NC}"
    docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "
      SELECT s.section_number, s.subject, LEFT(s.content, 100) as preview
      FROM cfr_sections s
      WHERE s.subject LIKE '%$QUERY%' OR s.content LIKE '%$QUERY%'
      LIMIT 10;
    " 2>&1 | grep -v Warning
    ;;
    
  latest)
    echo -e "\n${YELLOW}🕐 Latest 10 Sections Added:${NC}"
    docker compose exec -T mysql mysql -uapp -papp cfr_platform -e "
      SELECT s.section_number, s.subject, s.created_at
      FROM cfr_sections s
      ORDER BY s.created_at DESC
      LIMIT 10;
    " 2>&1 | grep -v Warning
    ;;
    
  *)
    echo -e "\n${GREEN}Usage:${NC}"
    echo "  ./view_data.sh counts              # Show total counts"
    echo "  ./view_data.sh titles              # List all titles"
    echo "  ./view_data.sh parts [title_num]   # List parts (default: title 42)"
    echo "  ./view_data.sh sections [part_num] # List sections (default: part 400)"
    echo "  ./view_data.sh section [sect_num]  # View full section (default: 401.101)"
    echo "  ./view_data.sh search [keyword]    # Search content (default: 'medicare')"
    echo "  ./view_data.sh latest              # Show latest 10 sections added"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo "  ./view_data.sh counts"
    echo "  ./view_data.sh parts 42"
    echo "  ./view_data.sh sections 400"
    echo "  ./view_data.sh section 401.101"
    echo "  ./view_data.sh search 'hospital'"
    echo ""
    ;;
esac
