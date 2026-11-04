-- ============================================
-- PHYSICIAN ONBOARDING DATABASE SCHEMA
-- ============================================

-- 1. Country Codes Table (Fixed - No CRUD)
CREATE TABLE IF NOT EXISTS country_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  dial_code VARCHAR(10) NOT NULL,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Timezones Table (Fixed - No CRUD)
CREATE TABLE IF NOT EXISTS timezones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  utc_offset VARCHAR(10) NOT NULL,
  region VARCHAR(50) NOT NULL,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Medical Departments Table (Primary Speciality) - Admin CRUD
CREATE TABLE IF NOT EXISTS medical_departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active TINYINT DEFAULT 1,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_is_active (is_active),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Medical Categories Table (Sub-speciality & Sub-sub-speciality) - Admin CRUD
CREATE TABLE IF NOT EXISTS medical_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  parent_id INT NULL,
  medical_department_id INT NOT NULL,
  description TEXT NULL,
  is_active TINYINT DEFAULT 1,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES medical_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (medical_department_id) REFERENCES medical_departments(id) ON DELETE CASCADE,
  INDEX idx_parent_id (parent_id),
  INDEX idx_department_id (medical_department_id),
  INDEX idx_is_active (is_active),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Practice Settings Table - Admin CRUD
CREATE TABLE IF NOT EXISTS practice_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active TINYINT DEFAULT 1,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_is_active (is_active),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Imaging Modalities Table - Admin CRUD
CREATE TABLE IF NOT EXISTS imaging_modalities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active TINYINT DEFAULT 1,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_is_active (is_active),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. AI Annotation Experiences Table - Admin CRUD
CREATE TABLE IF NOT EXISTS ai_annotation_experiences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active TINYINT DEFAULT 1,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_is_active (is_active),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Document Types Table (Fixed - No CRUD)
CREATE TABLE IF NOT EXISTS doc_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL,
  category VARCHAR(50) NOT NULL COMMENT 'identity, medical, profile, compliance',
  is_active TINYINT DEFAULT 1,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  INDEX idx_category (category),
  INDEX idx_is_active (is_active),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. User Uploads Table (Merged with media_urls)
CREATE TABLE IF NOT EXISTS user_uploads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  user_type ENUM('P', 'A', 'D') NOT NULL,
  doc_type_id INT NOT NULL,
  url VARCHAR(1024) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_provider VARCHAR(50) DEFAULT 'local',
  description TEXT NULL,
  is_verified TINYINT DEFAULT 0,
  verified_at DATETIME NULL,
  verified_by INT NULL,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (doc_type_id) REFERENCES doc_types(id),
  INDEX idx_user (user_id, user_type),
  INDEX idx_doc_type (doc_type_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Physician Departments Table (1:many relationship)
CREATE TABLE IF NOT EXISTS physician_departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  physician_id INT NOT NULL,
  medical_department_id INT NOT NULL,
  is_primary TINYINT DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (physician_id) REFERENCES physicians(id) ON DELETE CASCADE,
  FOREIGN KEY (medical_department_id) REFERENCES medical_departments(id) ON DELETE CASCADE,
  UNIQUE KEY unique_physician_department (physician_id, medical_department_id),
  INDEX idx_physician_id (physician_id),
  INDEX idx_is_primary (is_primary),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Physician Categories Table (1:many relationship)
CREATE TABLE IF NOT EXISTS physician_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  physician_id INT NOT NULL,
  medical_category_id INT NOT NULL,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (physician_id) REFERENCES physicians(id) ON DELETE CASCADE,
  FOREIGN KEY (medical_category_id) REFERENCES medical_categories(id) ON DELETE CASCADE,
  UNIQUE KEY unique_physician_category (physician_id, medical_category_id),
  INDEX idx_physician_id (physician_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Physician Practice Settings Table (1:many relationship)
CREATE TABLE IF NOT EXISTS physician_practice_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  physician_id INT NOT NULL,
  practice_setting_id INT NOT NULL,
  other_value VARCHAR(255) NULL,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (physician_id) REFERENCES physicians(id) ON DELETE CASCADE,
  FOREIGN KEY (practice_setting_id) REFERENCES practice_settings(id) ON DELETE CASCADE,
  UNIQUE KEY unique_physician_setting (physician_id, practice_setting_id),
  INDEX idx_physician_id (physician_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Physician Imaging Modalities Table (1:many relationship)
CREATE TABLE IF NOT EXISTS physician_imaging_modalities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  physician_id INT NOT NULL,
  imaging_modality_id INT NULL,
  other_modality VARCHAR(255) NULL,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (physician_id) REFERENCES physicians(id) ON DELETE CASCADE,
  FOREIGN KEY (imaging_modality_id) REFERENCES imaging_modalities(id) ON DELETE SET NULL,
  INDEX idx_physician_id (physician_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Physician AI Experiences Table (1:many relationship)
CREATE TABLE IF NOT EXISTS physician_ai_experiences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  physician_id INT NOT NULL,
  ai_annotation_experience_id INT NOT NULL,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (physician_id) REFERENCES physicians(id) ON DELETE CASCADE,
  FOREIGN KEY (ai_annotation_experience_id) REFERENCES ai_annotation_experiences(id) ON DELETE CASCADE,
  UNIQUE KEY unique_physician_ai_experience (physician_id, ai_annotation_experience_id),
  INDEX idx_physician_id (physician_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
