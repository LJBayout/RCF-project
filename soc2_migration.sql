-- SOC 2 Compliance Tables Migration
-- Creates audit_logs and api_keys tables

-- Audit Logs Table (CC6.8, CC7.2)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    metadata TEXT NULL,
    success INT NOT NULL DEFAULT 1,
    error_message TEXT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX user_id_idx (user_id),
    INDEX timestamp_idx (timestamp),
    INDEX action_idx (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API Keys Table (CC6.1)
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    last_used TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    rate_limit INT DEFAULT 1000 COMMENT 'Requests per hour',
    is_active INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX key_hash_idx (key_hash),
    INDEX user_id_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial audit log entry
INSERT INTO audit_logs (action, resource, metadata, success, timestamp)
VALUES ('system.startup', 'system', '{"message": "SOC 2 compliance tables created"}', 1, NOW());

SELECT 'SOC 2 compliance tables created successfully' as status;
