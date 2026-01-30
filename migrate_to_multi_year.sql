-- Migration: Support multiple years per title
-- Change unique constraint from (title_number) to (title_number, year)

SET FOREIGN_KEY_CHECKS=0;

-- Truncate tables (existing data has duplicate title_numbers for different years)
TRUNCATE TABLE cfr_sections;
TRUNCATE TABLE cfr_parts;
TRUNCATE TABLE cfr_titles;

SET FOREIGN_KEY_CHECKS=1;

-- Drop old unique constraint on title_number
ALTER TABLE cfr_titles DROP INDEX title_number;

-- Add new unique constraint on (title_number, year)
ALTER TABLE cfr_titles ADD UNIQUE INDEX unique_title_year (title_number, year);
