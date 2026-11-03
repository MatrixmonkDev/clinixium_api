-- Password Reset Tokens Table
-- Stores tokens for password reset functionality
-- Status: 1 = active, 2 = used, 3 = expired

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_type ENUM('P', 'A', 'D') NOT NULL COMMENT 'P=Physician, A=Admin, D=Developer',
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  status TINYINT DEFAULT 1 COMMENT '1=active, 2=used, 3=expired',
  INDEX idx_token (token),
  INDEX idx_user (user_id, user_type),
  INDEX idx_expires (expires_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
