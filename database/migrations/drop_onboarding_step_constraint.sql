-- Drop the onboarding_step constraint that is causing issues
-- This constraint was likely created with values 0-6, but we need to support value 6 for completion

ALTER TABLE physicians DROP CHECK chk_physicians_onboarding_step;
