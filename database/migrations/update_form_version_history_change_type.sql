-- Add new change_type values to form_version_history table
-- This allows tracking of approval workflow in version history

ALTER TABLE form_version_history 
MODIFY COLUMN change_type ENUM('created', 'updated', 'archived', 'restored', 'approved', 'rejected', 'corrections_requested') NOT NULL;
