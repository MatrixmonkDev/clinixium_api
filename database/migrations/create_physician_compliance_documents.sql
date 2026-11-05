-- Create physician_compliance_documents table for tracking compliance agreements
CREATE TABLE IF NOT EXISTS physician_compliance_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  physician_id INT NOT NULL,
  doc_type_id INT NOT NULL COMMENT '8=BAA, 9=NDA, 10=HIPAA, 11=Terms of Service',
  agreed_at DATETIME NOT NULL,
  signature_upload_id INT NULL COMMENT 'Electronic signature image (doc_type_id = 7)',
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (physician_id) REFERENCES physicians(id) ON DELETE CASCADE,
  FOREIGN KEY (doc_type_id) REFERENCES doc_types(id) ON DELETE CASCADE,
  FOREIGN KEY (signature_upload_id) REFERENCES user_uploads(id) ON DELETE SET NULL,
  UNIQUE KEY unique_physician_doc (physician_id, doc_type_id),
  INDEX idx_physician_id (physician_id),
  INDEX idx_doc_type (doc_type_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
