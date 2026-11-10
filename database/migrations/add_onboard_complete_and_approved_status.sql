-- Add is_onboard_complete and is_approved fields to physicians table
-- These fields track the physician's onboarding and approval status separately

ALTER TABLE physicians
ADD COLUMN is_onboard_complete TINYINT(1) DEFAULT 0 COMMENT '1 if physician has completed all onboarding steps, 0 otherwise',
ADD COLUMN is_approved TINYINT(1) DEFAULT 0 COMMENT '1 if physician has been approved by admin, 0 otherwise';
