-- =============================================================================
-- MIGRATION: consolidate_assignment_model_drop_dead_columns
-- Applied: 2026-06-14
-- Purpose: Collapse training_assignment_rules onto a SINGLE coherent model by
--          removing the dead "new" model left behind by the LMS merge.
--
--          Verified unused before dropping: no frontend code reads assignment_type /
--          user_id / la_content_type / la_priority / learning_assignments_v (the only
--          grep hit was an unrelated i18n key), and no DB function references them;
--          only learning_assignments_v depended on the columns.
--
--          The table legitimately serves TWO row kinds, both on the surviving columns:
--            - auto-assign rules:    target_role / target_department_id / job_title_id /
--                                    training_module_id / is_active   (TrainingAssignmentRules page)
--            - explicit assignments: target_type / target_id / content_type / content_id /
--                                    priority / due_date / ...        (assignment dialog + My Learning)
--
-- Rollback: re-add the columns + view and the two explicit_* policies (all were 0-row).
-- =============================================================================

BEGIN;

-- 1. Drop the new-model RLS policies (they key off assignment_type / user_id).
DROP POLICY IF EXISTS training_assignment_rules_explicit_admin_all   ON public.training_assignment_rules;
DROP POLICY IF EXISTS training_assignment_rules_explicit_user_select ON public.training_assignment_rules;

-- 2. Drop the dead view + dead columns.
DROP VIEW IF EXISTS public.learning_assignments_v;
ALTER TABLE public.training_assignment_rules
  DROP COLUMN IF EXISTS assignment_type,
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS la_content_type,
  DROP COLUMN IF EXISTS la_priority;

-- 3. Replace the removed user-read policy with one matching the live targeting model,
--    so staff can read assignments/rules that apply to them (My Learning depends on this;
--    the remaining admin SELECT policy alone would hide everything from regular staff).
CREATE POLICY training_assignment_rules_user_select
  ON public.training_assignment_rules
  FOR SELECT TO authenticated
  USING (
    (target_type = 'user' AND target_id = (SELECT auth.uid())::text)
    OR target_type = 'everyone'
    OR (target_type = 'department' AND target_id IN (SELECT department_id::text FROM public.user_departments WHERE user_id = (SELECT auth.uid())))
    OR (target_type = 'property' AND target_id IN (SELECT property_id::text FROM public.user_properties WHERE user_id = (SELECT auth.uid())))
    OR (target_type = 'role' AND target_id IN (SELECT role::text FROM public.user_roles WHERE user_id = (SELECT auth.uid())))
    OR (target_role IS NOT NULL AND target_role IN (SELECT role::text FROM public.user_roles WHERE user_id = (SELECT auth.uid())))
  );

COMMIT;