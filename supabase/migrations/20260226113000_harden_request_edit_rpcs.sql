-- Phase 2 hardening: secure request edit/cancel RPCs and expand editable fields

CREATE OR REPLACE FUNCTION public.cancel_request(
  p_request_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
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
    UPDATE public.promotions
    SET
      status = 'cancelled',
      notes = CASE
        WHEN COALESCE(TRIM(p_reason), '') = '' THEN notes
        ELSE CONCAT_WS(' ', NULLIF(notes, ''), '[Cancelled: ' || TRIM(p_reason) || ']')
      END,
      updated_at = NOW()
    WHERE id = v_entity_id;
  ELSIF v_entity_type = 'transfer' THEN
    UPDATE public.transfers
    SET
      status = 'cancelled',
      notes = CASE
        WHEN COALESCE(TRIM(p_reason), '') = '' THEN notes
        ELSE CONCAT_WS(' ', NULLIF(notes, ''), '[Cancelled: ' || TRIM(p_reason) || ']')
      END,
      updated_at = NOW()
    WHERE id = v_entity_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


CREATE OR REPLACE FUNCTION public.update_request_details(
  p_request_id UUID,
  p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_request public.requests%ROWTYPE;
  v_user_role public.app_role;
  v_effective_date DATE;
  v_new_role public.app_role;
  v_new_job_title TEXT;
  v_new_department_id UUID;
  v_to_property_id UUID;
  v_to_department_id UUID;
  v_notes TEXT;
  v_target_property_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
  END IF;

  SELECT *
  INTO v_request
  FROM public.requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
  END IF;

  IF v_request.entity_type NOT IN ('promotion', 'transfer') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unsupported request type for update.');
  END IF;

  IF v_request.status NOT IN ('pending', 'pending_hr_review', 'pending_supervisor_approval', 'pending_approval') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only pending requests can be edited.');
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

  IF auth.uid() IS DISTINCT FROM v_request.requester_id
     AND COALESCE(v_user_role::text, '') NOT IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorized to edit this request.');
  END IF;

  IF v_request.entity_type = 'promotion' THEN
    UPDATE public.promotions
    SET
      effective_date = CASE
        WHEN p_updates ? 'effective_date' AND NULLIF(p_updates->>'effective_date', '') IS NOT NULL
          THEN (p_updates->>'effective_date')::DATE
        ELSE effective_date
      END,
      new_role = CASE
        WHEN p_updates ? 'new_role' AND NULLIF(p_updates->>'new_role', '') IS NOT NULL
          THEN (p_updates->>'new_role')::public.app_role
        ELSE new_role
      END,
      new_job_title = CASE
        WHEN p_updates ? 'new_job_title' AND NULLIF(BTRIM(p_updates->>'new_job_title'), '') IS NOT NULL
          THEN BTRIM(p_updates->>'new_job_title')
        ELSE new_job_title
      END,
      new_department_id = CASE
        WHEN p_updates ? 'new_department_id' THEN NULLIF(p_updates->>'new_department_id', '')::UUID
        ELSE new_department_id
      END,
      notes = CASE
        WHEN p_updates ? 'notes' THEN NULLIF(BTRIM(p_updates->>'notes'), '')
        ELSE notes
      END,
      updated_at = NOW()
    WHERE id = v_request.entity_id
    RETURNING effective_date, new_role, new_job_title, new_department_id, notes
    INTO v_effective_date, v_new_role, v_new_job_title, v_new_department_id, v_notes;

    IF v_effective_date IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Promotion entity not found.');
    END IF;

    UPDATE public.requests
    SET
      metadata = COALESCE(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'new_role', v_new_role,
          'new_job_title', v_new_job_title,
          'effective_date', v_effective_date,
          'notes', v_notes
        )
        || CASE
          WHEN v_new_department_id IS NOT NULL THEN jsonb_build_object('new_department_id', v_new_department_id)
          ELSE '{}'::jsonb
        END,
      department_id = COALESCE(v_new_department_id, department_id),
      updated_at = NOW()
    WHERE id = p_request_id;

  ELSIF v_request.entity_type = 'transfer' THEN
    UPDATE public.transfers
    SET
      effective_date = CASE
        WHEN p_updates ? 'effective_date' AND NULLIF(p_updates->>'effective_date', '') IS NOT NULL
          THEN (p_updates->>'effective_date')::DATE
        ELSE effective_date
      END,
      to_property_id = CASE
        WHEN p_updates ? 'to_property_id' AND NULLIF(p_updates->>'to_property_id', '') IS NOT NULL
          THEN (p_updates->>'to_property_id')::UUID
        ELSE to_property_id
      END,
      to_department_id = CASE
        WHEN p_updates ? 'to_department_id' THEN NULLIF(p_updates->>'to_department_id', '')::UUID
        ELSE to_department_id
      END,
      notes = CASE
        WHEN p_updates ? 'notes' THEN NULLIF(BTRIM(p_updates->>'notes'), '')
        ELSE notes
      END,
      updated_at = NOW()
    WHERE id = v_request.entity_id
    RETURNING to_property_id, to_department_id, effective_date, notes
    INTO v_to_property_id, v_to_department_id, v_effective_date, v_notes;

    IF v_to_property_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Transfer entity not found.');
    END IF;

    SELECT p.name
    INTO v_target_property_name
    FROM public.properties p
    WHERE p.id = v_to_property_id;

    UPDATE public.requests
    SET
      metadata = COALESCE(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'target_property', v_target_property_name,
          'to_property_id', v_to_property_id,
          'effective_date', v_effective_date,
          'notes', v_notes
        )
        || CASE
          WHEN v_to_department_id IS NOT NULL THEN jsonb_build_object('to_department_id', v_to_department_id)
          ELSE '{}'::jsonb
        END,
      property_id = COALESCE(v_to_property_id, property_id),
      department_id = v_to_department_id,
      updated_at = NOW()
    WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_request(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_request_details(UUID, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cancel_request(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_request_details(UUID, JSONB) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';