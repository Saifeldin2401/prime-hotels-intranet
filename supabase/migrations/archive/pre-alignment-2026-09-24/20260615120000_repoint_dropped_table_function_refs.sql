-- ============================================================================
-- Repoint 13 functions off dropped tables onto the consolidated model.
--
-- The learning_assignments -> training_assignment_rules and
-- learning_progress -> training_progress (exposed as learning_progress_v) and
-- pii_access_logs -> system_events (exposed as pii_access_logs_v) consolidation
-- was completed in the app code but these server-side functions still referenced
-- the dropped tables. Two are LIVE triggers that broke role/department assignment.
--
-- No schema changes — pure function rewrites. Per-user training assignments are
-- written to training_assignment_rules (target_type='user'); progress lives in
-- training_progress. PII reads use pii_access_logs_v; PII writes use system_events.
-- ============================================================================

-- ---------- PII: log_pii_access (write -> system_events) --------------------
-- 3-arg signature kept (called positionally by get_employee_private_profile).
CREATE OR REPLACE FUNCTION public.log_pii_access(p_target_user_id uuid, p_fields_accessed text[], p_reason text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
  INSERT INTO public.system_events(event_type, actor_id, entity_type, entity_id, metadata)
  VALUES ('pii_access', auth.uid(), 'user', p_target_user_id,
    jsonb_build_object('fields_accessed', to_jsonb(p_fields_accessed), 'reason', p_reason,
      'resource_type','profile','resource_id',p_target_user_id,'access_type','read'));
END;
$fn$;

-- Replace the old mismatched 6-arg overload with one matching the frontend's named params
-- (src/hooks/usePIIAudit.ts -> logPIIAccess).
DROP FUNCTION IF EXISTS public.log_pii_access(uuid, text[], text, text, uuid, text);
CREATE OR REPLACE FUNCTION public.log_pii_access(
  p_user_id uuid, p_resource_type text DEFAULT 'profile', p_resource_id text DEFAULT NULL,
  p_access_type text DEFAULT 'read', p_pii_fields text[] DEFAULT '{}', p_justification text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
  INSERT INTO public.system_events(event_type, actor_id, entity_type, entity_id, metadata)
  VALUES ('pii_access', auth.uid(), 'user', p_user_id,
    jsonb_build_object('fields_accessed', to_jsonb(p_pii_fields), 'reason', p_justification,
      'resource_type', p_resource_type, 'resource_id', p_resource_id, 'access_type', p_access_type));
END;
$fn$;

-- ---------- PII readers (read -> pii_access_logs_v, with column remap) -------
CREATE OR REPLACE FUNCTION public.detect_pii_access_anomalies(p_lookback_days integer DEFAULT 7, p_threshold_multiplier numeric DEFAULT 3.0)
 RETURNS TABLE(anomaly_type text, user_id uuid, user_name text, details jsonb, severity text, detected_at timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v_avg_daily_access numeric; v_stddev_daily_access numeric;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('corporate_admin','compliance_officer')) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    SELECT avg(daily_count), COALESCE(stddev(daily_count), 0)
    INTO v_avg_daily_access, v_stddev_daily_access
    FROM (SELECT date(created_at) AS day, count(*) AS daily_count
          FROM pii_access_logs_v
          WHERE created_at > now() - (p_lookback_days * 2 || ' days')::interval
          GROUP BY date(created_at)) daily_stats;
    RETURN QUERY
    SELECT 'high_volume'::text, pal.actor_id, p.full_name,
        jsonb_build_object('access_count', count(*),
            'date_range', jsonb_build_object('from', min(pal.created_at)::date, 'to', max(pal.created_at)::date),
            'unique_targets', count(DISTINCT pal.target_user_id), 'avg_baseline', v_avg_daily_access),
        CASE WHEN count(*) > (v_avg_daily_access + (v_stddev_daily_access * p_threshold_multiplier)) THEN 'high'
             WHEN count(*) > (v_avg_daily_access + (v_stddev_daily_access * (p_threshold_multiplier / 2))) THEN 'medium'
             ELSE 'low' END, now()
    FROM pii_access_logs_v pal LEFT JOIN profiles p ON p.id = pal.actor_id
    WHERE pal.created_at > now() - (p_lookback_days || ' days')::interval
    GROUP BY pal.actor_id, p.full_name
    HAVING count(*) > (v_avg_daily_access + (v_stddev_daily_access * 2))
    UNION ALL
    SELECT 'off_hours_access'::text, pal.actor_id, p.full_name,
        jsonb_build_object('off_hours_count', count(*), 'access_times', array_agg(distinct extract(hour from pal.created_at))),
        'medium'::text, now()
    FROM pii_access_logs_v pal LEFT JOIN profiles p ON p.id = pal.actor_id
    WHERE pal.created_at > now() - (p_lookback_days || ' days')::interval
      AND extract(hour from pal.created_at) NOT BETWEEN 8 AND 18
    GROUP BY pal.actor_id, p.full_name HAVING count(*) > 5
    UNION ALL
    SELECT 'bulk_access_pattern'::text, pal.actor_id, p.full_name,
        jsonb_build_object('records_accessed', count(*), 'time_window_minutes', 60), 'high'::text, now()
    FROM pii_access_logs_v pal LEFT JOIN profiles p ON p.id = pal.actor_id
    WHERE pal.created_at > now() - interval '1 hour'
    GROUP BY pal.actor_id, p.full_name HAVING count(*) > 20;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.get_pii_access_summary(p_target_user_id uuid DEFAULT NULL, p_date_from date DEFAULT ((now() - '30 days'::interval))::date, p_date_to date DEFAULT (now())::date)
 RETURNS TABLE(access_date date, access_count bigint, unique_accessors bigint, top_accessed_fields text[], risk_score integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v_is_admin boolean; v_is_target_user boolean;
BEGIN
    v_is_target_user := (p_target_user_id = auth.uid());
    SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('corporate_admin','compliance_officer','regional_hr')) INTO v_is_admin;
    IF NOT (v_is_admin OR v_is_target_user OR p_target_user_id IS NULL) THEN
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
$fn$;

CREATE OR REPLACE FUNCTION public.get_top_pii_accessors(p_date_from date DEFAULT ((now() - '30 days'::interval))::date, p_date_to date DEFAULT (now())::date, p_limit integer DEFAULT 10)
 RETURNS TABLE(accessor_id uuid, accessor_name text, accessor_role text, total_accesses bigint, unique_targets bigint, most_accessed_field text, last_accessed_at timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('corporate_admin','compliance_officer','regional_hr','regional_admin')) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    RETURN QUERY
    WITH accessor_stats AS (
        SELECT pal.actor_id AS uid, count(*) AS access_count,
            count(DISTINCT pal.target_user_id) AS target_count,
            mode() WITHIN GROUP (ORDER BY f.field) AS common_field,
            max(pal.created_at) AS last_access
        FROM pii_access_logs_v pal
        LEFT JOIN LATERAL unnest(pal.fields_accessed) AS f(field) ON true
        WHERE pal.created_at::date BETWEEN p_date_from AND p_date_to
        GROUP BY pal.actor_id ORDER BY access_count DESC LIMIT p_limit)
    SELECT ast.uid, p.full_name,
        (SELECT ur.role::text FROM user_roles ur WHERE ur.user_id = ast.uid LIMIT 1),
        ast.access_count, ast.target_count, ast.common_field, ast.last_access
    FROM accessor_stats ast LEFT JOIN profiles p ON p.id = ast.uid
    ORDER BY ast.access_count DESC;
END;
$fn$;

-- ---------- Training reads --------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_feed_item(_feed_item_id text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' SET row_security TO 'on'
AS $fn$
DECLARE _prefix text; _id_text text; _uuid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  _prefix := split_part(_feed_item_id, '-', 1);
  _id_text := substring(_feed_item_id from position('-' in _feed_item_id) + 1);
  BEGIN _uuid := _id_text::uuid; EXCEPTION WHEN others THEN _uuid := NULL; END;
  IF _prefix = 'ann' AND _uuid IS NOT NULL THEN RETURN EXISTS (SELECT 1 FROM announcements WHERE id = _uuid);
  ELSIF _prefix = 'doc' AND _uuid IS NOT NULL THEN RETURN EXISTS (SELECT 1 FROM documents WHERE id = _uuid);
  ELSIF _prefix = 'task' AND _uuid IS NOT NULL THEN RETURN EXISTS (SELECT 1 FROM tasks WHERE id = _uuid);
  ELSIF _prefix = 'train' AND _uuid IS NOT NULL THEN RETURN EXISTS (SELECT 1 FROM training_assignment_rules WHERE id = _uuid);
  ELSIF _prefix = 'ach' AND _uuid IS NOT NULL THEN RETURN EXISTS (SELECT 1 FROM training_progress WHERE id = _uuid);
  ELSIF _prefix = 'bday' AND _uuid IS NOT NULL THEN RETURN EXISTS (SELECT 1 FROM profiles WHERE id = _uuid);
  END IF;
  RETURN FALSE;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id uuid, p_scope_property_ids uuid[], p_roles text[], p_department_ids uuid[], p_property_ids uuid[])
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  v_documents_count int; v_completed_training int; v_in_progress_training int;
  v_unread_announcements int; v_pending_approvals int; v_unread_notifications int; v_pending_tasks int;
BEGIN
  SELECT COUNT(*)::int INTO v_documents_count FROM documents
  WHERE status = 'PUBLISHED' AND is_deleted = false
    AND (COALESCE(array_length(p_scope_property_ids,1),0)=0 OR property_id = ANY(p_scope_property_ids));

  SELECT COUNT(*) FILTER (WHERE status = 'completed')::int, COUNT(*) FILTER (WHERE status = 'in_progress')::int
  INTO v_completed_training, v_in_progress_training
  FROM learning_progress_v
  WHERE user_id = p_user_id AND content_type = 'module' AND (is_deleted IS NULL OR is_deleted = false);

  WITH visible_announcements AS (
    SELECT a.id, a.created_by FROM announcements a
    WHERE a.created_at > NOW() - INTERVAL '90 days'
      AND (a.created_by = p_user_id OR a.target_audience IS NULL OR (a.target_audience->>'type')='all'
        OR ((a.target_audience->>'type')='role' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v WHERE v = ANY(p_roles)))
        OR ((a.target_audience->>'type')='department' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v WHERE v::uuid = ANY(p_department_ids)))
        OR ((a.target_audience->>'type')='property' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v WHERE v::uuid = ANY(p_property_ids)))
        OR ((a.target_audience->>'type')='individual' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v WHERE v::uuid = p_user_id)))
    ORDER BY a.created_at DESC LIMIT 100)
  SELECT COUNT(*)::int INTO v_unread_announcements FROM visible_announcements va
  WHERE NOT EXISTS (SELECT 1 FROM announcement_reads ar WHERE ar.announcement_id = va.id AND ar.user_id = p_user_id);

  SELECT ((SELECT COUNT(*)::int FROM requests WHERE current_assignee_id = p_user_id AND status IN ('pending_supervisor_approval','pending_hr_review'))
    + (SELECT COUNT(*)::int FROM document_approvals WHERE approver_id = p_user_id AND status='pending' AND is_active=true)
    + (SELECT COUNT(*)::int FROM approval_requests WHERE current_approver_id = p_user_id AND status='pending')) INTO v_pending_approvals;

  SELECT COUNT(*)::int INTO v_unread_notifications FROM notifications WHERE user_id = p_user_id AND read_at IS NULL;

  SELECT COUNT(*)::int INTO v_pending_tasks FROM tasks
  WHERE assigned_to_id = p_user_id AND status IN ('open','todo','in_progress','pending')
    AND (COALESCE(array_length(p_scope_property_ids,1),0)=0 OR property_id = ANY(p_scope_property_ids));

  RETURN jsonb_build_object('documentsCount',v_documents_count,'completedTraining',v_completed_training,
    'inProgressTraining',v_in_progress_training,'unreadAnnouncements',v_unread_announcements,
    'pendingApprovals',v_pending_approvals,'unreadNotifications',v_unread_notifications,'pendingTasks',v_pending_tasks);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.award_module_skills(p_user_id uuid, p_module_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v_can_manage boolean := false; v_rows_affected integer := 0;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
        AND role = ANY (ARRAY['corporate_admin','regional_admin','regional_hr','property_manager','property_hr','department_head']::public.app_role[]))
    INTO v_can_manage;
    IF p_user_id <> auth.uid() AND NOT v_can_manage THEN RAISE EXCEPTION 'Not authorized to award skills for this user'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.training_progress tp
        WHERE tp.user_id = p_user_id AND tp.training_id = p_module_id AND tp.status = 'completed' AND COALESCE(tp.is_deleted,false)=false) THEN
        RETURN 0;
    END IF;
    INSERT INTO public.user_skills (user_id, skill_id, proficiency_level, verified)
    SELECT p_user_id, ms.skill_id, LEAST(GREATEST(COALESCE(ms.points_awarded,1),1),5), false
    FROM public.module_skills ms WHERE ms.module_id = p_module_id
    ON CONFLICT (user_id, skill_id) DO UPDATE
      SET proficiency_level = GREATEST(public.user_skills.proficiency_level, EXCLUDED.proficiency_level), verified = public.user_skills.verified
      WHERE public.user_skills.proficiency_level < EXCLUDED.proficiency_level;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.calculate_eom_score(p_user_id uuid, p_property_id uuid, p_month integer, p_year integer, p_config eom_automation_config)
 RETURNS TABLE(task_completion_rate integer, training_completion_rate integer, sop_compliance_rate integer, attendance_rate integer, total_score numeric, is_eligible boolean, ineligibility_reason text)
 LANGUAGE plpgsql SET search_path TO 'public'
AS $fn$
DECLARE
    v_task_total INTEGER; v_task_completed INTEGER;
    v_training_total INTEGER; v_training_completed INTEGER;
    v_sop_total INTEGER; v_sop_acknowledged INTEGER;
    v_attendance_total INTEGER; v_attendance_present INTEGER;
    v_employed_since TIMESTAMPTZ; v_recent_wins INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('completed','done'))
    INTO v_task_total, v_task_completed FROM tasks
    WHERE assigned_to_id = p_user_id AND EXTRACT(MONTH FROM created_at)=p_month AND EXTRACT(YEAR FROM created_at)=p_year AND is_deleted=false;
    task_completion_rate := CASE WHEN v_task_total > 0 THEN (v_task_completed * 100 / v_task_total) ELSE 0 END;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_training_total, v_training_completed
    FROM learning_progress_v
    WHERE user_id = p_user_id AND (is_deleted IS NULL OR is_deleted = false);
    training_completion_rate := CASE WHEN v_training_total > 0 THEN (v_training_completed * 100 / v_training_total) ELSE 0 END;

    SELECT COUNT(DISTINCT d.id), COUNT(DISTINCT da.document_id) INTO v_sop_total, v_sop_acknowledged
    FROM documents d JOIN user_departments ud ON ud.department_id = d.department_id
    LEFT JOIN document_acknowledgments da ON da.document_id = d.id AND da.user_id = p_user_id
    WHERE ud.user_id = p_user_id AND d.status = 'PUBLISHED';
    sop_compliance_rate := CASE WHEN v_sop_total > 0 THEN (v_sop_acknowledged * 100 / v_sop_total) ELSE 0 END;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('present','checked_in','completed'))
    INTO v_attendance_total, v_attendance_present FROM attendance
    WHERE employee_id = p_user_id AND EXTRACT(MONTH FROM date)=p_month AND EXTRACT(YEAR FROM date)=p_year;
    attendance_rate := CASE WHEN v_attendance_total > 0 THEN (v_attendance_present * 100 / v_attendance_total) ELSE 100 END;

    total_score := ((task_completion_rate * p_config.task_completion_weight / 100.0)
        + (training_completion_rate * p_config.training_completion_weight / 100.0)
        + (sop_compliance_rate * p_config.sop_compliance_weight / 100.0)
        + (attendance_rate * p_config.attendance_weight / 100.0))::DECIMAL(5,2);

    is_eligible := true; ineligibility_reason := NULL;
    IF attendance_rate < p_config.min_attendance_rate THEN is_eligible := false; ineligibility_reason := 'Attendance rate below minimum requirement'; END IF;
    IF task_completion_rate < p_config.min_task_completion_rate THEN is_eligible := false;
        ineligibility_reason := COALESCE(ineligibility_reason || '; ', '') || 'Task completion rate below minimum requirement'; END IF;
    SELECT created_at INTO v_employed_since FROM profiles WHERE id = p_user_id;
    IF v_employed_since > (now() - (p_config.min_employment_days || ' days')::INTERVAL) THEN is_eligible := false;
        ineligibility_reason := COALESCE(ineligibility_reason || '; ', '') || 'Employment duration too short'; END IF;
    IF p_config.exclude_recent_winners THEN
        SELECT COUNT(*) INTO v_recent_wins FROM employee_of_the_month
        WHERE user_id = p_user_id AND (year > p_year OR (year = p_year AND month >= p_month - p_config.exclusion_months));
        IF v_recent_wins > 0 THEN is_eligible := false;
            ineligibility_reason := COALESCE(ineligibility_reason || '; ', '') || 'Recent winner (within ' || p_config.exclusion_months || ' months)'; END IF;
    END IF;
    RETURN NEXT;
END;
$fn$;

-- ---------- LIVE trigger: assign training when a role is granted -------------
CREATE OR REPLACE FUNCTION public.handle_new_user_training()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
  INSERT INTO public.training_assignment_rules
    (target_type, target_id, content_type, content_id, training_module_id, due_date, assigned_by, is_active, created_at)
  SELECT 'user', NEW.user_id::text, 'module', tar.training_module_id, tar.training_module_id,
         (now() + interval '30 days'), tar.created_by, true, now()
  FROM public.training_assignment_rules tar
  WHERE tar.target_role = NEW.role::text
    AND tar.is_active = true
    AND tar.target_type IS DISTINCT FROM 'user'
    AND tar.training_module_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.training_assignment_rules ex
      WHERE ex.target_type = 'user' AND ex.target_id = NEW.user_id::text
        AND ex.content_id = tar.training_module_id AND ex.content_type = 'module');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user_training failed for user %: %', NEW.user_id, SQLERRM;
  RETURN NEW;
END;
$fn$;

-- ---------- LIVE trigger: onboarding on department assignment ----------------
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $fn$
DECLARE
  user_role text; matched_template_id uuid; v_training_id uuid; v_process_id uuid; v_task_id uuid;
BEGIN
  IF NEW.user_id IS NULL OR NEW.department_id IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.onboarding_process op WHERE op.user_id = NEW.user_id
      AND op.status IN ('pending'::public.entity_status,'in_progress'::public.entity_status)) THEN RETURN NEW; END IF;

  SELECT ur.role::text INTO user_role FROM public.user_roles ur WHERE ur.user_id = NEW.user_id LIMIT 1;

  SELECT ot.id INTO matched_template_id FROM public.onboarding_templates ot
  WHERE ot.is_active = true
    AND ((ot.role::text = user_role) OR (ot.department_id = NEW.department_id) OR (ot.role IS NULL AND ot.department_id IS NULL))
  ORDER BY CASE WHEN ot.role::text = user_role THEN 1 WHEN ot.department_id = NEW.department_id THEN 2 ELSE 3 END
  LIMIT 1;
  IF matched_template_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.onboarding_process (user_id, template_id, status, start_date)
  VALUES (NEW.user_id, matched_template_id, 'in_progress'::public.entity_status, now())
  RETURNING id INTO v_process_id;

  INSERT INTO public.onboarding_tasks (process_id, title, description, assigned_to_id, due_date, link_type, link_id)
  SELECT v_process_id, t->>'title', t->>'description',
    CASE WHEN t->>'assignee_role' = 'self' THEN NEW.user_id
         WHEN t->>'assignee_role' = 'manager' THEN (SELECT p.reporting_to FROM public.profiles p WHERE p.id = NEW.user_id)
         ELSE NULL END,
    now() + ((t->>'due_day_offset')::int || ' days')::interval, t->>'link_type',
    CASE WHEN nullif(t->>'link_id','') IS NOT NULL AND (t->>'link_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         THEN (t->>'link_id')::uuid ELSE NULL END
  FROM public.onboarding_templates ot, jsonb_array_elements(ot.tasks) AS t WHERE ot.id = matched_template_id;

  FOR v_training_id IN SELECT unnest(ot.required_training_ids) FROM public.onboarding_templates ot WHERE ot.id = matched_template_id
  LOOP
    INSERT INTO public.onboarding_tasks (process_id, title, description, assigned_to_id, due_date, link_type, link_id)
    SELECT v_process_id, 'Complete Training: ' || tm.title, 'Mandatory training module required for your role/department.',
      NEW.user_id, now() + interval '7 days', 'training', v_training_id
    FROM public.training_modules tm WHERE tm.id = v_training_id
    RETURNING id INTO v_task_id;

    -- New consolidated model: create a per-user training assignment row.
    INSERT INTO public.training_assignment_rules
      (target_type, target_id, content_type, content_id, training_module_id, due_date, is_active, created_at)
    SELECT 'user', NEW.user_id::text, 'module', v_training_id, v_training_id, now() + interval '7 days', true, now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.training_assignment_rules ex
      WHERE ex.target_type = 'user' AND ex.target_id = NEW.user_id::text
        AND ex.content_id = v_training_id AND ex.content_type = 'module');
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user_onboarding failed for user %, department %: %', NEW.user_id, NEW.department_id, SQLERRM;
  RETURN NEW;
END;
$fn$;

-- ---------- Dormant helpers (repointed for correctness if re-enabled) --------
CREATE OR REPLACE FUNCTION public.apply_training_rules_to_user()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $fn$
DECLARE
  v_new jsonb := to_jsonb(new); v_user_id uuid; v_department_id uuid; v_role_text text;
BEGIN
  IF tg_table_name = 'user_departments' THEN
    v_user_id := nullif(v_new->>'user_id','')::uuid; v_department_id := nullif(v_new->>'department_id','')::uuid;
  ELSIF tg_table_name = 'user_roles' THEN
    v_user_id := nullif(v_new->>'user_id','')::uuid; v_role_text := nullif(v_new->>'role','');
  ELSE RETURN NEW; END IF;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.training_assignment_rules
    (target_type, target_id, content_type, content_id, training_module_id, due_date, priority, assigned_by, is_active, created_at)
  SELECT 'user', v_user_id::text, 'module', tar.training_module_id, tar.training_module_id,
         now() + interval '30 days', 'normal', tar.created_by, true, now()
  FROM public.training_assignment_rules tar
  WHERE tar.is_active = true AND tar.target_type IS DISTINCT FROM 'user' AND tar.training_module_id IS NOT NULL
    AND ((v_department_id IS NOT NULL AND tar.target_department_id = v_department_id)
         OR (v_role_text IS NOT NULL AND tar.target_role = v_role_text))
    AND NOT EXISTS (SELECT 1 FROM public.training_assignment_rules ex
      WHERE ex.target_type='user' AND ex.target_id = v_user_id::text
        AND ex.content_id = tar.training_module_id AND ex.content_type='module');
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sync_lms_to_onboarding()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
  IF (NEW.status = 'completed' OR NEW.progress_percentage = 100) THEN
    UPDATE public.onboarding_tasks ot
    SET is_completed = true, status = 'completed', completed_at = COALESCE(NEW.completed_at, NOW())
    WHERE ot.link_type = 'training' AND ot.link_id = NEW.training_id
      AND ot.assigned_to_id = NEW.user_id AND ot.is_completed = false;
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.generate_assignment_progress()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
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
  END IF;
  RETURN NEW;
END;
$fn$;
