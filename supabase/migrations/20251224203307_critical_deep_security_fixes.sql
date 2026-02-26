-- ============================================
-- CRITICAL DEEP SECURITY FIXES
-- 1. Lock down Notifications (Prevent Forgery)
-- 2. Lock down Audit Logs (Prevent Forgery)
-- 3. Harden Request RPCs (Prevent Unauthorized Edits)
-- ============================================

-- ----------------------------------------------------------------
-- 1. NOTIFICATIONS SECURITY
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_insert_service" ON notifications;

-- Only Allow Service Role (Edge Functions/System Triggers) to insert triggers
-- Normal users should NOT be inserting notifications directly via REST
CREATE POLICY "notifications_insert_system" ON notifications
FOR INSERT TO service_role
WITH CHECK (true);

-- ----------------------------------------------------------------
-- 2. AUDIT LOGS SECURITY
-- ----------------------------------------------------------------
-- Ensure Audit Logs exist and are secure
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    user_id UUID REFERENCES auth.users(id),
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop insecure policies
DROP POLICY IF EXISTS "audit_logs_insert_all" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_read_admin" ON audit_logs;

-- Strict Policies
CREATE POLICY "audit_logs_insert_system" ON audit_logs
FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "audit_logs_read_admin" ON audit_logs
FOR SELECT TO authenticated
USING (auth_has_role(auth.uid(), 'regional_admin'));

-- ----------------------------------------------------------------
-- 3. HARDEN REQUEST RPCs
-- ----------------------------------------------------------------

-- Secure: update_request_details
CREATE OR REPLACE FUNCTION update_request_details(p_request_id uuid, p_updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id UUID;
  v_entity_type TEXT;
  v_entity_id UUID;
  v_status TEXT;
  v_current_metadata JSONB;
BEGIN
    -- 1. AUTHORIZATION CHECK (Missing before!)
    -- Only Admin/HR can update details of a pending request? 
    -- Or maybe the requester if it's draft?
    -- Assuming this is an Admin/HR function for fixing things.
    IF NOT auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr']) THEN
       RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Get Request Info
    SELECT requester_id, entity_type, entity_id, status, metadata 
    INTO v_requester_id, v_entity_type, v_entity_id, v_status, v_current_metadata
    FROM public.requests WHERE id = p_request_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Request not found');
    END IF;

    -- Update Promotion
    IF v_entity_type = 'promotion' THEN
        IF p_updates ? 'effective_date' THEN
            UPDATE public.promotions SET effective_date = (p_updates->>'effective_date')::DATE WHERE id = v_entity_id;
        END IF;
        IF p_updates ? 'new_role' THEN
             UPDATE public.promotions SET new_role = (p_updates->>'new_role')::app_role WHERE id = v_entity_id;
        END IF;
         -- Update metadata
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
             -- Update metadata
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
$$;;
