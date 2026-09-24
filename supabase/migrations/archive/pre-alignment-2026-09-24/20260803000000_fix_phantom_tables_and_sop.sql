-- Fix phantom tables by repointing transfer/promotion operations to the correct tables

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
begin
    select up.property_id into v_from_property_id from public.user_properties up where up.user_id = p_employee_id limit 1;
    select ud.department_id into v_from_department_id from public.user_departments ud where ud.user_id = p_employee_id limit 1;

    insert into public.employee_transfers (
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
        'transfer', v_transfer_id, v_requester_id, v_hr_assignee, 'pending',
        jsonb_build_object(
            'employee_id', p_employee_id,
            'to_property_id', p_to_property_id,
            'to_department_id', p_to_department_id,
            'effective_date', p_effective_date,
            'routing', v_routing_meta
        ),
        v_from_property_id, v_from_department_id
    ) returning id into v_request_id;

    return jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'transfer_id', v_transfer_id,
        'assigned_to', v_hr_assignee
    );
exception
    when others then
        return jsonb_build_object('success', false, 'message', SQLERRM);
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_request(p_request_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_requester_id UUID;
  v_entity_type TEXT;
  v_entity_id UUID;
  v_status TEXT;
  v_user_role public.app_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
  END IF;

  SELECT requester_id, entity_type, entity_id, status
  INTO v_requester_id, v_entity_type, v_entity_id, v_status
  FROM public.requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_entity_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
  END IF;

  IF v_status NOT IN ('pending', 'pending_hr_review', 'pending_supervisor_approval', 'pending_approval') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot cancel a request that is not pending.');
  END IF;

  SELECT ur.role
  INTO v_user_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  ORDER BY CASE ur.role
    WHEN 'corporate_admin' THEN 1
    WHEN 'regional_admin' THEN 2
    WHEN 'regional_hr' THEN 3
    WHEN 'property_manager' THEN 4
    WHEN 'property_hr' THEN 5
    ELSE 100
  END
  LIMIT 1;

  IF auth.uid() IS DISTINCT FROM v_requester_id
     AND COALESCE(v_user_role::text, '') NOT IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorized to cancel this request.');
  END IF;

  UPDATE public.requests
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_request_id;

  IF v_entity_type = 'promotion' THEN
    UPDATE public.employee_promotions
    SET
      status = 'cancelled',
      notes = CASE
        WHEN COALESCE(TRIM(p_reason), '') = '' THEN notes
        ELSE CONCAT_WS(' ', NULLIF(notes, ''), '[Cancelled: ' || TRIM(p_reason) || ']')
      END,
      updated_at = NOW()
    WHERE id = v_entity_id;
  ELSIF v_entity_type = 'transfer' THEN
    UPDATE public.employee_transfers
    SET
      status = 'cancelled',
      notes = CASE
        WHEN COALESCE(TRIM(p_reason), '') = '' THEN notes
        ELSE CONCAT_WS(' ', NULLIF(notes, ''), '[Cancelled: ' || TRIM(p_reason) || ']')
      END,
      updated_at = NOW()
    WHERE id = v_entity_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Request cancelled successfully.');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_request_details(p_request_id uuid, p_updates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_entity_type TEXT;
    v_entity_id UUID;
    v_current_metadata JSONB;
    v_requester_id UUID;
    v_user_role public.app_role;
    v_new_meta JSONB;
BEGIN
    -- Get request info
    SELECT entity_type, entity_id, metadata, requester_id
    INTO v_entity_type, v_entity_id, v_current_metadata, v_requester_id
    FROM public.requests WHERE id = p_request_id;

    IF v_entity_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
    END IF;

    -- Check permissions: Only Requester or Admin/HR can edit
    SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    IF auth.uid() != v_requester_id AND v_user_role NOT IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'corporate_admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized to edit this request.');
    END IF;

    -- Update Promotion
    IF v_entity_type = 'promotion' THEN
        UPDATE public.employee_promotions SET
            effective_date = CASE WHEN p_updates ? 'effective_date' THEN (p_updates->>'effective_date')::DATE ELSE effective_date END,
            new_role = CASE WHEN p_updates ? 'new_role' THEN (p_updates->>'new_role')::public.app_role ELSE new_role END,
            new_job_title = CASE WHEN p_updates ? 'new_job_title' THEN (p_updates->>'new_job_title') ELSE new_job_title END,
            new_department_id = CASE WHEN p_updates ? 'new_department_id' THEN (p_updates->>'new_department_id')::UUID ELSE new_department_id END,
            notes = CASE WHEN p_updates ? 'notes' THEN (p_updates->>'notes') ELSE notes END,
            updated_at = NOW()
        WHERE id = v_entity_id;

         -- Update metadata to reflect changes in UI
         UPDATE public.requests
         SET metadata = v_current_metadata || p_updates,
             updated_at = NOW()
         WHERE id = p_request_id;

    -- Update Transfer
    ELSIF v_entity_type = 'transfer' THEN
        UPDATE public.employee_transfers SET
            effective_date = CASE WHEN p_updates ? 'effective_date' THEN (p_updates->>'effective_date')::DATE ELSE effective_date END,
            to_property_id = CASE WHEN p_updates ? 'to_property_id' THEN (p_updates->>'to_property_id')::UUID ELSE to_property_id END,
            to_department_id = CASE WHEN p_updates ? 'to_department_id' THEN (p_updates->>'to_department_id')::UUID ELSE to_department_id END,
            notes = CASE WHEN p_updates ? 'notes' THEN (p_updates->>'notes') ELSE notes END,
            updated_at = NOW()
        WHERE id = v_entity_id;

         -- Update metadata to reflect changes in UI
         UPDATE public.requests
         SET metadata = v_current_metadata || p_updates,
             updated_at = NOW()
         WHERE id = p_request_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Request details updated.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;
