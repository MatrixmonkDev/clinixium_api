-- Login Activity Table - Tracks all login attempts (success and failed)
CREATE TABLE IF NOT EXISTS login_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_type ENUM('P', 'A', 'D') NOT NULL COMMENT 'P=Physician, A=Admin, D=Developer',
  user_id INT NOT NULL COMMENT 'Reference to user table',
  ip VARCHAR(45) NOT NULL COMMENT 'IP address (supports IPv6)',
  browser VARCHAR(255) COMMENT 'User agent/browser info',
  status ENUM('success', 'failed') NOT NULL COMMENT 'Login attempt status',
  failure_reason VARCHAR(255) COMMENT 'Reason for failure (invalid credentials, account locked, etc.)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the attempt occurred',
  INDEX idx_user (user_type, user_id),
  INDEX idx_ip (ip),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blocking Attempts Table - Tracks blocking state with history
CREATE TABLE IF NOT EXISTS blocking_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_type ENUM('P', 'A', 'D') NOT NULL COMMENT 'P=Physician, A=Admin, D=Developer',
  user_id INT NOT NULL COMMENT 'Reference to user table',
  ip VARCHAR(45) NOT NULL COMMENT 'IP address (supports IPv6)',
  level INT DEFAULT 1 COMMENT 'Current blocking level (1, 2, or 3)',
  attempt_count INT DEFAULT 1 COMMENT 'Number of failed attempts in current level',
  blocked_until TIMESTAMP NULL COMMENT 'When the block expires',
  status TINYINT DEFAULT 1 COMMENT '1=active/failed, 2=resolved/success',
  resolved_at TIMESTAMP NULL COMMENT 'When status changed to 2 (resolved)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'First attempt in current level',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last attempt/update',
  INDEX idx_status (status),
  INDEX idx_user (user_type, user_id),
  INDEX idx_ip (ip),
  INDEX idx_blocked_until (blocked_until),
  INDEX idx_user_status (user_type, user_id, status),
  INDEX idx_user_ip_status (user_type, user_id, ip, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blocking Configuration Table - Stores dynamic blocking level settings
CREATE TABLE IF NOT EXISTS blocking_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  level INT NOT NULL UNIQUE COMMENT 'Blocking level (1, 2, or 3)',
  max_attempts INT NOT NULL COMMENT 'Maximum failed attempts to trigger this level',
  block_duration_minutes INT NOT NULL COMMENT 'Block duration in minutes',
  enabled TINYINT(1) DEFAULT 1 COMMENT 'Whether this level is enabled (1=enabled, 0=disabled)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default blocking configuration
INSERT INTO blocking_config (level, max_attempts, block_duration_minutes, enabled) VALUES
(1, 3, 5, 1),
(2, 8, 15, 1),
(3, 18, 60, 1)
ON DUPLICATE KEY UPDATE
  max_attempts = VALUES(max_attempts),
  block_duration_minutes = VALUES(block_duration_minutes),
  enabled = VALUES(enabled);
