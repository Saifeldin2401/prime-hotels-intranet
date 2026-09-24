-- SEC-08 (continued): self-or-admin guards on four more SECURITY DEFINER RPCs that trusted a
-- caller-supplied target user id (or, for get_task_completion_metrics, silently defaulted to an
-- org-wide aggregate when omitted) with no authorization check.

CREATE OR REPLACE FUNCTION public.get_vacation_balance(user_uuid uuid, year_filter integer DEFAULT NULL::integer)
 RETURNS TABLE(total_days integer, used_days numeric, pending_days numeric, remaining_days numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    target_year INTEGER := COALESCE(year_filter, EXTRACT(YEAR FROM CURRENT_DATE));
BEGIN
    IF user_uuid IS DISTINCT FROM (select auth.uid()) AND NOT public.is_hr_or_admin((select auth.uid())) THEN
        RAISE EXCEPTION 'Unauthorized: can only view your own vacation balance';
    END IF;

    RETURN QUERY
    SELECT
        vb.total_days,
        vb.used_days,
        vb.pending_days,
        (vb.total_days + vb.carried_over - vb.used_days - vb.pending_days)::DECIMAL as remaining_days
    FROM user_vacation_balance vb
    WHERE vb.user_id = user_uuid AND vb.year = target_year;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_pins_with_details(p_user_id uuid)
 RETURNS TABLE(pin_id uuid, item_type character varying, item_id uuid, pinned_at timestamp with time zone, display_order integer, title text, description text, url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM (select auth.uid()) AND NOT public.is_hr_or_admin((select auth.uid())) THEN
    RAISE EXCEPTION 'Unauthorized: can only view your own pins';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS pin_id,
    p.item_type,
    p.item_id,
    p.pinned_at,
    p.display_order,
    COALESCE(
      (SELECT d.title FROM documents d WHERE d.id = p.item_id AND p.item_type IN ('document', 'sop')),
      (SELECT tm.title FROM training_modules tm WHERE tm.id = p.item_id AND p.item_type = 'training'),
      (SELECT t.title FROM tasks t WHERE t.id = p.item_id AND p.item_type = 'task'),
      (SELECT a.title FROM announcements a WHERE a.id = p.item_id AND p.item_type = 'announcement'),
      (SELECT d.title FROM documents d WHERE d.id = p.item_id AND p.item_type = 'knowledge'),
      'Unknown Item'
    ) AS title,
    COALESCE(
      (SELECT d.description FROM documents d WHERE d.id = p.item_id AND p.item_type IN ('document', 'sop')),
      (SELECT tm.description FROM training_modules tm WHERE tm.id = p.item_id AND p.item_type = 'training'),
      (SELECT t.description FROM tasks t WHERE t.id = p.item_id AND p.item_type = 'task'),
      (SELECT LEFT(a.content, 100) FROM announcements a WHERE a.id = p.item_id AND p.item_type = 'announcement'),
      ''
    ) AS description,
    CASE p.item_type
      WHEN 'document' THEN '/documents/' || p.item_id
      WHEN 'sop' THEN '/sop/' || p.item_id
      WHEN 'training' THEN '/learning/training/' || p.item_id
      WHEN 'task' THEN '/tasks/' || p.item_id
      WHEN 'announcement' THEN '/announcements/' || p.item_id
      WHEN 'knowledge' THEN '/knowledge/' || p.item_id
      ELSE '/'
    END AS url
  FROM user_pins p
  WHERE p.user_id = p_user_id
  ORDER BY p.display_order ASC, p.pinned_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_next_shift(user_uuid uuid)
 RETURNS TABLE(shift_id uuid, shift_date date, start_time time without time zone, end_time time without time zone, department_name text, property_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF user_uuid IS DISTINCT FROM (select auth.uid()) AND NOT public.is_hr_or_admin((select auth.uid())) THEN
        RAISE EXCEPTION 'Unauthorized: can only view your own shift schedule';
    END IF;

    RETURN QUERY
    SELECT
        s.id,
        s.start_time::date,
        s.start_time::time,
        s.end_time::time,
        d.name,
        p.name
    FROM shifts s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN properties p ON s.property_id = p.id
    WHERE s.user_id = user_uuid
      AND s.start_time::date >= CURRENT_DATE
      AND s.status IN ('scheduled', 'confirmed')
    ORDER BY s.start_time
    LIMIT 1;
END;
$function$;

-- get_task_completion_metrics has zero frontend callers but is reachable directly via
-- /rest/v1/rpc/get_task_completion_metrics. With p_user_id omitted (its default is NULL) it
-- returned an org-wide task completion aggregate to any authenticated caller; with p_user_id
-- supplied it returned any other user's personal metrics. Restrict the org-wide aggregate to
-- HR/admin and the per-user case to self-or-admin.
CREATE OR REPLACE FUNCTION public.get_task_completion_metrics(p_user_id uuid DEFAULT NULL::uuid, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(total_tasks bigint, completed_tasks bigint, pending_tasks bigint, in_progress_tasks bigint, completion_rate numeric, avg_completion_time_hours numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
    IF p_user_id IS NULL THEN
        IF NOT public.is_hr_or_admin((select auth.uid())) THEN
            RAISE EXCEPTION 'Unauthorized: organization-wide task metrics require HR/admin access';
        END IF;
    ELSIF p_user_id IS DISTINCT FROM (select auth.uid()) AND NOT public.is_hr_or_admin((select auth.uid())) THEN
        RAISE EXCEPTION 'Unauthorized: can only view your own task metrics';
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        CASE
            WHEN COUNT(*) > 0 THEN
                ROUND(COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*) * 100, 2)
            ELSE 0
        END as completion_rate,
        CASE
            WHEN COUNT(*) FILTER (WHERE status = 'completed') > 0 THEN
                ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600), 2)
            ELSE NULL
        END as avg_completion_time_hours
    FROM tasks
    WHERE
        (p_user_id IS NULL OR created_by = p_user_id)
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        AND is_deleted = false;
END;
$function$;
