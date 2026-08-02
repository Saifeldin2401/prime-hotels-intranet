-- ============================================================================
-- MIGRATION: fix_high_severity_session_pii_password_oracle_gaps
-- 1. check_password_reuse(p_user_id uuid, p_password text) was anon/PUBLIC
--    executable with no check that p_user_id = auth.uid() -- an anonymous
--    caller could probe an arbitrary user_id + guessed password and learn
--    (via the boolean result) whether it matches one of that user's last 5
--    password hashes. Confirmed dead (its only frontend wrapper,
--    checkPasswordReused() in authSecurityService.ts, has zero callers --
--    ChangePassword.tsx uses the safe single-arg auth.uid()-based overload
--    instead) but still a live, anon-exploitable oracle regardless of
--    current usage. Fix: revoke anon/PUBLIC, require auth.uid() = p_user_id.
--
-- 2. get_task_stats(user_id_param, property_id_param, department_id_param)
--    required no authentication at all -- calling with all-NULL defaults
--    (the only frontend caller actually uses the simpler single-arg
--    overload) returns org-wide task counts to anyone, anon included.
--    Fix: require authentication; if user_id_param supplied, require it
--    equals auth.uid() or caller has an admin/HR role.
--
-- 3. get_pii_access_summary: guard was
--    `IF NOT (v_is_admin OR v_is_target_user OR p_target_user_id IS NULL)`.
--    Since the parameter defaults to NULL, any authenticated non-admin
--    caller invoking it with no argument satisfied `p_target_user_id IS
--    NULL` and received org-wide PII-access analytics intended for admins
--    only. Fix: require v_is_admin whenever p_target_user_id IS NULL.
--
-- 4. get_user_sessions/revoke_all_other_sessions/enforce_session_limit had
--    no authorization check -- any authenticated user could read another
--    user's session list (IP, user agent, session ids) or force-revoke/
--    limit another user's sessions (account-disruption/DoS vector). Fix:
--    add the same self-or-service_role check get_security_summary already
--    uses correctly.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.check_password_reuse(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_password_reuse(uuid, text) FROM anon;

CREATE OR REPLACE FUNCTION public.check_password_reuse(p_user_id uuid, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_password_hash text;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only check your own password history';
  END IF;

  SELECT encrypted_password INTO v_password_hash
  FROM auth.users
  WHERE id = p_user_id;

  RETURN EXISTS (
    SELECT 1
    FROM public.password_history
    WHERE user_id = p_user_id
    AND created_at > now() - interval '90 days'
    AND password_hash = crypt(p_password, password_hash)
    ORDER BY created_at DESC
    LIMIT 5
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_task_stats(uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_task_stats(uuid, uuid, uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.get_task_stats(user_id_param uuid DEFAULT NULL::uuid, property_id_param uuid DEFAULT NULL::uuid, department_id_param uuid DEFAULT NULL::uuid)
 RETURNS TABLE(total_tasks bigint, completed_tasks bigint, pending_tasks bigint, overdue_tasks bigint, high_priority_tasks bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF user_id_param IS NOT NULL AND user_id_param <> auth.uid() AND NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied to another user''s task statistics';
  END IF;

  IF property_id_param IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_properties
      WHERE user_id = auth.uid() AND property_id = property_id_param
    ) AND NOT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    ) THEN
      RAISE EXCEPTION 'Access denied to property statistics scope';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_tasks,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_tasks,
    COUNT(*) FILTER (WHERE status != 'completed')::BIGINT as pending_tasks,
    COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed')::BIGINT as overdue_tasks,
    COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed')::BIGINT as high_priority_tasks
  FROM tasks
  WHERE
    (user_id_param IS NULL OR assigned_to_id = user_id_param)
    AND
    (property_id_param IS NULL OR property_id = property_id_param)
    AND
    (department_id_param IS NULL OR department_id = department_id_param)
    AND
    is_deleted = false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pii_access_summary(p_target_user_id uuid DEFAULT NULL::uuid, p_date_from date DEFAULT ((now() - '30 days'::interval))::date, p_date_to date DEFAULT (now())::date)
 RETURNS TABLE(access_date date, access_count bigint, unique_accessors bigint, top_accessed_fields text[], risk_score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_is_admin boolean; v_is_target_user boolean;
BEGIN
    v_is_target_user := (p_target_user_id = auth.uid());
    SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('corporate_admin','compliance_officer','regional_hr')) INTO v_is_admin;
    IF NOT (v_is_admin OR (v_is_target_user AND p_target_user_id IS NOT NULL)) THEN
        RAISE EXCEPTION 'Access denied to PII access summary';
    END IF;
    RETURN QUERY
    WITH daily_access AS (
        SELECT date(pal.created_at) AS access_day, count(*) AS daily_count,
            count(DISTINCT pal.actor_id) AS daily_accessors,
            array_remove(array_agg(DISTINCT f.field), NULL) AS fields,
            CASE WHEN count(*) > 50 THEN 5 WHEN count(*) > 20 THEN 4 WHEN count(*) > 10 THEN 3 WHEN count(*) > 5 THEN 2 ELSE 1 END +
            CASE WHEN count(DISTINCT pal.actor_id) > 5 THEN 3 WHEN count(DISTINCT pal.actor_id) > 2 THEN 2 ELSE 1 END AS daily_risk
        FROM pii_access_logs_v pal
        LEFT JOIN LATERAL unnest(pal.fields_accessed) AS f(field) ON true
        WHERE pal.created_at::date BETWEEN p_date_from AND p_date_to
          AND (p_target_user_id IS NULL OR pal.target_user_id = p_target_user_id)
        GROUP BY date(pal.created_at))
    SELECT da.access_day, da.daily_count, da.daily_accessors, da.fields, da.daily_risk
    FROM daily_access da ORDER BY da.access_day DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Users can only access their own sessions';
  END IF;

  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'created_at', created_at,
      'last_active_at', last_active_at,
      'ip_address', COALESCE(ip_address, 'Unknown'),
      'user_agent', COALESCE(user_agent, 'Unknown'),
      'is_current', is_current,
      'expires_at', expires_at
    ))
    FROM public.user_sessions
    WHERE user_id = p_user_id
    AND revoked_at IS NULL
    AND expires_at > now()
    ORDER BY last_active_at DESC
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_all_other_sessions(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'Users can only revoke their own sessions';
    END IF;

    UPDATE public.user_sessions SET revoked_at = now(), revoked_reason = 'revoke_all_other'
    WHERE user_id = p_user_id AND is_current = false AND revoked_at IS NULL;
    INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
    VALUES ('security', p_user_id, 'user', p_user_id,
        jsonb_build_object('security_event_type', 'session.revoke_all_other', 'severity', 'info',
            'count', (SELECT count(*) FROM public.user_sessions WHERE user_id = p_user_id AND revoked_at IS NOT NULL)));
    RETURN true;
END; $function$;

CREATE OR REPLACE FUNCTION public.enforce_session_limit(p_user_id uuid, p_max_sessions integer DEFAULT 5)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count integer;
BEGIN
    IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'Users can only manage their own sessions';
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.user_sessions
    WHERE user_id = p_user_id AND revoked_at IS NULL AND expires_at > now();
    IF v_count > p_max_sessions THEN
        UPDATE public.user_sessions SET revoked_at = now(), revoked_reason = 'session_limit_exceeded'
        WHERE id IN (
            SELECT id FROM public.user_sessions
            WHERE user_id = p_user_id AND revoked_at IS NULL AND expires_at > now() AND is_current = false
            ORDER BY last_active_at ASC LIMIT v_count - p_max_sessions + 1);
        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('security', p_user_id, 'user', p_user_id,
            jsonb_build_object('security_event_type', 'session.limit_enforced', 'severity', 'warning',
                'previous_count', v_count, 'max_sessions', p_max_sessions));
    END IF;
    RETURN true;
END; $function$;
