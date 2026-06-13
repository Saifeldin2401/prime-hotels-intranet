-- ============================================================
-- merge_training_learning_lms
-- ============================================================
-- Absorbs the parallel learning_* LMS tables into training_*:
--
--   learning_assignments  → training_assignment_rules
--                           (new assignment_type discriminator:
--                            'rule' = auto-assigned by role/dept,
--                            'explicit' = manually assigned to user)
--
--   learning_progress     → training_progress
--                           (extra columns copied over)
--
-- Both source tables had 0 rows at migration time.
-- Backward-compat views maintain query compatibility.
-- ============================================================

-- ============================================================
-- STEP 1 – Extend training_assignment_rules
-- ============================================================

-- Discriminator: 'rule' (role/dept auto-rule) vs 'explicit' (user-specific)
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'rule'
  CHECK (assignment_type IN ('rule', 'explicit'));

-- Target user for explicit assignments (learning_assignments.target_id when target_type='user')
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- What content is being assigned (module / quiz / document / etc.)
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS la_content_type TEXT;

-- The content item's UUID
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS content_id UUID;

-- Due date for this assignment
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Window during which assignment is active
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT now();

ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Assignment priority level (normal / high / critical)
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS la_priority TEXT DEFAULT 'normal';

-- Who made the explicit assignment
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);

-- Soft-delete flag
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Optional instructions for the assignee
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Whether the user must acknowledge receipt
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS requires_acknowledgement BOOLEAN DEFAULT false;

-- Whether to send a push/email notification when due
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS notify_on_due BOOLEAN DEFAULT true;

-- Days before due date to send reminders (e.g. {7, 3, 1})
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER[] DEFAULT '{}';

-- ============================================================
-- STEP 2 – Extend training_progress
-- ============================================================

-- Completion percentage 0–100
ALTER TABLE training_progress
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

-- Score as a decimal percentage (for quiz-style content)
ALTER TABLE training_progress
  ADD COLUMN IF NOT EXISTS score_percentage NUMERIC;

-- Whether the user passed the passing threshold
ALTER TABLE training_progress
  ADD COLUMN IF NOT EXISTS passed BOOLEAN;

-- Most recent access timestamp
ALTER TABLE training_progress
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT now();

-- Resume-session pointer
ALTER TABLE training_progress
  ADD COLUMN IF NOT EXISTS last_session_id UUID;

-- Block-level resume pointers
ALTER TABLE training_progress
  ADD COLUMN IF NOT EXISTS last_block_index INTEGER;

ALTER TABLE training_progress
  ADD COLUMN IF NOT EXISTS last_block_id UUID;

-- Cumulative time in seconds
ALTER TABLE training_progress
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0;

-- Alias used in some queries (same semantic as last_accessed_at)
ALTER TABLE training_progress
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- Arbitrary extra data (quiz answers, bookmarks, etc.)
ALTER TABLE training_progress
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Acknowledgement timestamp
ALTER TABLE training_progress
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

-- Content-type label for learning content (module / quiz / document)
ALTER TABLE training_progress
  ADD COLUMN IF NOT EXISTS lp_content_type TEXT;

-- UNIQUE constraint so each (user, training) pair has one progress record
ALTER TABLE training_progress
  DROP CONSTRAINT IF EXISTS training_progress_user_training_unique;
ALTER TABLE training_progress
  ADD CONSTRAINT training_progress_user_training_unique
  UNIQUE (user_id, training_id);

-- ============================================================
-- STEP 3 – Migrate learning_assignments rows → training_assignment_rules
-- (0 rows at migration time; INSERT is a no-op but logically complete)
-- ============================================================

INSERT INTO training_assignment_rules (
  id,
  training_module_id,
  assignment_type,
  user_id,
  la_content_type,
  content_id,
  due_date,
  valid_from,
  expires_at,
  la_priority,
  assigned_by,
  created_by,
  is_active,
  is_deleted,
  instructions,
  requires_acknowledgement,
  notify_on_due,
  reminder_days_before,
  created_at
)
SELECT
  id,
  -- Map content_id to training_module_id when it's a module; otherwise NULL
  CASE WHEN content_type::text = 'module' THEN content_id ELSE NULL END,
  'explicit',                           -- learning_assignments are always explicit
  CASE WHEN target_type::text = 'user'  -- resolve user targets
       THEN target_id::uuid ELSE NULL END,
  content_type::text,                   -- la_content_type
  content_id,
  due_date,
  COALESCE(valid_from, now()),
  expires_at,
  COALESCE(priority, 'normal'),
  assigned_by,
  assigned_by,                          -- created_by mirrors assigned_by
  true,                                 -- is_active
  COALESCE(is_deleted, false),
  instructions,
  COALESCE(requires_acknowledgement, false),
  COALESCE(notify_on_due, true),
  COALESCE(reminder_days_before, '{}'),
  COALESCE(created_at, now())
FROM learning_assignments
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 4 – Migrate learning_progress rows → training_progress
-- (0 rows at migration time; INSERT is a no-op but logically complete)
-- ============================================================

INSERT INTO training_progress (
  id,
  user_id,
  training_id,
  assignment_id,
  status,
  progress_percentage,
  score_percentage,
  passed,
  completed_at,
  last_accessed_at,
  last_session_id,
  last_block_index,
  last_block_id,
  time_spent_seconds,
  last_activity_at,
  metadata,
  acknowledged_at,
  lp_content_type,
  is_deleted,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  COALESCE(training_module_id, content_id),  -- best-effort: use module id or content id
  assignment_id,
  -- Map learning_assignment_status → training_status
  CASE status::text
    WHEN 'assigned'    THEN 'not_started'::training_status
    WHEN 'in_progress' THEN 'in_progress'::training_status
    WHEN 'completed'   THEN 'completed'::training_status
    WHEN 'overdue'     THEN 'expired'::training_status
    WHEN 'excused'     THEN 'completed'::training_status
    ELSE                    'not_started'::training_status
  END,
  COALESCE(progress_percentage, 0),
  score_percentage,
  passed,
  completed_at,
  COALESCE(last_accessed_at, now()),
  last_session_id,
  last_block_index,
  last_block_id,
  COALESCE(time_spent_seconds, 0),
  COALESCE(last_activity_at, now()),
  metadata,
  acknowledged_at,
  content_type::text,
  COALESCE(is_deleted, false),
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM learning_progress
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 5 – Backward-compatible views
-- ============================================================

DROP VIEW IF EXISTS learning_assignments_v;
CREATE VIEW learning_assignments_v WITH (security_invoker = true) AS
SELECT
  id,
  NULL::learning_target_type                      AS target_type,
  COALESCE(user_id::text, '')                     AS target_id,
  la_content_type::learning_content_type          AS content_type,
  content_id,
  due_date,
  valid_from,
  expires_at,
  COALESCE(la_priority, 'normal')                 AS priority,
  assigned_by,
  created_at,
  COALESCE(is_deleted, false)                     AS is_deleted,
  instructions,
  COALESCE(requires_acknowledgement, false)        AS requires_acknowledgement,
  COALESCE(notify_on_due, true)                   AS notify_on_due,
  COALESCE(reminder_days_before, '{}')            AS reminder_days_before
FROM training_assignment_rules
WHERE assignment_type = 'explicit';

COMMENT ON VIEW learning_assignments_v IS
  'Backward-compatible view over training_assignment_rules WHERE assignment_type = ''explicit''. '
  'Replaces the learning_assignments table. Migrate queries to training_assignment_rules directly.';

DROP VIEW IF EXISTS learning_progress_v;
CREATE VIEW learning_progress_v WITH (security_invoker = true) AS
SELECT
  id,
  assignment_id,
  user_id,
  lp_content_type::learning_content_type          AS content_type,
  training_id                                     AS content_id,
  -- Map training_status back to learning_assignment_status
  CASE status::text
    WHEN 'not_started' THEN 'assigned'::learning_assignment_status
    WHEN 'in_progress' THEN 'in_progress'::learning_assignment_status
    WHEN 'completed'   THEN 'completed'::learning_assignment_status
    WHEN 'expired'     THEN 'overdue'::learning_assignment_status
    ELSE                    'assigned'::learning_assignment_status
  END                                             AS status,
  COALESCE(progress_percentage, 0)                AS progress_percentage,
  score_percentage,
  passed,
  completed_at,
  COALESCE(last_accessed_at, now())               AS last_accessed_at,
  last_session_id,
  created_at,
  updated_at,
  training_id                                     AS training_module_id,
  COALESCE(is_deleted, false)                     AS is_deleted,
  last_block_index,
  last_block_id,
  COALESCE(time_spent_seconds, 0)                 AS time_spent_seconds,
  COALESCE(last_activity_at, now())               AS last_activity_at,
  metadata,
  acknowledged_at
FROM training_progress;

COMMENT ON VIEW learning_progress_v IS
  'Backward-compatible view over training_progress. '
  'Replaces the learning_progress table. Migrate queries to training_progress directly.';

-- ============================================================
-- STEP 6 – RLS policies for explicit assignments
-- ============================================================

-- Allow users to see their own explicit assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'training_assignment_rules'
      AND policyname = 'training_assignment_rules_explicit_user_select'
  ) THEN
    CREATE POLICY training_assignment_rules_explicit_user_select
      ON training_assignment_rules
      FOR SELECT TO authenticated
      USING (
        assignment_type = 'explicit'
        AND user_id = (SELECT auth.uid())
      );
  END IF;
END $$;

-- Allow admins/HR to manage explicit assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'training_assignment_rules'
      AND policyname = 'training_assignment_rules_explicit_admin_all'
  ) THEN
    CREATE POLICY training_assignment_rules_explicit_admin_all
      ON training_assignment_rules
      FOR ALL TO authenticated
      USING (
        assignment_type = 'explicit'
        AND (
          has_role((SELECT auth.uid()), 'regional_admin'::app_role)
          OR has_role((SELECT auth.uid()), 'regional_hr'::app_role)
          OR has_role((SELECT auth.uid()), 'property_hr'::app_role)
          OR assigned_by = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        assignment_type = 'explicit'
        AND (
          has_role((SELECT auth.uid()), 'regional_admin'::app_role)
          OR has_role((SELECT auth.uid()), 'regional_hr'::app_role)
          OR has_role((SELECT auth.uid()), 'property_hr'::app_role)
        )
      );
  END IF;
END $$;

-- ============================================================
-- STEP 7 – DROP empty source tables
-- ============================================================

DROP TABLE IF EXISTS learning_assignments CASCADE;
DROP TABLE IF EXISTS learning_progress    CASCADE;

-- ============================================================
-- STEP 8 – Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tar_assignment_type
  ON training_assignment_rules (assignment_type);

CREATE INDEX IF NOT EXISTS idx_tar_user_id
  ON training_assignment_rules (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tar_content_id
  ON training_assignment_rules (content_id)
  WHERE content_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tar_due_date
  ON training_assignment_rules (due_date)
  WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tp_progress_percentage
  ON training_progress (user_id, training_id, progress_percentage);

CREATE INDEX IF NOT EXISTS idx_tp_last_activity
  ON training_progress (last_activity_at)
  WHERE last_activity_at IS NOT NULL;
