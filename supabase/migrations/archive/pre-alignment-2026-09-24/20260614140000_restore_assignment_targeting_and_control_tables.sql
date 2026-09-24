-- =============================================================================
-- MIGRATION: restore_assignment_targeting_and_control_tables
-- Applied: 2026-06-14
-- Purpose: Repair the admin training-assignment subsystem. The LMS merge reshaped
--          training_assignment_rules (renamed content_type->la_content_type,
--          priority->la_priority, replaced target_type/target_id with
--          assignment_type/user_id) and the baseline consolidation dropped the two
--          user-control tables -- but the assignment frontend (CreateAssignmentDialog,
--          AssignmentManager, learningAssignmentMutations, the module-roster builder,
--          and getMyAssignments) still speaks the original target_type/target_id model.
--          This caused "column training_assignment_rules.target_type does not exist".
--
--          Decision (per product): keep all UI targeting modes (users / departments /
--          everyone / properties). So we RESTORE the columns + tables that model needs
--          rather than rewrite the frontend. This is purely additive -- the separate
--          new-model "assignment rules" page (assignment_type / la_* / learning_assignments_v)
--          is untouched and keeps working.
--
-- Coordinated frontend change (same commit): getMyAssignments reverted to the original
-- old-model query (target_type/target_id + exemptions/overrides), now functional again.
--
-- Rollback: drop the added columns + the two tables; re-add NOT NULL on target_role.
-- =============================================================================

BEGIN;

-- Restore the original assignment targeting columns.
ALTER TABLE public.training_assignment_rules
  ADD COLUMN IF NOT EXISTS target_type  text,
  ADD COLUMN IF NOT EXISTS target_id    text,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS priority     text DEFAULT 'normal';

-- Original design was role-rule-only (target_role NOT NULL); explicit user/department/
-- everyone/property assignments legitimately have no role.
ALTER TABLE public.training_assignment_rules ALTER COLUMN target_role DROP NOT NULL;

-- Recreate the two user-control tables (original schema from archive migration
-- 20260322180000_module_assignment_user_controls).
CREATE TABLE IF NOT EXISTS public.learning_assignment_exemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type public.learning_content_type NOT NULL,
  content_id uuid NOT NULL,
  reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_assignment_exemptions_unique_user_content UNIQUE (user_id, content_type, content_id)
);

CREATE TABLE IF NOT EXISTS public.learning_assignment_user_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type public.learning_content_type NOT NULL,
  content_id uuid NOT NULL,
  due_date timestamptz,
  priority text CHECK (priority IS NULL OR priority = ANY (ARRAY['normal'::text, 'high'::text, 'compliance'::text])),
  instructions text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_assignment_user_overrides_unique_user_content UNIQUE (user_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_assignment_exemptions_content ON public.learning_assignment_exemptions (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignment_exemptions_user ON public.learning_assignment_exemptions (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignment_user_overrides_content ON public.learning_assignment_user_overrides (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignment_user_overrides_user ON public.learning_assignment_user_overrides (user_id);

ALTER TABLE public.learning_assignment_exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_assignment_user_overrides ENABLE ROW LEVEL SECURITY;

-- Users see their own rows; HR/admins manage all. (auth.uid() wrapped per initplan guidance.)
CREATE POLICY learning_assignment_exemptions_select_policy ON public.learning_assignment_exemptions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY learning_assignment_exemptions_manage_policy ON public.learning_assignment_exemptions
  FOR ALL TO authenticated
  USING (public.is_hr_or_admin((SELECT auth.uid())))
  WITH CHECK (public.is_hr_or_admin((SELECT auth.uid())));

CREATE POLICY learning_assignment_user_overrides_select_policy ON public.learning_assignment_user_overrides
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY learning_assignment_user_overrides_manage_policy ON public.learning_assignment_user_overrides
  FOR ALL TO authenticated
  USING (public.is_hr_or_admin((SELECT auth.uid())))
  WITH CHECK (public.is_hr_or_admin((SELECT auth.uid())));

COMMIT;
