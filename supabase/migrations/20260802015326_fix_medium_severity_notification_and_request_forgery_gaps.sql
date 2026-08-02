-- ============================================================================
-- MIGRATION: fix_medium_severity_notification_and_request_forgery_gaps
-- 1. create_notification_batch / create_workflow_notification_batch had NO
--    authentication check at all (not even auth.uid() IS NOT NULL), and
--    create_workflow_notification_batch can trigger real email sends with
--    attacker-chosen recipients/content. Grep confirms zero frontend call
--    sites for either -- they only appear in the generated types file,
--    meaning legitimate usage is server-side (edge functions/cron using the
--    service_role key). Fix: revoke `authenticated`, restrict to
--    service_role.
--
-- 2. submit_promotion_request(...) had the same bug as promote_employee
--    (fixed earlier today): it inserted into a nonexistent `public.promotions`
--    table instead of `employee_promotions`, so every call has always
--    errored out and no promotion request has ever actually been recorded
--    via this path.
--
-- 3. submit_promotion_request / submit_transfer_request had no check that
--    the caller has any relationship to p_employee_id -- any authenticated
--    user could file a promotion or transfer request for an arbitrary
--    employee. Impact is now contained by the request_apply_action fix
--    (a real assigned HR approver must still approve it), but this closes
--    the request-forgery/spam vector at the source. Fix: require the caller
--    be the employee themselves, their direct manager (reporting_to), or
--    HR/admin.
--
-- Verified via rolled-back functional tests: unrelated property_manager ->
-- blocked; self-request -> succeeds.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.create_notification_batch(text, uuid[], text, jsonb, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_workflow_notification_batch(text, uuid[], text, jsonb, text, text, text[], uuid, text, timestamptz) FROM authenticated;

CREATE OR REPLACE FUNCTION public.create_notification_batch(p_job_type text, p_user_ids uuid[], p_notification_type text, p_notification_data jsonb, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch_id UUID;
  v_user_id UUID;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: notification batches may only be created by the service role';
  END IF;

  INSERT INTO notification_batches (job_type, total_count, metadata, created_by)
  VALUES (p_job_type, array_length(p_user_ids, 1), p_notification_data, p_created_by)
  RETURNING id INTO v_batch_id;

  FOREACH v_user_id IN ARRAY p_user_ids LOOP
    INSERT INTO notification_queue (batch_id, user_id, notification_type, notification_data)
    VALUES (v_batch_id, v_user_id, p_notification_type, p_notification_data);
  END LOOP;

  RETURN v_batch_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_workflow_notification_batch(p_job_type text, p_user_ids uuid[], p_notification_type text, p_notification_data jsonb DEFAULT '{}'::jsonb, p_business_domain text DEFAULT 'system'::text, p_template_key text DEFAULT NULL::text, p_channels text[] DEFAULT ARRAY['in_app'::text, 'email'::text], p_created_by uuid DEFAULT NULL::uuid, p_priority text DEFAULT 'normal'::text, p_scheduled_for timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch_id UUID;
  v_user_id UUID;
  v_domain TEXT;
  v_channels TEXT[];
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: workflow notification batches may only be created by the service role';
  END IF;

  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'p_user_ids must contain at least one recipient';
  END IF;

  v_domain := lower(coalesce(p_business_domain, 'system'));
  IF v_domain NOT IN ('system', 'user_management', 'operations', 'hr', 'finance', 'sales', 'management') THEN
    v_domain := 'system';
  END IF;

  v_channels := coalesce(p_channels, ARRAY['in_app']::TEXT[]);

  INSERT INTO public.notification_batches (job_type, total_count, metadata, created_by)
  VALUES (p_job_type, array_length(p_user_ids, 1), coalesce(p_notification_data, '{}'::JSONB), p_created_by)
  RETURNING id INTO v_batch_id;

  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    INSERT INTO public.notification_queue (
      batch_id, user_id, notification_type, notification_data, channels,
      template_key, business_domain, email_payload, send_email, priority, scheduled_for
    )
    VALUES (
      v_batch_id, v_user_id, p_notification_type, coalesce(p_notification_data, '{}'::JSONB), v_channels,
      p_template_key, v_domain, coalesce(p_notification_data, '{}'::JSONB), ('email' = ANY(v_channels)),
      CASE WHEN p_priority IN ('low', 'normal', 'high', 'critical') THEN p_priority ELSE 'normal' END,
      p_scheduled_for
    );
  END LOOP;

  RETURN v_batch_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_promotion_request(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
    v_promotion_id uuid;
    v_request_id uuid;
    v_request_no bigint;
    v_requester_id uuid := auth.uid();
    v_old_role public.app_role;
    v_old_job_title text;
    v_old_department_id uuid;
    v_property_id uuid;
    v_hr_assignee uuid;
    v_hr_role public.app_role;
    v_routing_meta jsonb;
    v_reporting_to uuid;
begin
    if v_requester_id is null then
      raise exception 'Not authenticated';
    end if;

    select p.reporting_to into v_reporting_to from public.profiles p where p.id = p_employee_id;

    if v_requester_id <> p_employee_id
       and v_reporting_to is distinct from v_requester_id
       and not public.is_hr_or_admin(v_requester_id) then
      raise exception 'Unauthorized: you may only request a promotion for yourself, a direct report, or as HR/admin';
    end if;

    select p.job_title into v_old_job_title from public.profiles p where p.id = p_employee_id;
    select ur.role into v_old_role from public.user_roles ur where ur.user_id = p_employee_id limit 1;
    select ud.department_id into v_old_department_id from public.user_departments ud where ud.user_id = p_employee_id limit 1;
    select up.property_id into v_property_id from public.user_properties up where up.user_id = p_employee_id limit 1;

    if p_new_job_title is not null and length(trim(p_new_job_title)) > 0 then
      insert into public.job_titles (title, category, default_role, department_id)
      values (
        trim(p_new_job_title),
        coalesce((select d.name from public.departments d where d.id = p_new_department_id), 'General'),
        coalesce(p_new_role, 'staff'::public.app_role),
        p_new_department_id
      )
      on conflict (title) do nothing;
    end if;

    insert into public.employee_promotions (
        employee_id, approved_by, from_role, to_role,
        from_title, to_title, from_department_id, to_department_id,
        effective_date, notes
    ) values (
        p_employee_id, v_requester_id, v_old_role::text, p_new_role::text,
        v_old_job_title, p_new_job_title, v_old_department_id, p_new_department_id,
        p_effective_date, p_notes
    ) returning id into v_promotion_id;

    v_hr_assignee := public.find_hr_assignee(v_property_id);

    select ur.role into v_hr_role
    from public.user_roles ur
    where ur.user_id = v_hr_assignee
      and ur.role in ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
    order by case ur.role
      when 'property_hr' then 1
      when 'regional_hr' then 2
      when 'regional_admin' then 3
      when 'corporate_admin' then 4
      else 100
    end
    limit 1;

    if v_hr_role is null then
        v_hr_role := 'regional_hr'::public.app_role;
    end if;

    v_routing_meta := jsonb_build_object('missing_hr_assignee', v_hr_assignee is null);

    insert into public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata,
        property_id, department_id
    ) values (
        'promotion',
        v_promotion_id,
        v_requester_id,
        v_hr_assignee,
        'pending_hr_review',
        jsonb_build_object(
            'employee_name', (select p.full_name from public.profiles p where p.id = p_employee_id),
            'new_role', p_new_role,
            'effective_date', p_effective_date,
            'routing_warning', v_routing_meta
        ),
        v_property_id,
        coalesce(p_new_department_id, v_old_department_id)
    ) returning id, request_no into v_request_id, v_request_no;

    insert into public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status
    ) values (
        v_request_id, 1, v_hr_assignee, v_hr_role, 'pending'
    );

    if v_hr_assignee is null then
      insert into public.notifications (user_id, type, title, message, metadata)
      select ur.user_id,
             'escalation_alert',
             'Routing issue: Missing HR assignee',
             format('Promotion request #%s requires HR assignment.', v_request_no),
             jsonb_build_object('request_id', v_request_id, 'entity_type', 'promotion', 'reason', 'missing_hr_assignee')
      from public.user_roles ur
      where ur.role in ('regional_admin', 'regional_hr', 'corporate_admin');
    end if;

    return jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_transfer_request(p_employee_id uuid, p_to_property_id uuid, p_to_department_id uuid, p_effective_date date, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
    v_transfer_id uuid;
    v_request_id uuid;
    v_request_no bigint;
    v_requester_id uuid := auth.uid();
    v_from_property_id uuid;
    v_from_department_id uuid;
    v_hr_assignee uuid;
    v_hr_role public.app_role;
    v_routing_meta jsonb;
    v_reporting_to uuid;
begin
    if v_requester_id is null then
      raise exception 'Not authenticated';
    end if;

    select p.reporting_to into v_reporting_to from public.profiles p where p.id = p_employee_id;

    if v_requester_id <> p_employee_id
       and v_reporting_to is distinct from v_requester_id
       and not public.is_hr_or_admin(v_requester_id) then
      raise exception 'Unauthorized: you may only request a transfer for yourself, a direct report, or as HR/admin';
    end if;

    select up.property_id into v_from_property_id from public.user_properties up where up.user_id = p_employee_id limit 1;
    select ud.department_id into v_from_department_id from public.user_departments ud where ud.user_id = p_employee_id limit 1;

    insert into public.transfers (
        employee_id, from_property_id, to_property_id,
        from_department_id, to_department_id, effective_date, notes, status
    ) values (
        p_employee_id, v_from_property_id, p_to_property_id,
        v_from_department_id, p_to_department_id, p_effective_date, p_notes, 'pending'
    ) returning id into v_transfer_id;

    v_hr_assignee := public.find_hr_assignee(p_to_property_id);

    select ur.role into v_hr_role
    from public.user_roles ur
    where ur.user_id = v_hr_assignee
      and ur.role in ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
    order by case ur.role
      when 'property_hr' then 1
      when 'regional_hr' then 2
      when 'regional_admin' then 3
      when 'corporate_admin' then 4
      else 100
    end
    limit 1;

    if v_hr_role is null then
        v_hr_role := 'regional_hr'::public.app_role;
    end if;

    v_routing_meta := jsonb_build_object('missing_hr_assignee', v_hr_assignee is null);

    insert into public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata,
        property_id, department_id
    ) values (
        'transfer',
        v_transfer_id,
        v_requester_id,
        v_hr_assignee,
        'pending_hr_review',
        jsonb_build_object(
            'employee_name', (select p.full_name from public.profiles p where p.id = p_employee_id),
            'target_property', (select pr.name from public.properties pr where pr.id = p_to_property_id),
            'effective_date', p_effective_date,
            'routing_warning', v_routing_meta
        ),
        p_to_property_id,
        p_to_department_id
    ) returning id, request_no into v_request_id, v_request_no;

    insert into public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status
    ) values (
        v_request_id, 1, v_hr_assignee, v_hr_role, 'pending'
    );

    if v_hr_assignee is null then
      insert into public.notifications (user_id, type, title, message, metadata)
      select ur.user_id,
             'escalation_alert',
             'Routing issue: Missing HR assignee',
             format('Transfer request #%s requires HR assignment.', v_request_no),
             jsonb_build_object('request_id', v_request_id, 'entity_type', 'transfer', 'reason', 'missing_hr_assignee')
      from public.user_roles ur
      where ur.role in ('regional_admin', 'regional_hr', 'corporate_admin');
    end if;

    return jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
end;
$function$;
