-- ============================================================================
-- MIGRATION: complete_promotion_transfer_table_migration
--
-- ROOT CAUSE: a half-finished table rename. `promotions` -> `employee_promotions`
-- and `transfers` -> `employee_transfers` was started but never completed:
--   * process_due_promotions, process_due_transfers, process_request_finalization
--     still target the OLD names, which do not exist -> hard failure on every call.
--   * cancel_request and update_request_details target the NEW tables but write
--     COLUMNS that don't exist on them (`status`, `new_role`, `new_job_title`,
--     `new_department_id`) -> hard failure on every call.
--   * submit_transfer_request inserts a `status` column that does not exist.
-- Net effect: the entire employee transfer feature, and the cancel/edit flows for
-- both promotions and transfers, have never worked.
--
-- DESIGN DECISION: do NOT re-add a `status` column to the entity tables. Workflow
-- state already lives in `requests.status` (the generic approval engine) and
-- duplicating it there is what created this drift in the first place. The entity
-- tables record WHAT was decided; `requests` records WHERE IT IS in the workflow.
-- The only thing genuinely missing is "has the effective-date change been applied
-- to the employee's live assignment yet" -- modelled explicitly as `applied_at`.
--
-- Also restores the authorization check on submit_transfer_request (present in
-- migration 20260802015326, since overwritten by a concurrent deployment).
--
-- Applied live via Supabase MCP apply_migration on 2026-08-02.
-- ============================================================================

ALTER TABLE public.employee_promotions ADD COLUMN IF NOT EXISTS applied_at timestamptz;
ALTER TABLE public.employee_transfers  ADD COLUMN IF NOT EXISTS applied_at timestamptz;

COMMENT ON COLUMN public.employee_promotions.applied_at IS
  'When the effective-date change was applied to the employee''s live role/title/department. NULL = not yet applied. Workflow status lives in requests.status.';
COMMENT ON COLUMN public.employee_transfers.applied_at IS
  'When the effective-date change was applied to the employee''s live property/department. NULL = not yet applied. Workflow status lives in requests.status.';

CREATE INDEX IF NOT EXISTS idx_employee_promotions_pending_application
  ON public.employee_promotions (effective_date) WHERE applied_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employee_transfers_pending_application
  ON public.employee_transfers (effective_date) WHERE applied_at IS NULL;

-- ---------------------------------------------------------------------------
-- submit_transfer_request: correct table + columns, restore authorization
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_transfer_request(p_employee_id uuid, p_to_property_id uuid, p_to_department_id uuid, p_effective_date date, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
    v_transfer_id uuid;
    v_request_id uuid;
    v_requester_id uuid := auth.uid();
    v_from_property_id uuid;
    v_from_department_id uuid;
    v_hr_assignee uuid;
    v_hr_role public.app_role;
    v_reporting_to uuid;
begin
    if v_requester_id is null then
      return jsonb_build_object('success', false, 'message', 'Not authenticated');
    end if;

    select p.reporting_to into v_reporting_to from public.profiles p where p.id = p_employee_id;

    if v_requester_id <> p_employee_id
       and v_reporting_to is distinct from v_requester_id
       and not public.is_hr_or_admin(v_requester_id) then
      return jsonb_build_object('success', false,
        'message', 'Unauthorized: you may only request a transfer for yourself, a direct report, or as HR/admin');
    end if;

    select up.property_id into v_from_property_id from public.user_properties up where up.user_id = p_employee_id limit 1;
    select ud.department_id into v_from_department_id from public.user_departments ud where ud.user_id = p_employee_id limit 1;

    insert into public.employee_transfers (
        employee_id, from_property_id, to_property_id,
        from_department_id, to_department_id, effective_date, notes
    ) values (
        p_employee_id, v_from_property_id, p_to_property_id,
        v_from_department_id, p_to_department_id, p_effective_date, p_notes
    ) returning id into v_transfer_id;

    v_hr_assignee := public.find_hr_assignee(p_to_property_id);

    select ur.role into v_hr_role
    from public.user_roles ur
    where ur.user_id = v_hr_assignee
      and ur.role in ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
    order by case ur.role
      when 'property_hr' then 1 when 'regional_hr' then 2
      when 'regional_admin' then 3 when 'corporate_admin' then 4 else 100 end
    limit 1;

    if v_hr_role is null then
        v_hr_role := 'regional_hr'::public.app_role;
    end if;

    insert into public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata,
        property_id, department_id
    ) values (
        'transfer', v_transfer_id, v_requester_id, v_hr_assignee, 'pending_hr_review',
        jsonb_build_object(
            'employee_id', p_employee_id,
            'to_property_id', p_to_property_id,
            'to_department_id', p_to_department_id,
            'effective_date', p_effective_date,
            'routing_warning', jsonb_build_object('missing_hr_assignee', v_hr_assignee is null)
        ),
        v_from_property_id, v_from_department_id
    ) returning id into v_request_id;

    insert into public.request_steps (request_id, step_order, assignee_id, assignee_role, status)
    values (v_request_id, 1, v_hr_assignee, v_hr_role, 'pending');

    return jsonb_build_object('success', true, 'request_id', v_request_id, 'transfer_id', v_transfer_id, 'assigned_to', v_hr_assignee);
end;
$function$;

-- ---------------------------------------------------------------------------
-- process_due_promotions: real table, real columns, applied_at gating
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_due_promotions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_promo record;
  v_count integer := 0;
  v_valid_role boolean;
begin
  for v_promo in
    select ep.*
    from public.employee_promotions ep
    join public.requests r
      on r.entity_id = ep.id and r.entity_type = 'promotion'
    where r.status = 'approved'
      and ep.applied_at is null
      and coalesce(ep.is_deleted, false) = false
      and ep.effective_date <= current_date
  loop
    v_valid_role := v_promo.to_role IS NOT NULL
                    AND v_promo.to_role = ANY (enum_range(NULL::public.app_role)::text[]);

    if v_promo.to_title is not null and length(trim(v_promo.to_title)) > 0 then
      insert into public.job_titles (title, category, default_role, department_id)
      values (
        trim(v_promo.to_title),
        coalesce((select d.name from public.departments d where d.id = v_promo.to_department_id), 'General'),
        case when v_valid_role then v_promo.to_role::public.app_role else 'staff'::public.app_role end,
        v_promo.to_department_id
      )
      on conflict (title) do nothing;
    end if;

    update public.profiles
    set job_title = coalesce(v_promo.to_title, job_title), updated_at = now()
    where id = v_promo.employee_id;

    if v_valid_role then
      delete from public.user_roles where user_id = v_promo.employee_id;
      insert into public.user_roles (user_id, role)
      values (v_promo.employee_id, v_promo.to_role::public.app_role)
      on conflict (user_id, role) do nothing;
    end if;

    if v_promo.to_department_id is not null then
      delete from public.user_departments where user_id = v_promo.employee_id;
      insert into public.user_departments (user_id, department_id)
      values (v_promo.employee_id, v_promo.to_department_id)
      on conflict (user_id, department_id) do nothing;
    end if;

    update public.employee_promotions
    set applied_at = now(), updated_at = now()
    where id = v_promo.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;

-- ---------------------------------------------------------------------------
-- process_due_transfers: real table, applied_at gating
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_due_transfers()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_transfer RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_transfer IN
        SELECT et.*
        FROM public.employee_transfers et
        JOIN public.requests r
          ON r.entity_id = et.id AND r.entity_type = 'transfer'
        WHERE r.status = 'approved'
          AND et.applied_at IS NULL
          AND et.effective_date <= CURRENT_DATE
    LOOP
        UPDATE public.user_properties
        SET property_id = v_transfer.to_property_id, updated_at = NOW()
        WHERE user_id = v_transfer.employee_id AND property_id = v_transfer.from_property_id;

        IF NOT FOUND THEN
             INSERT INTO public.user_properties (user_id, property_id)
             VALUES (v_transfer.employee_id, v_transfer.to_property_id)
             ON CONFLICT (user_id, property_id) DO NOTHING;
        END IF;

        IF v_transfer.to_department_id IS NOT NULL THEN
             UPDATE public.user_departments
             SET department_id = v_transfer.to_department_id
             WHERE user_id = v_transfer.employee_id AND department_id = v_transfer.from_department_id;

             IF NOT FOUND THEN
                INSERT INTO public.user_departments (user_id, department_id)
                VALUES (v_transfer.employee_id, v_transfer.to_department_id)
                ON CONFLICT (user_id, department_id) DO NOTHING;
             END IF;
        ELSIF v_transfer.from_department_id IS NOT NULL THEN
            DELETE FROM public.user_departments
            WHERE user_id = v_transfer.employee_id AND department_id = v_transfer.from_department_id;
        END IF;

        UPDATE public.employee_transfers
        SET applied_at = NOW(), updated_at = NOW()
        WHERE id = v_transfer.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$function$;

-- ---------------------------------------------------------------------------
-- process_request_finalization: no entity-table status writes; just apply
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_request_finalization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
        IF NEW.entity_type = 'promotion' THEN
            PERFORM public.process_due_promotions();
        ELSIF NEW.entity_type = 'transfer' THEN
            PERFORM public.process_due_transfers();
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- cancel_request: stop writing a non-existent `status` column on entity tables
-- ---------------------------------------------------------------------------
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
  v_note_suffix TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
  END IF;

  SELECT requester_id, entity_type, entity_id, status
  INTO v_requester_id, v_entity_type, v_entity_id, v_status
  FROM public.requests WHERE id = p_request_id FOR UPDATE;

  IF v_entity_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
  END IF;

  IF v_status NOT IN ('pending', 'pending_hr_review', 'pending_supervisor_approval', 'pending_approval') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot cancel a request that is not pending.');
  END IF;

  IF auth.uid() IS DISTINCT FROM v_requester_id AND NOT public.is_hr_or_admin(auth.uid())
     AND NOT public.has_role(auth.uid(), 'property_manager'::public.app_role) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorized to cancel this request.');
  END IF;

  UPDATE public.requests
  SET status = 'cancelled', current_assignee_id = NULL, closed_at = NOW(), updated_at = NOW()
  WHERE id = p_request_id;

  UPDATE public.request_steps
  SET status = 'cancelled', acted_at = NOW()
  WHERE request_id = p_request_id AND status = 'pending';

  v_note_suffix := CASE WHEN COALESCE(TRIM(p_reason), '') = '' THEN NULL
                        ELSE '[Cancelled: ' || TRIM(p_reason) || ']' END;

  IF v_note_suffix IS NOT NULL THEN
    IF v_entity_type = 'promotion' THEN
      UPDATE public.employee_promotions
      SET notes = CONCAT_WS(' ', NULLIF(notes, ''), v_note_suffix), updated_at = NOW()
      WHERE id = v_entity_id;
    ELSIF v_entity_type = 'transfer' THEN
      UPDATE public.employee_transfers
      SET notes = CONCAT_WS(' ', NULLIF(notes, ''), v_note_suffix), updated_at = NOW()
      WHERE id = v_entity_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Request cancelled successfully.');
END;
$function$;

-- ---------------------------------------------------------------------------
-- update_request_details: correct promotion column names
-- ---------------------------------------------------------------------------
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
    v_status TEXT;
BEGIN
    SELECT entity_type, entity_id, metadata, requester_id, status
    INTO v_entity_type, v_entity_id, v_current_metadata, v_requester_id, v_status
    FROM public.requests WHERE id = p_request_id;

    IF v_entity_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
    END IF;

    IF auth.uid() IS DISTINCT FROM v_requester_id AND NOT public.is_hr_or_admin(auth.uid())
       AND NOT public.has_role(auth.uid(), 'property_manager'::public.app_role) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized to edit this request.');
    END IF;

    IF v_status NOT IN ('pending', 'pending_hr_review', 'pending_supervisor_approval', 'pending_approval', 'returned_for_correction') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot edit a request that is no longer open.');
    END IF;

    IF v_entity_type = 'promotion' THEN
        UPDATE public.employee_promotions SET
            effective_date   = CASE WHEN p_updates ? 'effective_date'    THEN (p_updates->>'effective_date')::DATE ELSE effective_date END,
            to_role          = CASE WHEN p_updates ? 'to_role'           THEN (p_updates->>'to_role')
                                    WHEN p_updates ? 'new_role'          THEN (p_updates->>'new_role') ELSE to_role END,
            to_title         = CASE WHEN p_updates ? 'to_title'          THEN (p_updates->>'to_title')
                                    WHEN p_updates ? 'new_job_title'     THEN (p_updates->>'new_job_title') ELSE to_title END,
            to_department_id = CASE WHEN p_updates ? 'to_department_id'  THEN (p_updates->>'to_department_id')::UUID
                                    WHEN p_updates ? 'new_department_id' THEN (p_updates->>'new_department_id')::UUID ELSE to_department_id END,
            notes            = CASE WHEN p_updates ? 'notes'             THEN (p_updates->>'notes') ELSE notes END,
            updated_at = NOW()
        WHERE id = v_entity_id;

    ELSIF v_entity_type = 'transfer' THEN
        UPDATE public.employee_transfers SET
            effective_date   = CASE WHEN p_updates ? 'effective_date'   THEN (p_updates->>'effective_date')::DATE ELSE effective_date END,
            to_property_id   = CASE WHEN p_updates ? 'to_property_id'   THEN (p_updates->>'to_property_id')::UUID ELSE to_property_id END,
            to_department_id = CASE WHEN p_updates ? 'to_department_id' THEN (p_updates->>'to_department_id')::UUID ELSE to_department_id END,
            notes            = CASE WHEN p_updates ? 'notes'            THEN (p_updates->>'notes') ELSE notes END,
            updated_at = NOW()
        WHERE id = v_entity_id;
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Unsupported request type for editing.');
    END IF;

    UPDATE public.requests
    SET metadata = COALESCE(v_current_metadata, '{}'::jsonb) || p_updates, updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'message', 'Request details updated.');
END;
$function$;
