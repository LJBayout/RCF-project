-- Add Manus Debug Logs table
CREATE TABLE IF NOT EXISTS manus_debug_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  log_type VARCHAR(50) NOT NULL COMMENT 'console | network | ui',
  data TEXT NOT NULL COMMENT 'JSON stringified log entry',
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX log_type_idx (log_type),
  INDEX timestamp_idx (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
