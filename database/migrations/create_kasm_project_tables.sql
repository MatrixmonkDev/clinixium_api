-- Kasm Project Management Tables for Clinixium
-- Developers create projects and assign physicians to access Kasm workspaces

-- Table: kasm_projects
-- Stores developer projects linked to Kasm workspaces
CREATE TABLE IF NOT EXISTS kasm_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  developer_id INT NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  description TEXT,
  kasm_workspace_id VARCHAR(255) NOT NULL COMMENT 'Kasm workspace ID (UUID)',
  kasm_workspace_name VARCHAR(255) COMMENT 'Kasm workspace name for reference',
  max_sessions INT DEFAULT 1 COMMENT 'Maximum concurrent sessions allowed',
  session_duration_minutes INT DEFAULT 60 COMMENT 'Session duration in minutes',
  is_active TINYINT(1) DEFAULT 1 COMMENT '1 = active, 0 = inactive',
  created_at DATETIME NULL DEFAULT NULL,
  updated_at DATETIME NULL DEFAULT NULL,
  status TINYINT(1) DEFAULT 1 COMMENT '1 = active, 0 = deleted/inactive',
  INDEX idx_developer_id (developer_id),
  INDEX idx_status (status),
  INDEX idx_is_active (is_active),
  FOREIGN KEY (developer_id) REFERENCES developer_mst(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: kasm_project_physicians
-- Links physicians to projects with access permissions
CREATE TABLE IF NOT EXISTS kasm_project_physicians (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  physician_id INT NOT NULL,
  access_level ENUM('view', 'full') DEFAULT 'full' COMMENT 'view = read-only, full = full access',
  assigned_at DATETIME NULL DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1 COMMENT '1 = active, 0 = inactive',
  created_at DATETIME NULL DEFAULT NULL,
  updated_at DATETIME NULL DEFAULT NULL,
  status TINYINT(1) DEFAULT 1 COMMENT '1 = active, 0 = deleted/inactive',
  UNIQUE KEY unique_physician_project (physician_id, project_id, status),
  INDEX idx_project_id (project_id),
  INDEX idx_physician_id (physician_id),
  INDEX idx_status (status),
  INDEX idx_is_active (is_active),
  FOREIGN KEY (project_id) REFERENCES kasm_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (physician_id) REFERENCES physician_mst(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: kasm_sessions
-- Tracks active Kasm sessions for audit and management
CREATE TABLE IF NOT EXISTS kasm_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  physician_id INT NOT NULL,
  kasm_session_id VARCHAR(255) NOT NULL COMMENT 'Kasm session ID (UUID)',
  kasm_url TEXT COMMENT 'Kasm connection URL',
  session_token TEXT COMMENT 'Kasm session token',
  status ENUM('starting', 'running', 'stopped', 'terminated', 'error') DEFAULT 'starting',
  started_at DATETIME NULL DEFAULT NULL,
  stopped_at DATETIME NULL DEFAULT NULL,
  created_at DATETIME NULL DEFAULT NULL,
  updated_at DATETIME NULL DEFAULT NULL,
  INDEX idx_project_id (project_id),
  INDEX idx_physician_id (physician_id),
  INDEX idx_kasm_session_id (kasm_session_id),
  INDEX idx_status (status),
  FOREIGN KEY (project_id) REFERENCES kasm_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (physician_id) REFERENCES physician_mst(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
