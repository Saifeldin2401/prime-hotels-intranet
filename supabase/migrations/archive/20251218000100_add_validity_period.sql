-- Add validity_period_days to training_modules
ALTER TABLE training_modules
ADD COLUMN validity_period_days INTEGER NULL;

COMMENT ON COLUMN training_modules.validity_period_days IS 'Number of days the certificate remains valid after completion. NULL means it never expires.';
