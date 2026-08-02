-- ============================================================================
-- MIGRATION: fix_document_approval_impersonation
-- approve_document_atomic/reject_document_atomic delegate authorization to
-- can_user_act_on_document_approval(p_approver_id, p_approval_id) -- but
-- p_approver_id is a caller-supplied PARAMETER, never checked against
-- auth.uid(). can_user_act_on_document_approval only verifies that the
-- passed-in id genuinely is the approver/delegate -- it has no way to know
-- whether the actual caller IS that person. Any authenticated user could
-- approve/reject any pending document by passing the real approver's user
-- id as p_approver_id; the check passes, and the record is stamped
-- approved_by/rejected_by = p_approver_id (impersonation, not just an
-- authorization bypass -- the audit trail itself is falsified).
--
-- Fix: require p_approver_id = auth.uid() at the top of both functions,
-- mirroring the pattern already correctly used in approve_leave_request/
-- reject_leave_request. Delegation semantics are preserved: a delegate
-- calls the function as themselves (auth.uid() = their own id), passing
-- their own id as p_approver_id, and can_user_act_on_document_approval
-- checks whether THAT (now-verified) id is a valid delegate.
--
-- Verified via rolled-back functional tests: an attacker passing the real
-- approver's id as p_approver_id while authenticated as a different user
-- -> blocked with "Unauthorized: Approver ID mismatch"; the real approver
-- calling with their own id -> succeeds and publishes the document.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-02.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_document_atomic(p_approval_id uuid, p_approver_id uuid, p_feedback text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_document_id uuid;
  v_document_title text;
  v_document_author uuid;
  v_remaining_pending integer;
  v_delegator_id uuid;
  v_delegation_id uuid;
  v_max_approvals integer;
  v_approvals_used integer;
  v_notify_on_action boolean;
  v_notify_delegator boolean;
  v_delegate_name text;
  v_is_delegate boolean := false;
begin
  if p_approver_id is distinct from auth.uid() then
    raise exception 'Unauthorized: Approver ID mismatch';
  end if;

  if not public.can_user_act_on_document_approval(p_approver_id, p_approval_id) then
    raise exception 'Not authorized to approve this item';
  end if;

  select da.document_id, da.approver_id
  into v_document_id, v_delegator_id
  from public.document_approvals da
  where da.id = p_approval_id
  for update;

  select ta.id,
         ta.max_approvals,
         ta.approvals_used,
         ta.notify_on_action,
         ta.notify_delegator
  into v_delegation_id,
       v_max_approvals,
       v_approvals_used,
       v_notify_on_action,
       v_notify_delegator
  from public.delegations ta
  join public.documents d on d.id = v_document_id
  where ta.delegation_category = 'temporary_approval'
    and ta.delegator_id = v_delegator_id
    and (ta.delegate_id = p_approver_id or p_approver_id = any(ta.fallback_delegate_ids))
    and ta.starts_at <= now()
    and ta.ends_at >= now()
    and (
      (ta.entity_type is not null and ta.entity_id is not null
       and ta.entity_type = 'document_approval'
       and ta.entity_id = p_approval_id)
      or
      (ta.entity_type is null and ta.entity_id is null
       and (
         ta.scope_type = 'all'
         or (ta.scope_type = 'property' and ta.scope_id is not distinct from d.property_id)
         or (ta.scope_type = 'department' and ta.scope_id is not distinct from d.department_id)
       ))
    )
  order by (ta.entity_id is not null) desc, (ta.entity_type is not null) desc, ta.starts_at desc
  limit 1;

  v_is_delegate := v_delegation_id is not null and p_approver_id <> v_delegator_id;

  if v_is_delegate and v_max_approvals is not null and v_approvals_used >= v_max_approvals then
    raise exception 'Delegation approval limit reached';
  end if;

  update public.document_approvals
  set status = 'approved',
      approved_at = now(),
      feedback = coalesce(p_feedback, feedback),
      approved_by = p_approver_id,
      is_active = false,
      updated_at = now()
  where id = p_approval_id
    and status = 'pending'
    and is_active = true;

  if v_is_delegate then
    update public.delegations
    set approvals_used = coalesce(approvals_used, 0) + 1
    where id = v_delegation_id;
  end if;

  select d.title, d.created_by
  into v_document_title, v_document_author
  from public.documents d
  where d.id = v_document_id;

  if v_is_delegate and coalesce(v_notify_on_action, true) and coalesce(v_notify_delegator, true) then
    select full_name into v_delegate_name from public.profiles where id = p_approver_id;
    if v_delegator_id is not null and v_delegator_id <> p_approver_id then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        v_delegator_id,
        'request_approved'::public.notification_type,
        'Delegated Approval Completed',
        coalesce(v_delegate_name, 'A delegate') || ' approved a document on your behalf.',
        jsonb_build_object(
          'entity_type', 'document_approval',
          'entity_id', p_approval_id,
          'document_id', v_document_id
        )
      );
    end if;
  end if;

  select count(*)
  into v_remaining_pending
  from public.document_approvals
  where document_id = v_document_id
    and status = 'pending'
    and is_active = true;

  if v_remaining_pending = 0 then
    update public.documents
    set status = 'PUBLISHED',
        updated_at = now()
    where id = v_document_id;

    if v_document_author is not null and v_document_author <> p_approver_id then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        v_document_author,
        'request_approved'::public.notification_type,
        'Document Approved',
        'Your document "' || coalesce(v_document_title, 'Document') || '" has been approved and published.',
        jsonb_build_object(
          'entity_type', 'document',
          'entity_id', v_document_id,
          'link', '/documents/' || v_document_id::text,
          'approval_id', p_approval_id,
          'published', true
        )
      );
    end if;

    return jsonb_build_object('success', true, 'document_id', v_document_id, 'published', true);
  end if;

  return jsonb_build_object('success', true, 'document_id', v_document_id, 'published', false, 'remaining_pending', v_remaining_pending);
end;
$function$;

CREATE OR REPLACE FUNCTION public.reject_document_atomic(p_approval_id uuid, p_approver_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_document_id uuid;
  v_document_title text;
  v_document_author uuid;
  v_delegator_id uuid;
  v_delegation_id uuid;
  v_max_approvals integer;
  v_approvals_used integer;
  v_notify_on_action boolean;
  v_notify_delegator boolean;
  v_delegate_name text;
  v_is_delegate boolean := false;
begin
  if p_approver_id is distinct from auth.uid() then
    raise exception 'Unauthorized: Approver ID mismatch';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Rejection reason is required';
  end if;

  if not public.can_user_act_on_document_approval(p_approver_id, p_approval_id) then
    raise exception 'Not authorized to reject this item';
  end if;

  select da.document_id, da.approver_id
  into v_document_id, v_delegator_id
  from public.document_approvals da
  where da.id = p_approval_id
  for update;

  select ta.id,
         ta.max_approvals,
         ta.approvals_used,
         ta.notify_on_action,
         ta.notify_delegator
  into v_delegation_id,
       v_max_approvals,
       v_approvals_used,
       v_notify_on_action,
       v_notify_delegator
  from public.delegations ta
  join public.documents d on d.id = v_document_id
  where ta.delegation_category = 'temporary_approval'
    and ta.delegator_id = v_delegator_id
    and (ta.delegate_id = p_approver_id or p_approver_id = any(ta.fallback_delegate_ids))
    and ta.starts_at <= now()
    and ta.ends_at >= now()
    and (
      (ta.entity_type is not null and ta.entity_id is not null
       and ta.entity_type = 'document_approval'
       and ta.entity_id = p_approval_id)
      or
      (ta.entity_type is null and ta.entity_id is null
       and (
         ta.scope_type = 'all'
         or (ta.scope_type = 'property' and ta.scope_id is not distinct from d.property_id)
         or (ta.scope_type = 'department' and ta.scope_id is not distinct from d.department_id)
       ))
    )
  order by (ta.entity_id is not null) desc, (ta.entity_type is not null) desc, ta.starts_at desc
  limit 1;

  v_is_delegate := v_delegation_id is not null and p_approver_id <> v_delegator_id;

  if v_is_delegate and v_max_approvals is not null and v_approvals_used >= v_max_approvals then
    raise exception 'Delegation approval limit reached';
  end if;

  update public.document_approvals
  set status = 'rejected',
      rejected_at = now(),
      rejected_by = p_approver_id,
      rejection_reason = p_reason,
      is_active = false,
      updated_at = now()
  where id = p_approval_id
    and status = 'pending'
    and is_active = true;

  if v_is_delegate then
    update public.delegations
    set approvals_used = coalesce(approvals_used, 0) + 1
    where id = v_delegation_id;
  end if;

  update public.documents
  set status = 'REJECTED',
      updated_at = now()
  where id = v_document_id;

  select d.title, d.created_by
  into v_document_title, v_document_author
  from public.documents d
  where d.id = v_document_id;

  if v_is_delegate and coalesce(v_notify_on_action, true) and coalesce(v_notify_delegator, true) then
    select full_name into v_delegate_name from public.profiles where id = p_approver_id;
    if v_delegator_id is not null and v_delegator_id <> p_approver_id then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        v_delegator_id,
        'request_rejected'::public.notification_type,
        'Delegated Approval Completed',
        coalesce(v_delegate_name, 'A delegate') || ' rejected a document on your behalf.',
        jsonb_build_object(
          'entity_type', 'document_approval',
          'entity_id', p_approval_id,
          'document_id', v_document_id
        )
      );
    end if;
  end if;

  if v_document_author is not null and v_document_author <> p_approver_id then
    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      v_document_author,
      'request_rejected'::public.notification_type,
      'Document Rejected',
      'Your document "' || coalesce(v_document_title, 'Document') || '" was rejected. Reason: ' || p_reason,
      jsonb_build_object(
        'entity_type', 'document',
        'entity_id', v_document_id,
        'link', '/documents/' || v_document_id::text,
        'approval_id', p_approval_id
      )
    );
  end if;

  return jsonb_build_object('success', true, 'document_id', v_document_id, 'rejected', true);
end;
$function$;
