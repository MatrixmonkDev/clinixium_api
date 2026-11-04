-- Add country_code_id and timezone_id to physicians table
ALTER TABLE physicians
ADD COLUMN country_code_id INT NULL AFTER phone_number,
ADD COLUMN timezone_id INT NULL AFTER country_code_id,
ADD INDEX idx_country_code_id (country_code_id),
ADD INDEX idx_timezone_id (timezone_id);

-- Add foreign key constraints
ALTER TABLE physicians
ADD CONSTRAINT fk_country_code FOREIGN KEY (country_code_id) REFERENCES country_codes(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_timezone FOREIGN KEY (timezone_id) REFERENCES timezones(id) ON DELETE SET NULL;
