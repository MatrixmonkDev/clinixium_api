-- Remove old VARCHAR columns from physicians table
ALTER TABLE physicians
DROP COLUMN phone_country_code,
DROP COLUMN timezone;
