-- Real gap found while auditing LMS follow-up: generate_assignment_progress() -- a
-- well-written function that expands a training_assignment_rules row (everyone/department/
-- property/user) into training_progress rows for the whole target audience -- exists but was
-- never attached as a trigger anywhere. So:
--   * A brand-new department-wide rule never creates progress rows for the people already in
--     that department -- they never see the assignment in My Learning at all.
--   * Someone who joins a department (or a property) after a rule already exists for it never
--     gets swept in either -- nothing re-evaluates membership changes.
--
-- This migration: (1) attaches generate_assignment_progress on rule INSERT so new rules reach
-- their existing audience immediately, (2) adds the mirror-image triggers on user_departments /
-- user_properties / profiles so joining a department, joining a property, or being created
-- picks up every rule that already applies, and (3) backfills training_progress for every
-- currently-active rule so today's gap closes retroactively, not just going forward.

-- 1. New rule -> existing audience.
DROP TRIGGER IF EXISTS trg_generate_assignment_progress ON public.training_assignment_rules;
CREATE TRIGGER trg_generate_assignment_progress
    AFTER INSERT ON public.training_assignment_rules
    FOR EACH ROW EXECUTE FUNCTION public.generate_assignment_progress();

-- 2a. User joins a department -> pick up existing department-targeted rules.
CREATE OR REPLACE FUNCTION public.sync_department_training_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
    SELECT NEW.user_id, r.id, r.content_id, 'module', 'not_started'::training_status
    FROM public.training_assignment_rules r
    WHERE r.is_active = true AND r.is_deleted = false AND r.content_type = 'module'
      AND r.target_type = 'department' AND r.target_id = NEW.department_id::text
    ON CONFLICT (user_id, training_id) DO NOTHING;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_department_training_progress ON public.user_departments;
CREATE TRIGGER trg_sync_department_training_progress
    AFTER INSERT ON public.user_departments
    FOR EACH ROW EXECUTE FUNCTION public.sync_department_training_progress();

-- 2b. User joins a property -> pick up existing property-targeted rules.
CREATE OR REPLACE FUNCTION public.sync_property_training_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
    SELECT NEW.user_id, r.id, r.content_id, 'module', 'not_started'::training_status
    FROM public.training_assignment_rules r
    WHERE r.is_active = true AND r.is_deleted = false AND r.content_type = 'module'
      AND r.target_type = 'property' AND r.target_id = NEW.property_id::text
    ON CONFLICT (user_id, training_id) DO NOTHING;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_property_training_progress ON public.user_properties;
CREATE TRIGGER trg_sync_property_training_progress
    AFTER INSERT ON public.user_properties
    FOR EACH ROW EXECUTE FUNCTION public.sync_property_training_progress();

-- 2c. New profile -> pick up existing 'everyone' rules (department/property/user-scoped rules
-- reach a new hire once they're placed into a department/property via 2a/2b, or via the
-- existing on_user_role_assigned -> handle_new_user_training path for role-scoped rules).
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
      AND r.target_type = 'everyone'
    ON CONFLICT (user_id, training_id) DO NOTHING;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_everyone_training_progress ON public.profiles;
CREATE TRIGGER trg_sync_everyone_training_progress
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_everyone_training_progress();

REVOKE EXECUTE ON FUNCTION public.sync_department_training_progress() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_property_training_progress() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_everyone_training_progress() FROM PUBLIC;

-- 3. One-time backfill: every currently-active module rule, expanded to its full target
-- audience, for anyone who doesn't already have a training_progress row for it.
INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
SELECT p.id, r.id, r.content_id, 'module', 'not_started'::training_status
FROM public.training_assignment_rules r
JOIN public.profiles p ON true
WHERE r.is_active = true AND r.is_deleted = false AND r.content_type = 'module' AND r.target_type = 'everyone'
ON CONFLICT (user_id, training_id) DO NOTHING;

INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
SELECT ud.user_id, r.id, r.content_id, 'module', 'not_started'::training_status
FROM public.training_assignment_rules r
JOIN public.user_departments ud ON ud.department_id = r.target_id::uuid
WHERE r.is_active = true AND r.is_deleted = false AND r.content_type = 'module' AND r.target_type = 'department'
ON CONFLICT (user_id, training_id) DO NOTHING;

INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
SELECT up.user_id, r.id, r.content_id, 'module', 'not_started'::training_status
FROM public.training_assignment_rules r
JOIN public.user_properties up ON up.property_id = r.target_id::uuid
WHERE r.is_active = true AND r.is_deleted = false AND r.content_type = 'module' AND r.target_type = 'property'
ON CONFLICT (user_id, training_id) DO NOTHING;

INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
SELECT r.target_id::uuid, r.id, r.content_id, 'module', 'not_started'::training_status
FROM public.training_assignment_rules r
WHERE r.is_active = true AND r.is_deleted = false AND r.content_type = 'module' AND r.target_type = 'user'
ON CONFLICT (user_id, training_id) DO NOTHING;
