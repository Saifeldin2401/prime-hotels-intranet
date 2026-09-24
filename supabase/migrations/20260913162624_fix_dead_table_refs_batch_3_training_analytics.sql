
CREATE OR REPLACE FUNCTION public.get_expiring_certificates(p_within_days integer DEFAULT 90, p_department_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(certificate_id uuid, user_id uuid, recipient_name text, title text, training_module_id uuid, expiry_date timestamp with time zone, days_until_expiry integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        c.id, c.user_id, c.recipient_name::text, c.title::text, c.training_module_id, c.expiry_date,
        (extract(day FROM c.expiry_date - now()))::integer
    FROM public.certificates c
    WHERE c.status = 'active'
      AND c.expiry_date IS NOT NULL
      AND c.expiry_date <= now() + make_interval(days => p_within_days)
      AND (p_department_id IS NULL OR EXISTS (
          SELECT 1 FROM public.organization_memberships ud WHERE ud.user_id = c.user_id AND ud.is_active = true AND ud.department_id = p_department_id))
      AND (p_property_id IS NULL OR EXISTS (
          SELECT 1 FROM public.organization_memberships up WHERE up.user_id = c.user_id AND up.is_active = true AND up.hotel_id = p_property_id))
      AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
      )
    ORDER BY c.expiry_date ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_skills_matrix(p_department_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid, p_my_team_only boolean DEFAULT false)
 RETURNS TABLE(user_id uuid, user_name text, department_name text, skill_id uuid, skill_name text, skill_category text, proficiency_level integer, verified boolean, has_skill boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH scoped_users AS (
        SELECT DISTINCT ON (p.id)
            p.id, p.full_name, d.name AS department_name
        FROM public.profiles p
        LEFT JOIN public.organization_memberships ud ON ud.user_id = p.id AND ud.is_active = true
        LEFT JOIN public.departments d ON d.id = ud.department_id
        WHERE p.is_active = true
          AND (p_department_id IS NULL OR ud.department_id = p_department_id)
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.organization_memberships up WHERE up.user_id = p.id AND up.is_active = true AND up.hotel_id = p_property_id))
          AND (
              p_my_team_only = true
              OR EXISTS (
                  SELECT 1 FROM public.user_roles ur
                  WHERE ur.user_id = auth.uid()
                    AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
              )
          )
          AND (p_my_team_only = false OR EXISTS (
              SELECT 1 FROM public.organization_memberships ud_mt
              JOIN public.departments d_mt ON d_mt.id = ud_mt.department_id
              WHERE ud_mt.user_id = p.id AND ud_mt.is_active = true AND d_mt.manager_id = auth.uid()))
        ORDER BY p.id, ud.department_id NULLS LAST
    )
    SELECT
        su.id, su.full_name, su.department_name, s.id, s.name, s.category,
        us.proficiency_level, us.verified, (us.id IS NOT NULL) AS has_skill
    FROM scoped_users su
    CROSS JOIN public.skills s
    LEFT JOIN public.user_skills us ON us.user_id = su.id AND us.skill_id = s.id
    ORDER BY su.full_name, s.category, s.name;
$function$;

CREATE OR REPLACE FUNCTION public.get_training_completion_trend(p_weeks integer DEFAULT 12, p_department_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid, p_my_team_only boolean DEFAULT false)
 RETURNS TABLE(week_start date, completed_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH weeks AS (
        SELECT generate_series(
            date_trunc('week', now() - ((p_weeks - 1) || ' weeks')::interval),
            date_trunc('week', now()),
            interval '1 week'
        )::date AS week_start
    ),
    scoped_completions AS (
        SELECT tp.completed_at
        FROM public.training_progress tp
        WHERE tp.lp_content_type = 'module'
          AND tp.is_deleted = false
          AND tp.status = 'completed'
          AND tp.completed_at >= now() - (p_weeks || ' weeks')::interval
          AND (p_department_id IS NULL OR EXISTS (
              SELECT 1 FROM public.organization_memberships ud WHERE ud.user_id = tp.user_id AND ud.is_active = true AND ud.department_id = p_department_id))
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.organization_memberships up WHERE up.user_id = tp.user_id AND up.is_active = true AND up.hotel_id = p_property_id))
          AND (p_my_team_only = false OR EXISTS (
              SELECT 1 FROM public.organization_memberships ud_mt
              JOIN public.departments d_mt ON d_mt.id = ud_mt.department_id
              WHERE ud_mt.user_id = tp.user_id AND ud_mt.is_active = true AND d_mt.manager_id = auth.uid()))
          AND (
              p_my_team_only = true
              OR EXISTS (
                  SELECT 1 FROM public.user_roles ur
                  WHERE ur.user_id = auth.uid()
                    AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
              )
          )
    )
    SELECT w.week_start, count(sc.completed_at) AS completed_count
    FROM weeks w
    LEFT JOIN scoped_completions sc ON date_trunc('week', sc.completed_at)::date = w.week_start
    GROUP BY w.week_start
    ORDER BY w.week_start;
$function$;
