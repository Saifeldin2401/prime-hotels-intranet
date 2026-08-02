-- ============================================================================
-- MIGRATION: fix_approve_reject_leave_request_missing_authority_check
-- approve_leave_request/reject_leave_request only verified that the caller
-- matched the approver_id/rejector_id PARAMETER they themselves supplied
-- (`if approver_id != auth.uid() then raise exception`) -- they never
-- checked that the caller is actually AUTHORIZED to approve that specific
-- request. A dedicated authority-check function, can_approve_leave(approver_id,
-- property_id, department_id), already exists in the schema (role +
-- property/department scoping) but was never called from either function.
-- Any authenticated employee could approve or reject any other employee's
-- pending leave request org-wide, including their own.
--
-- Fix: fetch the request's property_id/department_id, call
-- can_approve_leave(auth.uid(), ...) before updating, reject if false.
--
-- Verified via rolled-back functional tests: an unrelated employee (no
-- role) attempting to approve another employee's pending request ->
-- blocked with "Unauthorized: you are not authorized to approve this leave
-- request"; a regional_admin -> succeeds.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-02.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_leave_request(request_id uuid, approver_id uuid, notification_payload jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request leave_requests%rowtype;
  v_property_id uuid;
  v_department_id uuid;
begin
  if approver_id != auth.uid() then
    raise exception 'Unauthorized: Approver ID mismatch';
  end if;

  select property_id, department_id into v_property_id, v_department_id
  from leave_requests where id = request_id;

  if not found then
    raise exception 'Leave request not found or not pending';
  end if;

  if not public.can_approve_leave(approver_id, v_property_id, v_department_id) then
    raise exception 'Unauthorized: you are not authorized to approve this leave request';
  end if;

  update leave_requests
  set status = 'approved',
      approved_by_id = approver_id,
      updated_at = now()
  where id = request_id and status = 'pending'
  returning * into v_request;

  if not found then
    raise exception 'Leave request not found or not pending';
  end if;

  if notification_payload is not null then
    insert into notifications (user_id, type, title, message, link, metadata)
    values (
      nullif(notification_payload->>'user_id', '')::uuid,
      public.safe_notification_type(notification_payload->>'type', 'request_approved'::public.notification_type),
      notification_payload->>'title',
      notification_payload->>'message',
      notification_payload->>'link',
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_request);
end;
$function$;

CREATE OR REPLACE FUNCTION public.reject_leave_request(request_id uuid, rejector_id uuid, rejection_reason text, notification_payload jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_request leave_requests%rowtype;
  v_rejection_reason text := rejection_reason;
  v_property_id uuid;
  v_department_id uuid;
begin
  if rejector_id != auth.uid() then
    raise exception 'Unauthorized: Rejector ID mismatch';
  end if;

  select property_id, department_id into v_property_id, v_department_id
  from public.leave_requests where id = request_id;

  if not found then
    raise exception 'Leave request not found or not pending';
  end if;

  if not public.can_approve_leave(rejector_id, v_property_id, v_department_id) then
    raise exception 'Unauthorized: you are not authorized to reject this leave request';
  end if;

  update public.leave_requests
  set status = 'rejected'::public.entity_status,
      rejected_by_id = rejector_id,
      rejection_reason = v_rejection_reason,
      updated_at = now()
  where id = request_id
    and status = 'pending'::public.entity_status
  returning * into v_request;

  if not found then
    raise exception 'Leave request not found or not pending';
  end if;

  if notification_payload is not null then
    insert into public.notifications (user_id, type, title, message, link, metadata)
    values (
      nullif(notification_payload->>'user_id', '')::uuid,
      public.safe_notification_type(notification_payload->>'type', 'request_rejected'::public.notification_type),
      notification_payload->>'title',
      notification_payload->>'message',
      notification_payload->>'link',
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_request);
end;
$function$;
