-- Cleanly-derivable workflow RPCs the frontend already calls.

CREATE OR REPLACE FUNCTION public.calculate_next_task_run(recurrence text, last_run timestamptz)
 RETURNS timestamptz LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(recurrence,'daily'))
    WHEN 'daily'      THEN last_run + interval '1 day'
    WHEN 'weekly'     THEN last_run + interval '1 week'
    WHEN 'biweekly'   THEN last_run + interval '2 weeks'
    WHEN 'monthly'    THEN last_run + interval '1 month'
    WHEN 'quarterly'  THEN last_run + interval '3 months'
    WHEN 'yearly'     THEN last_run + interval '1 year'
    WHEN 'annually'   THEN last_run + interval '1 year'
    ELSE last_run + interval '1 day'
  END;
$$;

CREATE OR REPLACE FUNCTION public.delete_operations_import(import_log_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_any_role((SELECT auth.uid()),
       ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_manager']::app_role[]) THEN
    RAISE EXCEPTION 'Not authorized to delete imports';
  END IF;
  DELETE FROM data_import_logs WHERE id = import_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_scheduled_report(p_report_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_run uuid;
BEGIN
  IF NOT is_regional_admin_or_higher((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to run reports';
  END IF;
  INSERT INTO report_runs (report_id, status, triggered_by, triggered_via, started_at)
  VALUES (p_report_id, 'pending', (SELECT auth.uid()), 'manual', now())
  RETURNING id INTO v_run;
  RETURN v_run::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_pending_user(p_user_id uuid, p_approve boolean DEFAULT true)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_any_role((SELECT auth.uid()),
       ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr']::app_role[]) THEN
    RAISE EXCEPTION 'Not authorized to review user approvals';
  END IF;
  UPDATE pending_user_approvals
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
         reviewed_by = (SELECT auth.uid()), reviewed_at = now()
   WHERE user_id = p_user_id;
  IF p_approve THEN
    UPDATE profiles SET account_status = 'active', is_active = true WHERE id = p_user_id;
  ELSE
    UPDATE profiles SET is_active = false WHERE id = p_user_id;
  END IF;
  RETURN json_build_object('success', true, 'user_id', p_user_id, 'approved', p_approve);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_knowledge_content(
  p_title text, p_description text DEFAULT NULL, p_property_id uuid DEFAULT NULL, p_department_id uuid DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO system_events (event_type, entity_type, actor_id, metadata)
  VALUES ('knowledge_content_request', 'knowledge', (SELECT auth.uid()),
          jsonb_build_object('title', p_title, 'description', p_description,
                             'property_id', p_property_id, 'department_id', p_department_id,
                             'status', 'open'));
END;
$$;
