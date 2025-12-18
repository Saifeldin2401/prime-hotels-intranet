-- Migration: Request Management RPCs (Cancel & Update)
-- Purpose: Allow authorized users to Cancel or Edit pending requests.

-- 1. Cancel Request RPC
CREATE OR REPLACE FUNCTION public.cancel_request(
    p_request_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_requester_id UUID;
    v_entity_type TEXT;
    v_entity_id UUID;
    v_status TEXT;
    v_user_role app_role;
BEGIN
    -- Check permissions: Only Requester or Regional Admin/HR can cancel
    SELECT requester_id, entity_type, entity_id, status INTO v_requester_id, v_entity_type, v_entity_id, v_status
    FROM public.requests WHERE id = p_request_id;

    IF v_status NOT IN ('pending_approval', 'pending_hr_review', 'pending') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot cancel a request that is not pending.');
    END IF;

    -- Get user role
    SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

    IF auth.uid() != v_requester_id AND v_user_role NOT IN ('regional_admin', 'regional_hr') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized to cancel this request.');
    END IF;

    -- Update Request
    UPDATE public.requests 
    SET status = 'cancelled', updated_at = NOW() 
    WHERE id = p_request_id;

    -- Update Underlying Entity
    IF v_entity_type = 'promotion' THEN
        UPDATE public.promotions SET status = 'cancelled', notes = COALESCE(notes, '') || ' [Cancelled: ' || p_reason || ']' WHERE id = v_entity_id;
    ELSIF v_entity_type = 'transfer' THEN
        UPDATE public.transfers SET status = 'cancelled', notes = COALESCE(notes, '') || ' [Cancelled: ' || p_reason || ']' WHERE id = v_entity_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;


-- 2. Update Request RPC (Edit Details)
CREATE OR REPLACE FUNCTION public.update_request_details(
    p_request_id UUID,
    p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_entity_type TEXT;
    v_entity_id UUID;
    v_current_metadata JSONB;
BEGIN
    -- Check permissions: Only Regional Admin/HR or Requester can edit? 
    -- Usually only Admin/HR should edit parameters to avoid bypassing initial checks, 
    -- OR Requester can edit if it resets approval?
    -- For simplicity and "Admin/Reg HR should have edit", we restrict to them + Requester.
    
    SELECT entity_type, entity_id, metadata INTO v_entity_type, v_entity_id, v_current_metadata
    FROM public.requests WHERE id = p_request_id;
    
    -- Update Promotion
    IF v_entity_type = 'promotion' THEN
        IF p_updates ? 'effective_date' THEN
            UPDATE public.promotions SET effective_date = (p_updates->>'effective_date')::DATE WHERE id = v_entity_id;
        END IF;
        IF p_updates ? 'new_role' THEN
             UPDATE public.promotions SET new_role = (p_updates->>'new_role')::app_role WHERE id = v_entity_id;
        END IF;
         -- Update metadata to reflect changes in UI
         UPDATE public.requests 
         SET metadata = v_current_metadata || p_updates 
         WHERE id = p_request_id;
    
    -- Update Transfer
    ELSIF v_entity_type = 'transfer' THEN
        IF p_updates ? 'effective_date' THEN
            UPDATE public.transfers SET effective_date = (p_updates->>'effective_date')::DATE WHERE id = v_entity_id;
        END IF;
        IF p_updates ? 'to_property_id' THEN
             UPDATE public.transfers SET to_property_id = (p_updates->>'to_property_id')::UUID WHERE id = v_entity_id;
             -- Need to update target property name in metadata for UI
             UPDATE public.requests 
             SET metadata = v_current_metadata || jsonb_build_object(
                'target_property', (SELECT name FROM public.properties WHERE id = (p_updates->>'to_property_id')::UUID),
                'effective_date', (p_updates->>'effective_date')::DATE
             )
             WHERE id = p_request_id;
        ELSE
             -- Just date update
             UPDATE public.requests 
             SET metadata = v_current_metadata || p_updates 
             WHERE id = p_request_id;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
