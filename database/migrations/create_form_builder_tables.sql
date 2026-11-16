-- Form Builder Tables Migration
-- Creates all tables for dynamic form builder functionality

-- 1. form_templates (Main Form Table)
CREATE TABLE IF NOT EXISTS form_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(20) DEFAULT '1.0',
  status ENUM('draft', 'pending_approval', 'active', 'inactive', 'rejected', 'archived') DEFAULT 'draft',
  
  -- Creator info
  created_by_user_type ENUM('A', 'D') NOT NULL COMMENT 'A=Admin, D=Developer',
  created_by_user_id INT NOT NULL COMMENT 'Reference to admin_mst or developer_mst',
  
  -- Approval info (for developer-created forms)
  approved_by_user_id INT NULL,
  approved_at DATETIME NULL,
  rejection_reason TEXT NULL,
  
  -- Metadata
  specialty VARCHAR(100) NULL COMMENT 'Medical specialty mapping',
  instructions TEXT NULL COMMENT 'Form instructions for users',
  estimated_completion_time INT NULL COMMENT 'In minutes',
  
  -- Department assignment (primary department)
  department_id INT NULL,
  
  -- Stats
  total_fields INT DEFAULT 0,
  required_fields INT DEFAULT 0,
  optional_fields INT DEFAULT 0,
  
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  
  INDEX idx_status (status),
  INDEX idx_department (department_id),
  INDEX idx_created_by (created_by_user_type, created_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. form_template_categories (Junction Table for Category Assignment)
CREATE TABLE IF NOT EXISTS form_template_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_template_id INT NOT NULL,
  category_id INT NOT NULL,
  created_at DATETIME NULL,
  status TINYINT DEFAULT 1 COMMENT '1=active, 0=inactive',
  
  UNIQUE KEY unique_form_category (form_template_id, category_id),
  INDEX idx_form_template (form_template_id),
  INDEX idx_category (category_id),
  
  FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES medical_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. form_fields (Field Definitions)
CREATE TABLE IF NOT EXISTS form_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_template_id INT NOT NULL,
  
  -- Field properties
  field_label VARCHAR(255) NOT NULL COMMENT 'Display label for user',
  field_name VARCHAR(100) NOT NULL COMMENT 'Unique field identifier for backend',
  field_type ENUM('text', 'textarea', 'number', 'email', 'file', 'dropdown', 'radio', 'checkbox', 'date', 'phone') NOT NULL,
  placeholder VARCHAR(255) NULL,
  sort_order INT DEFAULT 0,
  is_required TINYINT DEFAULT 0,
  width INT DEFAULT 12 COMMENT 'Bootstrap grid width (1-12), e.g., 6 for col-6, 12 for col-12',
  
  -- Validation rules
  min_length INT NULL,
  max_length INT NULL,
  min_value DECIMAL(10,2) NULL,
  max_value DECIMAL(10,2) NULL,
  pattern VARCHAR(255) NULL COMMENT 'Regex pattern for validation',
  validation_message VARCHAR(255) NULL,
  
  -- File-specific
  allowed_file_types VARCHAR(255) NULL COMMENT 'e.g., pdf,doc,docx',
  max_file_size_mb INT NULL,
  
  -- Default value
  default_value VARCHAR(255) NULL,
  
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  status TINYINT DEFAULT 1 COMMENT '1=active, 0=inactive',
  
  INDEX idx_form_template (form_template_id),
  INDEX idx_sort_order (form_template_id, sort_order),
  
  FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. form_field_options (Options for Dropdown/Radio/Checkbox)
CREATE TABLE IF NOT EXISTS form_field_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_field_id INT NOT NULL,
  option_label VARCHAR(255) NOT NULL COMMENT 'Display label',
  option_value VARCHAR(255) NOT NULL COMMENT 'Stored value',
  sort_order INT DEFAULT 0,
  is_default TINYINT DEFAULT 0 COMMENT 'Whether this is pre-selected',
  created_at DATETIME NULL,
  status TINYINT DEFAULT 1 COMMENT '1=active, 0=inactive',
  
  INDEX idx_form_field (form_field_id),
  INDEX idx_sort_order (form_field_id, sort_order),
  
  FOREIGN KEY (form_field_id) REFERENCES form_fields(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. form_submissions (Form Response Data)
CREATE TABLE IF NOT EXISTS form_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_template_id INT NOT NULL,
  
  -- Who submitted (only physicians)
  submitted_by_user_type ENUM('P') NOT NULL COMMENT 'P=Physician',
  submitted_by_user_id INT NOT NULL,
  
  -- Context
  department_id INT NULL,
  category_id INT NULL,
  
  -- Submission metadata
  submission_status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected') DEFAULT 'draft',
  submitted_at DATETIME NULL,
  reviewed_by_user_id INT NULL,
  reviewed_at DATETIME NULL,
  review_notes TEXT NULL,
  
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  status TINYINT DEFAULT 1 COMMENT '1=active, 0=archived',
  
  INDEX idx_form_template (form_template_id),
  INDEX idx_submitted_by (submitted_by_user_type, submitted_by_user_id),
  INDEX idx_status (submission_status),
  
  FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. form_submission_data (Field Values)
CREATE TABLE IF NOT EXISTS form_submission_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_submission_id INT NOT NULL,
  form_field_id INT NOT NULL,
  
  -- Store different data types
  text_value TEXT NULL,
  number_value DECIMAL(10,2) NULL,
  date_value DATE NULL,
  file_url VARCHAR(500) NULL,
  
  -- For checkbox/multi-select (JSON array)
  array_value JSON NULL,
  
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  status TINYINT DEFAULT 1 COMMENT '1=active, 0=deleted',
  
  UNIQUE KEY unique_submission_field (form_submission_id, form_field_id),
  INDEX idx_form_submission (form_submission_id),
  INDEX idx_form_field (form_field_id),
  
  FOREIGN KEY (form_submission_id) REFERENCES form_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (form_field_id) REFERENCES form_fields(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. form_version_history (Version Tracking)
CREATE TABLE IF NOT EXISTS form_version_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_template_id INT NOT NULL,
  version VARCHAR(20) NOT NULL,
  
  -- Who made the change
  changed_by_user_id INT NOT NULL,
  changed_by_user_type ENUM('A', 'D') NOT NULL,
  
  -- Change summary
  change_summary TEXT NULL COMMENT 'Description of changes',
  change_type ENUM('created', 'updated', 'archived', 'restored') NOT NULL,
  
  -- Snapshot of fields (JSON for quick comparison)
  fields_snapshot JSON NULL,
  
  created_at DATETIME NULL,
  status TINYINT DEFAULT 1 COMMENT '1=active, 0=archived',
  
  INDEX idx_form_template (form_template_id),
  INDEX idx_version (form_template_id, version),
  
  FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
