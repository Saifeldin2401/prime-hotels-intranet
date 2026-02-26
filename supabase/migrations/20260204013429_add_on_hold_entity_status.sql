-- Add 'on_hold' and 'active', 'inactive' to entity_status enum
-- These are needed for task, job posting, and profile statuses

ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'on_hold';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'inactive';;
