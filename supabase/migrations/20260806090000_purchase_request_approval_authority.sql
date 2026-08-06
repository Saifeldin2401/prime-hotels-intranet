-- PurchaseRequests.tsx let any user with property access -- including the request's own
-- author -- approve/reject it via a direct client-side `.update()`, because the RLS UPDATE
-- policy only checked has_property_access() OR requested_by = auth.uid(), with no restriction
-- on which columns changed. This adds a real approval-authority check (mirroring
-- can_approve_leave's property/department scoping) behind a SECURITY DEFINER RPC, and narrows
-- the RLS UPDATE policy so a direct client write can no longer change status/approved_by at
-- all -- only the RPC path can decide a request now, and it explicitly forbids self-approval.

CREATE OR REPLACE FUNCTION public.can_approve_purchase_request(_approver_id uuid, _property_id uuid, _department_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF has_role(_approver_id, 'corporate_admin'::app_role)
        OR has_role(_approver_id, 'regional_admin'::app_role)
        OR has_role(_approver_id, 'regional_hr'::app_role) THEN
        RETURN true;
    END IF;

    IF has_any_role(_approver_id, ARRAY['property_manager', 'property_hr', 'department_head']::app_role[]) THEN
        IF NOT has_property_access(_approver_id, _property_id) THEN
            RETURN false;
        END IF;

        IF has_role(_approver_id, 'department_head'::app_role)
            AND NOT has_role(_approver_id, 'property_manager'::app_role)
            AND NOT has_role(_approver_id, 'property_hr'::app_role) THEN
            RETURN _department_id IS NOT NULL AND _department_id = ANY(get_user_departments(_approver_id));
        END IF;

        RETURN true;
    END IF;

    RETURN false;
END;
$function$;

COMMENT ON FUNCTION public.can_approve_purchase_request IS
    'Approval-authority check for purchase requests: regional tier is global, property_manager/property_hr are property-scoped, department_head is property+department-scoped, staff cannot approve.';

CREATE OR REPLACE FUNCTION public.decide_purchase_request(p_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_request public.purchase_requests%ROWTYPE;
BEGIN
    IF p_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;

    SELECT * INTO v_request FROM public.purchase_requests WHERE id = p_id AND status = 'pending';
    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Purchase request not found or not pending';
    END IF;

    IF v_request.requested_by = auth.uid() THEN
        RAISE EXCEPTION 'You cannot approve or reject your own purchase request';
    END IF;

    IF NOT public.can_approve_purchase_request(auth.uid(), v_request.property_id, v_request.department_id) THEN
        RAISE EXCEPTION 'Not authorized to decide this purchase request';
    END IF;

    UPDATE public.purchase_requests
    SET status = p_status, approved_by = auth.uid(), approved_at = now(), updated_at = now()
    WHERE id = p_id;

    INSERT INTO public.notifications (user_id, type, title, message, link, entity_type, entity_id)
    VALUES (
        v_request.requested_by,
        CASE WHEN p_status = 'approved' THEN 'purchase_request_approved' ELSE 'purchase_request_rejected' END,
        CASE WHEN p_status = 'approved' THEN 'Purchase request approved' ELSE 'Purchase request rejected' END,
        '"' || v_request.item_description || '" was ' || p_status || '.',
        '/procurement/requests',
        'purchase_request',
        p_id
    );
END;
$function$;

COMMENT ON FUNCTION public.decide_purchase_request IS
    'Approves or rejects a pending purchase request. Blocks self-approval and enforces can_approve_purchase_request authority.';

REVOKE EXECUTE ON FUNCTION public.decide_purchase_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_purchase_request(uuid, text) TO authenticated;

-- Narrow direct client writes: requester may still edit their own request while pending
-- (item/quantity/cost/justification), but can no longer change status/approved_by themselves,
-- and non-requester property-access holders can no longer write to this table directly at all
-- -- decide_purchase_request() above is now the only path to approve/reject.
DROP POLICY IF EXISTS purchase_requests_update ON public.purchase_requests;
CREATE POLICY purchase_requests_update ON public.purchase_requests
FOR UPDATE
USING (requested_by = auth.uid() AND status = 'pending')
WITH CHECK (requested_by = auth.uid() AND status = 'pending');
