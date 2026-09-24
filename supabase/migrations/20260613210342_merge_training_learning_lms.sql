-- merge_training_learning_lms

-- STEP 1 – Extend training_assignment_rules
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'rule'
  CHECK (assignment_type IN ('rule', 'explicit'));
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS la_content_type TEXT;
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS content_id UUID;
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT now();
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS la_priority TEXT DEFAULT 'normal';
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS requires_acknowledgement BOOLEAN DEFAULT false;
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS notify_on_due BOOLEAN DEFAULT true;
ALTER TABLE training_assignment_rules
  ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER[] DEFAULT '{}';

-- STEP 2 – Extend training_progress
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS score_percentage NUMERIC;
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS passed BOOLEAN;
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS last_session_id UUID;
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS last_block_index INTEGER;
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS last_block_id UUID;
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0;
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS lp_content_type TEXT;

-- UNIQUE constraint (handle pre-existing duplicates by deduplicating first)
DELETE FROM training_progress a
  USING training_progress b
  WHERE a.ctid < b.ctid
    AND a.user_id = b.user_id
    AND a.training_id = b.training_id;

ALTER TABLE training_progress
  DROP CONSTRAINT IF EXISTS training_progress_user_training_unique;
ALTER TABLE training_progress
  ADD CONSTRAINT training_progress_user_training_unique
  UNIQUE (user_id, training_id);

-- STEP 3 – Migrate learning_assignments → training_assignment_rules (0 rows, no-op)
INSERT INTO training_assignment_rules (
  id, training_module_id, assignment_type, user_id, la_content_type, content_id,
  due_date, valid_from, expires_at, la_priority, assigned_by, created_by,
  is_active, is_deleted, instructions, requires_acknowledgement,
  notify_on_due, reminder_days_before, created_at
)
SELECT
  id,
  CASE WHEN content_type::text = 'module' THEN content_id ELSE NULL END,
  'explicit',
  CASE WHEN target_type::text = 'user' THEN target_id::uuid ELSE NULL END,
  content_type::text, content_id, due_date,
  COALESCE(valid_from, now()), expires_at, COALESCE(priority, 'normal'),
  assigned_by, assigned_by, true, COALESCE(is_deleted, false),
  instructions, COALESCE(requires_acknowledgement, false),
  COALESCE(notify_on_due, true), COALESCE(reminder_days_before, '{}'),
  COALESCE(created_at, now())
FROM learning_assignments
ON CONFLICT (id) DO NOTHING;

-- STEP 4 – Migrate learning_progress → training_progress (0 rows, no-op)
INSERT INTO training_progress (
  id, user_id, training_id, assignment_id, status, progress_percentage,
  score_percentage, passed, completed_at, last_accessed_at, last_session_id,
  last_block_index, last_block_id, time_spent_seconds, last_activity_at,
  metadata, acknowledged_at, lp_content_type, is_deleted, created_at, updated_at
)
SELECT
  id, user_id,
  COALESCE(training_module_id, content_id),
  assignment_id,
  CASE status::text
    WHEN 'assigned'    THEN 'not_started'::training_status
    WHEN 'in_progress' THEN 'in_progress'::training_status
    WHEN 'completed'   THEN 'completed'::training_status
    WHEN 'overdue'     THEN 'expired'::training_status
    WHEN 'excused'     THEN 'completed'::training_status
    ELSE                    'not_started'::training_status
  END,
  COALESCE(progress_percentage, 0), score_percentage, passed, completed_at,
  COALESCE(last_accessed_at, now()), last_session_id, last_block_index, last_block_id,
  COALESCE(time_spent_seconds, 0), COALESCE(last_activity_at, now()),
  metadata, acknowledged_at, content_type::text,
  COALESCE(is_deleted, false), COALESCE(created_at, now()), COALESCE(updated_at, now())
FROM learning_progress
ON CONFLICT (id) DO NOTHING;

-- STEP 5 – Backward-compatible views
DROP VIEW IF EXISTS learning_assignments_v;
CREATE VIEW learning_assignments_v WITH (security_invoker = true) AS
SELECT
  id,
  NULL::learning_target_type               AS target_type,
  COALESCE(user_id::text, '')              AS target_id,
  la_content_type::learning_content_type   AS content_type,
  content_id, due_date, valid_from, expires_at,
  COALESCE(la_priority, 'normal')          AS priority,
  assigned_by, created_at,
  COALESCE(is_deleted, false)              AS is_deleted,
  instructions,
  COALESCE(requires_acknowledgement, false) AS requires_acknowledgement,
  COALESCE(notify_on_due, true)            AS notify_on_due,
  COALESCE(reminder_days_before, '{}')     AS reminder_days_before
FROM training_assignment_rules
WHERE assignment_type = 'explicit';

DROP VIEW IF EXISTS learning_progress_v;
CREATE VIEW learning_progress_v WITH (security_invoker = true) AS
SELECT
  id, assignment_id, user_id,
  lp_content_type::learning_content_type   AS content_type,
  training_id                              AS content_id,
  CASE status::text
    WHEN 'not_started' THEN 'assigned'::learning_assignment_status
    WHEN 'in_progress' THEN 'in_progress'::learning_assignment_status
    WHEN 'completed'   THEN 'completed'::learning_assignment_status
    WHEN 'expired'     THEN 'overdue'::learning_assignment_status
    ELSE                    'assigned'::learning_assignment_status
  END                                      AS status,
  COALESCE(progress_percentage, 0)         AS progress_percentage,
  score_percentage, passed, completed_at,
  COALESCE(last_accessed_at, now())        AS last_accessed_at,
  last_session_id, created_at, updated_at,
  training_id                              AS training_module_id,
  COALESCE(is_deleted, false)              AS is_deleted,
  last_block_index, last_block_id,
  COALESCE(time_spent_seconds, 0)          AS time_spent_seconds,
  COALESCE(last_activity_at, now())        AS last_activity_at,
  metadata, acknowledged_at
FROM training_progress;

-- STEP 6 – RLS for explicit assignments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_assignment_rules'
    AND policyname = 'training_assignment_rules_explicit_user_select') THEN
    CREATE POLICY training_assignment_rules_explicit_user_select
      ON training_assignment_rules FOR SELECT TO authenticated
      USING (assignment_type = 'explicit' AND user_id = (SELECT auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_assignment_rules'
    AND policyname = 'training_assignment_rules_explicit_admin_all') THEN
    CREATE POLICY training_assignment_rules_explicit_admin_all
      ON training_assignment_rules FOR ALL TO authenticated
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

-- STEP 7 – DROP empty source tables
DROP TABLE IF EXISTS learning_assignments CASCADE;
DROP TABLE IF EXISTS learning_progress    CASCADE;

-- STEP 8 – Indexes
CREATE INDEX IF NOT EXISTS idx_tar_assignment_type ON training_assignment_rules (assignment_type);
CREATE INDEX IF NOT EXISTS idx_tar_user_id ON training_assignment_rules (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tar_content_id ON training_assignment_rules (content_id) WHERE content_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tar_due_date ON training_assignment_rules (due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tp_progress ON training_progress (user_id, training_id, progress_percentage);
CREATE INDEX IF NOT EXISTS idx_tp_last_activity ON training_progress (last_activity_at) WHERE last_activity_at IS NOT NULL;
