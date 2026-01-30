-- Create CFR tables for Airflow parser
-- Run this before starting the chunked pipeline

USE cfr_platform;

-- CFR Titles table
CREATE TABLE IF NOT EXISTS cfr_titles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title_number INT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    subject TEXT,
    year INT NOT NULL,
    revised_date VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX title_number_idx (title_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CFR Parts table
CREATE TABLE IF NOT EXISTS cfr_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title_id INT NOT NULL,
    part_number INT NOT NULL,
    name TEXT NOT NULL,
    subject TEXT,
    authority TEXT,
    source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (title_id) REFERENCES cfr_titles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_title_part (title_id, part_number),
    INDEX title_part_idx (title_id, part_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CFR Sections table (LARGEST - will contain millions of rows)
CREATE TABLE IF NOT EXISTS cfr_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    part_id INT NOT NULL,
    section_number VARCHAR(50) NOT NULL,
    subject TEXT NOT NULL,
    content LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (part_id) REFERENCES cfr_parts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_part_section (part_id, section_number),
    INDEX part_section_idx (part_id, section_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Show created tables
SHOW TABLES;

-- Show table structures
DESCRIBE cfr_titles;
DESCRIBE cfr_parts;
DESCRIBE cfr_sections;
