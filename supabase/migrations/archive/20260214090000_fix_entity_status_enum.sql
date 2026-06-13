-- Ensure entity_status enum exists and includes all values used by the app.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_status') THEN
    CREATE TYPE entity_status AS ENUM (
      'draft',
      'pending',
      'submitted',
      'approved',
      'rejected',
      'todo',
      'open',
      'in_progress',
      'on_hold',
      'review',
      'pending_parts',
      'completed',
      'cancelled',
      'archived',
      'published',
      'closed',
      'filled',
      'active',
      'inactive'
    );
  END IF;
END $$;

-- Add any missing enum values (idempotent for existing types).
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'todo';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'open';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'on_hold';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'pending_parts';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'published';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'closed';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'filled';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE entity_status ADD VALUE IF NOT EXISTS 'inactive';
