-- Phase 2: Expense claims + workflow approvals integration

BEGIN;

CREATE OR REPLACE FUNCTION public.can_view_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.can_view_request(auth.uid(), p_request_id);
$$;

GRANT EXECUTE ON FUNCTION public.can_view_request(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('travel', 'meals', 'accommodation', 'transport', 'supplies', 'training', 'medical', 'other')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'SAR',
  expense_date date NOT NULL,
  vendor_name text,
  description text,
  receipt_bucket text NOT NULL DEFAULT 'expense-receipts',
  receipt_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'returned_for_correction', 'paid', 'cancelled')),
  workflow_request_id uuid UNIQUE REFERENCES public.requests(id) ON DELETE SET NULL,
  approved_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  rejection_reason text,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_claims_requester_created
  ON public.expense_claims(requester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expense_claims_status_created
  ON public.expense_claims(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expense_claims_property_status
  ON public.expense_claims(property_id, status);

CREATE INDEX IF NOT EXISTS idx_expense_claims_workflow_request
  ON public.expense_claims(workflow_request_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'update_expense_claims_updated_at'
     ) THEN
    CREATE TRIGGER update_expense_claims_updated_at
      BEFORE UPDATE ON public.expense_claims
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_claims_select ON public.expense_claims;
CREATE POLICY expense_claims_select
  ON public.expense_claims
  FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR (
      workflow_request_id IS NOT NULL
      AND public.can_view_request(workflow_request_id)
    )
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  );

DROP POLICY IF EXISTS expense_claims_insert ON public.expense_claims;
CREATE POLICY expense_claims_insert
  ON public.expense_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('corporate_admin'::public.app_role)
  );

DROP POLICY IF EXISTS expense_claims_update ON public.expense_claims;
CREATE POLICY expense_claims_update
  ON public.expense_claims
  FOR UPDATE
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
  )
  WITH CHECK (
    requester_id = auth.uid()
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-receipts',
  'expense-receipts',
  false,
  25 * 1024 * 1024,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.expense_claim_id_from_storage_path(storage_path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (split_part(storage_path, '/', 1))::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS expense_receipts_select_authorized ON storage.objects;
CREATE POLICY expense_receipts_select_authorized
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1
      FROM public.expense_claims ec
      WHERE ec.id = public.expense_claim_id_from_storage_path(name)
        AND (
          ec.requester_id = auth.uid()
          OR (
            ec.workflow_request_id IS NOT NULL
            AND public.can_view_request(ec.workflow_request_id)
          )
          OR public.has_role_optimized('corporate_admin'::public.app_role)
          OR public.has_role_optimized('regional_admin'::public.app_role)
          OR public.has_role_optimized('regional_hr'::public.app_role)
          OR public.has_role_optimized('property_hr'::public.app_role)
          OR public.has_role_optimized('property_manager'::public.app_role)
        )
    )
  );

DROP POLICY IF EXISTS expense_receipts_insert_owner ON storage.objects;
CREATE POLICY expense_receipts_insert_owner
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1
      FROM public.expense_claims ec
      WHERE ec.id = public.expense_claim_id_from_storage_path(name)
        AND (
          ec.requester_id = auth.uid()
          OR public.has_role_optimized('corporate_admin'::public.app_role)
          OR public.has_role_optimized('regional_admin'::public.app_role)
          OR public.has_role_optimized('regional_hr'::public.app_role)
          OR public.has_role_optimized('property_hr'::public.app_role)
          OR public.has_role_optimized('property_manager'::public.app_role)
        )
    )
  );

DROP POLICY IF EXISTS expense_receipts_update_owner ON storage.objects;
CREATE POLICY expense_receipts_update_owner
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1
      FROM public.expense_claims ec
      WHERE ec.id = public.expense_claim_id_from_storage_path(name)
        AND (
          ec.requester_id = auth.uid()
          OR public.has_role_optimized('corporate_admin'::public.app_role)
          OR public.has_role_optimized('regional_admin'::public.app_role)
          OR public.has_role_optimized('regional_hr'::public.app_role)
          OR public.has_role_optimized('property_hr'::public.app_role)
          OR public.has_role_optimized('property_manager'::public.app_role)
        )
    )
  )
  WITH CHECK (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1
      FROM public.expense_claims ec
      WHERE ec.id = public.expense_claim_id_from_storage_path(name)
        AND (
          ec.requester_id = auth.uid()
          OR public.has_role_optimized('corporate_admin'::public.app_role)
          OR public.has_role_optimized('regional_admin'::public.app_role)
          OR public.has_role_optimized('regional_hr'::public.app_role)
          OR public.has_role_optimized('property_hr'::public.app_role)
          OR public.has_role_optimized('property_manager'::public.app_role)
        )
    )
  );

DROP POLICY IF EXISTS expense_receipts_delete_owner ON storage.objects;
CREATE POLICY expense_receipts_delete_owner
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1
      FROM public.expense_claims ec
      WHERE ec.id = public.expense_claim_id_from_storage_path(name)
        AND (
          ec.requester_id = auth.uid()
          OR public.has_role_optimized('corporate_admin'::public.app_role)
          OR public.has_role_optimized('regional_admin'::public.app_role)
          OR public.has_role_optimized('regional_hr'::public.app_role)
          OR public.has_role_optimized('property_hr'::public.app_role)
          OR public.has_role_optimized('property_manager'::public.app_role)
        )
    )
  );

CREATE OR REPLACE FUNCTION public.submit_expense_claim(
  p_category text,
  p_amount numeric,
  p_currency text DEFAULT 'SAR'::text,
  p_expense_date date DEFAULT CURRENT_DATE,
  p_vendor_name text DEFAULT NULL::text,
  p_description text DEFAULT NULL::text,
  p_property_id uuid DEFAULT NULL::uuid,
  p_department_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claim_id uuid;
  v_request_id uuid;
  v_request_no bigint;
  v_requester_id uuid := auth.uid();
  v_property_id uuid := p_property_id;
  v_department_id uuid := p_department_id;
  v_supervisor_id uuid;
  v_hr_assignee uuid;
  v_initial_status text;
  v_supervisor_role public.app_role := 'manager'::public.app_role;
  v_hr_role public.app_role := 'regional_hr'::public.app_role;
BEGIN
  IF v_requester_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  IF p_category IS NULL OR length(trim(p_category)) = 0 THEN
    RAISE EXCEPTION 'Category is required';
  END IF;

  IF v_property_id IS NULL THEN
    SELECT up.property_id
    INTO v_property_id
    FROM public.user_properties up
    WHERE up.user_id = v_requester_id
    ORDER BY up.created_at ASC
    LIMIT 1;
  END IF;

  IF v_department_id IS NULL THEN
    SELECT ud.department_id
    INTO v_department_id
    FROM public.user_departments ud
    WHERE ud.user_id = v_requester_id
    ORDER BY ud.created_at ASC
    LIMIT 1;
  END IF;

  SELECT p.reporting_to
  INTO v_supervisor_id
  FROM public.profiles p
  WHERE p.id = v_requester_id;

  v_hr_assignee := public.find_hr_assignee(v_property_id);

  IF v_supervisor_id IS NOT NULL THEN
    SELECT ur.role
    INTO v_supervisor_role
    FROM public.user_roles ur
    WHERE ur.user_id = v_supervisor_id
    ORDER BY CASE ur.role
      WHEN 'property_manager' THEN 1
      WHEN 'department_head' THEN 2
      WHEN 'manager' THEN 3
      WHEN 'property_hr' THEN 4
      WHEN 'regional_hr' THEN 5
      WHEN 'regional_admin' THEN 6
      WHEN 'corporate_admin' THEN 7
      ELSE 100
    END
    LIMIT 1;
    IF v_supervisor_role IS NULL THEN
      v_supervisor_role := 'manager'::public.app_role;
    END IF;
  END IF;

  IF v_hr_assignee IS NOT NULL THEN
    SELECT ur.role
    INTO v_hr_role
    FROM public.user_roles ur
    WHERE ur.user_id = v_hr_assignee
      AND ur.role IN ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
    ORDER BY CASE ur.role
      WHEN 'property_hr' THEN 1
      WHEN 'regional_hr' THEN 2
      WHEN 'regional_admin' THEN 3
      WHEN 'corporate_admin' THEN 4
      ELSE 100
    END
    LIMIT 1;
    IF v_hr_role IS NULL THEN
      v_hr_role := 'regional_hr'::public.app_role;
    END IF;
  END IF;

  v_initial_status := CASE
    WHEN v_supervisor_id IS NULL THEN 'pending_hr_review'
    ELSE 'pending_supervisor_approval'
  END;

  INSERT INTO public.expense_claims (
    requester_id,
    property_id,
    department_id,
    category,
    amount,
    currency,
    expense_date,
    vendor_name,
    description,
    status,
    metadata
  )
  VALUES (
    v_requester_id,
    v_property_id,
    v_department_id,
    lower(trim(p_category)),
    p_amount,
    COALESCE(NULLIF(trim(p_currency), ''), 'SAR'),
    p_expense_date,
    NULLIF(trim(p_vendor_name), ''),
    NULLIF(trim(p_description), ''),
    'pending',
    jsonb_build_object(
      'source', 'submit_expense_claim',
      'submitted_at', now()
    )
  )
  RETURNING id INTO v_claim_id;

  INSERT INTO public.requests (
    entity_type,
    entity_id,
    requester_id,
    supervisor_id,
    current_assignee_id,
    status,
    submitted_at,
    property_id,
    department_id,
    metadata
  )
  VALUES (
    'expense_claim',
    v_claim_id,
    v_requester_id,
    v_supervisor_id,
    COALESCE(v_supervisor_id, v_hr_assignee),
    v_initial_status,
    now(),
    v_property_id,
    v_department_id,
    jsonb_build_object(
      'category', lower(trim(p_category)),
      'amount', p_amount,
      'currency', COALESCE(NULLIF(trim(p_currency), ''), 'SAR'),
      'expense_date', p_expense_date,
      'vendor_name', NULLIF(trim(p_vendor_name), ''),
      'property_id', v_property_id,
      'department_id', v_department_id,
      'routing_warning', jsonb_build_object(
        'missing_supervisor', v_supervisor_id IS NULL,
        'missing_hr_assignee', v_hr_assignee IS NULL
      )
    )
  )
  RETURNING id, request_no INTO v_request_id, v_request_no;

  UPDATE public.expense_claims
  SET workflow_request_id = v_request_id
  WHERE id = v_claim_id;

  IF v_supervisor_id IS NOT NULL THEN
    INSERT INTO public.request_steps (
      request_id,
      step_order,
      assignee_id,
      assignee_role,
      status,
      created_by
    )
    VALUES (
      v_request_id,
      1,
      v_supervisor_id,
      v_supervisor_role,
      'pending',
      v_requester_id
    );
  END IF;

  INSERT INTO public.request_steps (
    request_id,
    step_order,
    assignee_id,
    assignee_role,
    status,
    created_by
  )
  VALUES (
    v_request_id,
    CASE WHEN v_supervisor_id IS NOT NULL THEN 2 ELSE 1 END,
    v_hr_assignee,
    v_hr_role,
    CASE WHEN v_supervisor_id IS NULL THEN 'pending' ELSE 'waiting' END,
    v_requester_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'request_id', v_request_id,
    'request_no', v_request_no
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_expense_claim(text, numeric, text, date, text, text, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_secure_expense_receipt_url(p_claim_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claim record;
  v_signed_url text;
BEGIN
  SELECT ec.id, ec.requester_id, ec.workflow_request_id, ec.receipt_bucket, ec.receipt_path
  INTO v_claim
  FROM public.expense_claims ec
  WHERE ec.id = p_claim_id
  LIMIT 1;

  IF v_claim IS NULL THEN
    RAISE EXCEPTION 'Expense claim not found';
  END IF;

  IF v_claim.receipt_path IS NULL OR length(trim(v_claim.receipt_path)) = 0 THEN
    RAISE EXCEPTION 'Receipt not available';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    auth.uid() = v_claim.requester_id
    OR (v_claim.workflow_request_id IS NOT NULL AND public.can_view_request(v_claim.workflow_request_id))
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this receipt';
  END IF;

  SELECT storage.create_signed_url(
    COALESCE(NULLIF(v_claim.receipt_bucket, ''), 'expense-receipts'),
    v_claim.receipt_path,
    3600
  )
  INTO v_signed_url;

  RETURN v_signed_url;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_secure_expense_receipt_url(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_apply_action(
  p_request_id uuid,
  p_action text,
  p_comment text DEFAULT NULL::text,
  p_forward_to uuid DEFAULT NULL::uuid,
  p_visibility text DEFAULT 'all'::text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  req record;
  current_step record;
  next_step record;
  actor_id uuid := auth.uid();
  has_comment boolean := p_comment is not null and length(trim(p_comment)) > 0;
begin
  if actor_id is null then
    return query select false, 'Not authenticated';
    return;
  end if;

  select * into req from public.requests where id = p_request_id;
  if not found then
    return query select false, 'Request not found';
    return;
  end if;

  if not public.can_view_request(p_request_id) then
    return query select false, 'Access denied';
    return;
  end if;

  if p_action in ('reject', 'return') and not has_comment then
    return query select false, 'Comment is required for this action';
    return;
  end if;

  select * into current_step from public.request_steps
  where request_id = p_request_id and status = 'pending'
  order by step_order limit 1;

  if current_step.id is null and p_action in ('approve', 'reject', 'return', 'forward') then
    return query select false, 'No pending step found';
    return;
  end if;

  case p_action
    when 'approve' then
      update public.request_steps
      set status = 'approved', acted_at = now(), comment = p_comment
      where id = current_step.id;

      select * into next_step from public.request_steps
      where request_id = p_request_id and step_order > current_step.step_order and status = 'waiting'
      order by step_order limit 1;

      if next_step.id is not null then
        update public.request_steps
        set status = 'pending', assignee_id = next_step.assignee_id
        where id = next_step.id;

        update public.requests
        set status = 'pending_hr_review',
            current_assignee_id = next_step.assignee_id,
            last_action_at = now(),
            metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{routing_warning,missing_hr_assignee}', to_jsonb(next_step.assignee_id is null), true)
        where id = p_request_id;

        if req.entity_type = 'expense_claim' then
          update public.expense_claims
          set status = 'pending',
              updated_at = now()
          where id = req.entity_id;
        end if;

        if next_step.assignee_id is null then
          insert into public.notifications (user_id, type, title, message, metadata)
          select ur.user_id,
                 'escalation_alert'::public.notification_type,
                 'Routing issue: Missing HR assignee',
                 format('Request #%s has no HR assignee.', req.request_no),
                 jsonb_build_object('request_id', req.id, 'entity_type', req.entity_type, 'reason', 'missing_hr_assignee')
          from public.user_roles ur
          where ur.role in ('regional_admin', 'regional_hr', 'corporate_admin');
        end if;
      else
        update public.requests
        set status = 'approved',
            current_assignee_id = null,
            closed_at = now(),
            due_at = null,
            last_action_at = now()
        where id = p_request_id;

        if req.entity_type = 'leave_request' then
          update public.leave_requests
          set status = 'approved',
              approved_by_id = actor_id,
              updated_at = now()
          where id = req.entity_id;
        elsif req.entity_type = 'expense_claim' then
          update public.expense_claims
          set status = 'approved',
              approved_by_id = actor_id,
              approved_at = now(),
              rejected_by_id = null,
              rejected_at = null,
              rejection_reason = null,
              updated_at = now()
          where id = req.entity_id;
        end if;
      end if;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'approved', jsonb_build_object('comment', p_comment));

    when 'reject' then
      update public.request_steps
      set status = 'rejected', acted_at = now(), comment = p_comment
      where id = current_step.id;

      update public.requests
      set status = 'rejected',
          current_assignee_id = null,
          closed_at = now(),
          due_at = null,
          last_action_at = now()
      where id = p_request_id;

      if req.entity_type = 'leave_request' then
        update public.leave_requests
        set status = 'rejected',
            rejected_by_id = actor_id,
            rejection_reason = p_comment,
            updated_at = now()
        where id = req.entity_id;
      elsif req.entity_type = 'expense_claim' then
        update public.expense_claims
        set status = 'rejected',
            rejected_by_id = actor_id,
            rejected_at = now(),
            rejection_reason = p_comment,
            updated_at = now()
        where id = req.entity_id;
      end if;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'rejected', jsonb_build_object('comment', p_comment));

    when 'return' then
      update public.request_steps
      set status = 'returned', acted_at = now(), comment = p_comment
      where id = current_step.id;

      update public.requests
      set status = 'returned_for_correction',
          current_assignee_id = req.requester_id,
          due_at = null,
          last_action_at = now()
      where id = p_request_id;

      if req.entity_type = 'leave_request' then
        update public.leave_requests
        set status = 'pending',
            updated_at = now()
        where id = req.entity_id;
      elsif req.entity_type = 'expense_claim' then
        update public.expense_claims
        set status = 'returned_for_correction',
            updated_at = now()
        where id = req.entity_id;
      end if;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'returned_for_correction', jsonb_build_object('comment', p_comment));

    when 'forward' then
      update public.request_steps
      set assignee_id = p_forward_to,
          comment = p_comment,
          due_at = case
            when current_step.sla_hours is not null then now() + make_interval(hours => current_step.sla_hours)
            else current_step.due_at
          end
      where id = current_step.id;

      update public.requests
      set current_assignee_id = p_forward_to,
          last_action_at = now()
      where id = p_request_id;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'forwarded', jsonb_build_object('forward_to', p_forward_to, 'comment', p_comment));

    when 'close' then
      update public.requests
      set status = 'closed',
          current_assignee_id = null,
          closed_at = now(),
          due_at = null,
          last_action_at = now()
      where id = p_request_id;

      if req.entity_type = 'expense_claim' then
        update public.expense_claims
        set status = case when status = 'approved' then status else 'cancelled' end,
            updated_at = now()
        where id = req.entity_id;
      end if;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'closed', jsonb_build_object('comment', p_comment));

    when 'add_comment' then
      insert into public.request_comments (request_id, author_id, comment, visibility)
      values (p_request_id, actor_id, p_comment, p_visibility);

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'comment_added', jsonb_build_object('comment', p_comment, 'visibility', p_visibility));

      update public.requests
      set last_action_at = now()
      where id = p_request_id;
  end case;

  if p_action <> 'add_comment' and has_comment then
    insert into public.request_comments (request_id, author_id, comment, visibility)
    values (p_request_id, actor_id, p_comment, p_visibility);
  end if;

  return query select true, 'Action completed successfully';
end;
$function$;

GRANT EXECUTE ON FUNCTION public.request_apply_action(uuid, text, text, uuid, text) TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
