BEGIN;
-- Remove the dead "new" assignment model entirely. Verified unused: no frontend code,
-- no functions, and only learning_assignments_v depends on these columns. This collapses
-- training_assignment_rules to a single coherent column set (it serves two row kinds:
-- auto-assign rules via target_role/target_department_id/job_title_id, and explicit
-- assignments via target_type/target_id/content_type/priority).

-- 1. Drop the two new-model RLS policies (they key off assignment_type/user_id).
DROP POLICY IF EXISTS training_assignment_rules_explicit_admin_all   ON public.training_assignment_rules;
DROP POLICY IF EXISTS training_assignment_rules_explicit_user_select ON public.training_assignment_rules;

-- 2. Drop the dead view + dead columns.
DROP VIEW IF EXISTS public.learning_assignments_v;
ALTER TABLE public.training_assignment_rules
  DROP COLUMN IF EXISTS assignment_type,
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS la_content_type,
  DROP COLUMN IF EXISTS la_priority;

-- 3. Replace the removed user-read policy with one that matches the live targeting model,
--    so staff can read assignments/rules that apply to them (My Learning depends on this).
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
