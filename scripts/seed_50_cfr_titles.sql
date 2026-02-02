-- Seed all 50 CFR titles (metadata only) for app/RAG catalog
-- Run once: mysql -h 127.0.0.1 -u app -papp cfr_platform < scripts/seed_50_cfr_titles.sql
-- Or from Docker: docker compose exec mysql mysql -u app -papp cfr_platform < scripts/seed_50_cfr_titles.sql
-- Source: https://www.ecfr.gov/ (same as airflow/dags/cfr_title_names.py)

USE cfr_platform;

INSERT INTO cfr_titles (title_number, name, subject, year, revised_date) VALUES
(1, 'General Provisions', 'General Provisions', 2024, NULL),
(2, 'Grants and Agreements', 'Grants and Agreements', 2024, NULL),
(3, 'The President', 'The President', 2024, NULL),
(4, 'Accounts', 'Accounts', 2024, NULL),
(5, 'Administrative Personnel', 'Administrative Personnel', 2024, NULL),
(6, 'Domestic Security', 'Domestic Security', 2024, NULL),
(7, 'Agriculture', 'Agriculture', 2024, NULL),
(8, 'Aliens and Nationality', 'Aliens and Nationality', 2024, NULL),
(9, 'Animals and Animal Products', 'Animals and Animal Products', 2024, NULL),
(10, 'Energy', 'Energy', 2024, NULL),
(11, 'Federal Elections', 'Federal Elections', 2024, NULL),
(12, 'Banks and Banking', 'Banks and Banking', 2024, NULL),
(13, 'Business Credit and Assistance', 'Business Credit and Assistance', 2024, NULL),
(14, 'Aeronautics and Space', 'Aeronautics and Space', 2024, NULL),
(15, 'Commerce and Foreign Trade', 'Commerce and Foreign Trade', 2024, NULL),
(16, 'Commercial Practices', 'Commercial Practices', 2024, NULL),
(17, 'Commodity and Securities Exchanges', 'Commodity and Securities Exchanges', 2024, NULL),
(18, 'Conservation of Power and Water Resources', 'Conservation of Power and Water Resources', 2024, NULL),
(19, 'Customs Duties', 'Customs Duties', 2024, NULL),
(20, 'Employees'' Benefits', 'Employees'' Benefits', 2024, NULL),
(21, 'Food and Drugs', 'Food and Drugs', 2024, NULL),
(22, 'Foreign Relations', 'Foreign Relations', 2024, NULL),
(23, 'Highways', 'Highways', 2024, NULL),
(24, 'Housing and Urban Development', 'Housing and Urban Development', 2024, NULL),
(25, 'Indians', 'Indians', 2024, NULL),
(26, 'Internal Revenue', 'Internal Revenue', 2024, NULL),
(27, 'Alcohol, Tobacco Products and Firearms', 'Alcohol, Tobacco Products and Firearms', 2024, NULL),
(28, 'Judicial Administration', 'Judicial Administration', 2024, NULL),
(29, 'Labor', 'Labor', 2024, NULL),
(30, 'Mineral Resources', 'Mineral Resources', 2024, NULL),
(31, 'Money and Finance: Treasury', 'Money and Finance: Treasury', 2024, NULL),
(32, 'National Defense', 'National Defense', 2024, NULL),
(33, 'Navigation and Navigable Waters', 'Navigation and Navigable Waters', 2024, NULL),
(34, 'Education', 'Education', 2024, NULL),
(35, 'Panama Canal', 'Panama Canal', 2024, NULL),
(36, 'Parks, Forests, and Public Property', 'Parks, Forests, and Public Property', 2024, NULL),
(37, 'Patents, Trademarks, and Copyrights', 'Patents, Trademarks, and Copyrights', 2024, NULL),
(38, 'Pensions, Bonuses, and Veterans'' Relief', 'Pensions, Bonuses, and Veterans'' Relief', 2024, NULL),
(39, 'Postal Service', 'Postal Service', 2024, NULL),
(40, 'Protection of Environment', 'Protection of Environment', 2024, NULL),
(41, 'Public Contracts and Property Management', 'Public Contracts and Property Management', 2024, NULL),
(42, 'Public Health', 'Public Health', 2024, NULL),
(43, 'Public Lands: Interior', 'Public Lands: Interior', 2024, NULL),
(44, 'Emergency Management and Assistance', 'Emergency Management and Assistance', 2024, NULL),
(45, 'Public Welfare', 'Public Welfare', 2024, NULL),
(46, 'Shipping', 'Shipping', 2024, NULL),
(47, 'Telecommunication', 'Telecommunication', 2024, NULL),
(48, 'Federal Acquisition Regulations System', 'Federal Acquisition Regulations System', 2024, NULL),
(49, 'Transportation', 'Transportation', 2024, NULL),
(50, 'Wildlife and Fisheries', 'Wildlife and Fisheries', 2024, NULL)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  subject = VALUES(subject),
  year = VALUES(year),
  revised_date = VALUES(revised_date);

-- If your table has UNIQUE(title_number, year) from Drizzle, the above inserts 50 rows.
-- If your table has UNIQUE(title_number) only, ON DUPLICATE KEY UPDATE keeps one row per title.

SELECT COUNT(*) AS cfr_titles_count FROM cfr_titles;
