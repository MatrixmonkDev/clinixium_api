-- Add 2FA fields to developer_mst table
ALTER TABLE developer_mst
ADD COLUMN two_factor_enabled TINYINT(1) DEFAULT 0,
ADD COLUMN two_factor_method VARCHAR(50) DEFAULT NULL COMMENT 'app, sms, email',
ADD COLUMN two_factor_secret BLOB DEFAULT NULL,
ADD COLUMN two_factor_recovery_codes TEXT DEFAULT NULL,
ADD COLUMN two_factor_confirmed_at DATETIME DEFAULT NULL;
