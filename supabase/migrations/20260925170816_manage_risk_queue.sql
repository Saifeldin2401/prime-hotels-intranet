-- Manage > Risk queue: the individual items behind "what needs attention",
-- with hotel and department so managers can drill from property to person.
-- Read-only; gated exactly like get_department_compliance.
CREATE OR REPLACE FUNCTION public.get_risk_queue(p_org_id uuid)
RETURNS TABLE(
  kind text, user_id uuid, person_name text,
  hotel_id uuid, hotel_name text, department_id uuid, department_name text,
  item_id uuid, item_title text, due_date timestamptz, days_overdue integer, score numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.tenant_can(p_org_id, 'reports.view') OR public.tenant_can(p_org_id, 'assignment.manage')) THEN
    RAISE EXCEPTION 'You are not allowed to view training risk for this organization'
      USING ERRCODE = '42501', HINT = 'REPORTS_NOT_ALLOWED';
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT DISTINCT ON (m.user_id) m.user_id, m.hotel_id, m.department_id
      FROM public.organization_memberships m
     WHERE m.organization_id = p_org_id AND m.is_active
     ORDER BY m.user_id, m.is_primary DESC
  ),
  overdue AS (
    SELECT t.user_id, t.training_id, min(t.due_date) AS due_date
      FROM public._module_assignment_targets(ARRAY[p_org_id]) t
     WHERE t.due_date IS NOT NULL AND t.due_date < now()
     GROUP BY t.user_id, t.training_id
  ),
  overdue_open AS (
    SELECT o.* FROM overdue o
     WHERE NOT EXISTS (
       SELECT 1 FROM public.training_progress tp
        WHERE tp.user_id = o.user_id AND tp.training_id = o.training_id
          AND tp.lp_content_type = 'module' AND tp.status = 'completed' AND tp.passed IS TRUE
          AND COALESCE(tp.is_deleted, false) = false)
  ),
  failed AS (
    SELECT DISTINCT ON (tp.user_id, tp.training_id) tp.user_id, tp.training_id, tp.score_percentage, tp.completed_at
      FROM public.training_progress tp
     WHERE tp.organization_id = p_org_id AND tp.lp_content_type = 'quiz'
       AND tp.passed IS FALSE AND COALESCE(tp.is_deleted, false) = false
       AND NOT EXISTS (SELECT 1 FROM public.training_progress ok
                        WHERE ok.user_id = tp.user_id AND ok.training_id = tp.training_id
                          AND ok.lp_content_type = 'quiz' AND ok.passed IS TRUE
                          AND COALESCE(ok.is_deleted, false) = false)
     ORDER BY tp.user_id, tp.training_id, tp.completed_at DESC NULLS LAST
  )
  SELECT 'overdue'::text, oo.user_id, pr.full_name, mb.hotel_id, h.name, mb.department_id, d.name,
         oo.training_id, c.title, oo.due_date, (now()::date - oo.due_date::date)::integer, NULL::numeric
    FROM overdue_open oo
    JOIN members mb ON mb.user_id = oo.user_id
    LEFT JOIN public.profiles pr ON pr.id = oo.user_id
    LEFT JOIN public.hotels h ON h.id = mb.hotel_id
    LEFT JOIN public.departments d ON d.id = mb.department_id
    LEFT JOIN public.courses c ON c.id = oo.training_id
  UNION ALL
  SELECT 'failed_quiz', f.user_id, pr.full_name, mb.hotel_id, h.name, mb.department_id, d.name,
         f.training_id, q.title, f.completed_at, NULL, f.score_percentage
    FROM failed f
    JOIN members mb ON mb.user_id = f.user_id
    LEFT JOIN public.profiles pr ON pr.id = f.user_id
    LEFT JOIN public.hotels h ON h.id = mb.hotel_id
    LEFT JOIN public.departments d ON d.id = mb.department_id
    LEFT JOIN public.quizzes q ON q.id = f.training_id
  UNION ALL
  SELECT 'expiring_certificate', ce.user_id, pr.full_name, mb.hotel_id, h.name, mb.department_id, d.name,
         ce.id, ce.title::text, ce.expiry_date, (now()::date - ce.expiry_date::date)::integer, NULL
    FROM public.certificates ce
    JOIN members mb ON mb.user_id = ce.user_id
    LEFT JOIN public.profiles pr ON pr.id = ce.user_id
    LEFT JOIN public.hotels h ON h.id = mb.hotel_id
    LEFT JOIN public.departments d ON d.id = mb.department_id
   WHERE ce.organization_id = p_org_id
     AND ce.expiry_date IS NOT NULL AND ce.expiry_date < now() + interval '30 days'
     AND lower(COALESCE(ce.status, '')) NOT IN ('revoked', 'superseded');
END;
$function$;

REVOKE ALL ON FUNCTION public.get_risk_queue(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_risk_queue(uuid) TO authenticated;
