DROP TRIGGER IF EXISTS trg_generate_assignment_progress ON public.training_assignment_rules;
CREATE TRIGGER trg_generate_assignment_progress
    AFTER INSERT ON public.training_assignment_rules
    FOR EACH ROW EXECUTE FUNCTION public.generate_assignment_progress();

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
