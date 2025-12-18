-- Migration: Unify Status Enums
-- Description: Creates a superset enum 'entity_status' and consolidates status columns

-- 1. Create the Superset Enum
CREATE TYPE entity_status AS ENUM (
    'draft',
    'pending',
    'submitted',
    'approved',
    'rejected',
    'todo',
    'open',
    'in_progress',
    'review',
    'pending_parts',
    'completed',
    'cancelled',
    'archived',
    'published'
);

-- 2. Alter Tables to use the new Enum
-- We use a USING clause to cast the old text/enum to the new enum. 
-- Since the new enum is a superset, direct casting usually works if the values match.
-- If values don't match, we map them.

-- Tasks
-- Old: task_status ('todo', 'in_progress', 'review', 'completed', 'cancelled')
-- New: entity_status (includes all these)
ALTER TABLE tasks 
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE entity_status USING status::text::entity_status,
    ALTER COLUMN status SET DEFAULT 'todo'::entity_status;

-- Maintenance Tickets
-- Old: maintenance_ticket_status ('open', 'in_progress', 'pending_parts', 'completed', 'cancelled')
-- New: entity_status (includes all these)
ALTER TABLE maintenance_tickets
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE entity_status USING status::text::entity_status,
    ALTER COLUMN status SET DEFAULT 'open'::entity_status;

-- Leave Requests
-- Old: leave_request_status ('pending', 'approved', 'rejected', 'cancelled')
-- New: entity_status (includes all these)
ALTER TABLE leave_requests
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE entity_status USING status::text::entity_status,
    ALTER COLUMN status SET DEFAULT 'pending'::entity_status;

-- Job Postings
-- Old: text check constraint ('draft', 'open', 'closed', 'filled', 'cancelled')
-- 'closed' and 'filled' are NOT in our superset yet. Let's add them or map them.
-- Mapping 'closed' -> 'archived'? 'filled' -> 'completed'?
-- Or just add them to the enum. Let's add them.
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'closed';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'filled';

ALTER TABLE job_postings
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE entity_status USING status::text::entity_status,
    ALTER COLUMN status SET DEFAULT 'draft'::entity_status;

-- Drop old Enums to clean up
DROP TYPE IF EXISTS task_status;
DROP TYPE IF EXISTS maintenance_ticket_status;
DROP TYPE IF EXISTS leave_request_status;
