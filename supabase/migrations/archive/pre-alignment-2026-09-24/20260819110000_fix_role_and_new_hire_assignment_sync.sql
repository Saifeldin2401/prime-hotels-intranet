-- Two assignment-targeting gaps found in an end-to-end audit:
--
-- 1. Role-based auto-assign rules (training_assignment_rules.target_role,
--    written by TrainingAssignmentRules.tsx) never retroactively backfill
--    CURRENT holders of that role when the rule is created. The only
--    existing mechanism (handle_new_user_training(), fired on user_roles
--    INSERT) only catches people who are GRANTED the role AFTER the rule
--    already exists - it expands into a per-user training_assignment_rules
--    row, which is how the rest of the sync pipeline picks it up. This adds
--    the missing "backfill people who already hold the role" path via the
--    consolidated target_type='role' column, without touching target_role
--    (handle_new_user_training still depends on it for future grants).
--
-- 2. 'new_hire' rules (created by AssignTrainingWizardModal.tsx) have no
--    sync mechanism at all - sync_everyone_training_progress() only matches
--    target_type='everyone'. Extended to also match 'new_hire', which is
--    the correct semantics anyway: both fire only on a NEW profiles row
--    (a newly joined employee), the difference being 'everyone' also
--    backfills existing staff at rule-creation time (via
--    generate_assignment_progress()) while 'new_hire' deliberately does not.

CREATE OR REPLACE FUNCTION public.generate_assignment_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.content_type = 'module' AND NEW.target_type = 'everyone' THEN
    INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
    SELECT id, NEW.id, NEW.content_id, 'module', 'not_started'::training_status FROM public.profiles
    ON CONFLICT (user_id, training_id) DO UPDATE SET assignment_id = EXCLUDED.assignment_id, updated_at = NOW();
  ELSIF NEW.content_type = 'module' AND NEW.target_type = 'department' THEN
    INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
    SELECT user_id, NEW.id, NEW.content_id, 'module', 'not_started'::training_status
    FROM public.user_departments WHERE department_id = NEW.target_id::uuid
    ON CONFLICT (user_id, training_id) DO UPDATE SET assignment_id = EXCLUDED.assignment_id, updated_at = NOW();
  ELSIF NEW.content_type = 'module' AND NEW.target_type = 'property' THEN
    INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
    SELECT user_id, NEW.id, NEW.content_id, 'module', 'not_started'::training_status
    FROM public.user_properties WHERE property_id = NEW.target_id::uuid
    ON CONFLICT (user_id, training_id) DO UPDATE SET assignment_id = EXCLUDED.assignment_id, updated_at = NOW();
  ELSIF NEW.content_type = 'module' AND NEW.target_type = 'user' THEN
    INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
    VALUES (NEW.target_id::uuid, NEW.id, NEW.content_id, 'module', 'not_started'::training_status)
    ON CONFLICT (user_id, training_id) DO UPDATE SET assignment_id = EXCLUDED.assignment_id, updated_at = NOW();
  ELSIF NEW.content_type = 'module' AND NEW.target_type = 'role' THEN
    INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
    SELECT ur.user_id, NEW.id, NEW.content_id, 'module', 'not_started'::training_status
    FROM public.user_roles ur WHERE ur.role::text = NEW.target_id
    ON CONFLICT (user_id, training_id) DO UPDATE SET assignment_id = EXCLUDED.assignment_id, updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_everyone_training_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
    SELECT NEW.id, r.id, r.content_id, 'module', 'not_started'::training_status
    FROM public.training_assignment_rules r
    WHERE r.is_active = true AND r.is_deleted = false AND r.content_type = 'module'
      AND r.target_type IN ('everyone', 'new_hire')
    ON CONFLICT (user_id, training_id) DO NOTHING;
    RETURN NEW;
END;
$function$;
