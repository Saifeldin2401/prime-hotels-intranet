-- Secure Promotion and Transfer System Migration
-- Integrates with unified 'requests' workflow

-- 1. Create Transfers Table
CREATE TABLE IF NOT EXISTS public.transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id),
    
    from_property_id UUID REFERENCES public.properties(id),
    to_property_id UUID NOT NULL REFERENCES public.properties(id),
    from_department_id UUID REFERENCES public.departments(id),
    to_department_id UUID REFERENCES public.departments(id),
    
    effective_date DATE NOT NULL,
    notes TEXT,
    
    -- Status tracks the specific transfer state throughout the request lifecycle
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')) DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- 2. Strict RLS Policies for Transfers
-- Property-based isolation: Users can only see transfers related to their scope

-- View Policy: Own transfers OR HR/Admin with matching property scope
CREATE POLICY "transfers_select_policy" ON public.transfers
    FOR SELECT TO authenticated
    USING (
        -- User can see their own transfers
        employee_id = auth.uid()
        OR
        -- HR/Admin can see if they have access to EITHER from_property OR to_property
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.user_properties up ON up.user_id = ur.user_id
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
            AND (up.property_id = transfers.from_property_id OR up.property_id = transfers.to_property_id)
        )
    );

-- Insert Policy: HR/Admin can insert if they have access to the 'from_property' (initiating transfer)
CREATE POLICY "transfers_insert_policy" ON public.transfers
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.user_properties up ON up.user_id = ur.user_id
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
            AND (up.property_id = transfers.from_property_id)
        )
    );

-- Update Policy: Only System (via RPC) or Regional Admin/HR
CREATE POLICY "transfers_update_policy" ON public.transfers
    FOR UPDATE TO authenticated
    USING (
         EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr')
        )
    );

-- 3. Update Promotions Table RLS (Strict Isolation)
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.promotions;
DROP POLICY IF EXISTS "Allow insert for HR and Admins" ON public.promotions;

-- View Policy: Own promotions OR HR/Admin with matching employee property scope
CREATE POLICY "promotions_select_strict" ON public.promotions
    FOR SELECT TO authenticated
    USING (
        -- User can see their own promotions
        employee_id = auth.uid()
        OR
        -- HR/Admin can see if they share property with the employee (at time of query)
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.user_properties up_admin ON up_admin.user_id = ur.user_id
            JOIN public.user_properties up_emp ON up_emp.user_id = promotions.employee_id
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
            AND up_admin.property_id = up_emp.property_id
        )
    );

-- Insert Policy: HR/Admin can insert if they share property with employee
CREATE POLICY "promotions_insert_strict" ON public.promotions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.user_properties up_admin ON up_admin.user_id = ur.user_id
            JOIN public.user_properties up_emp ON up_emp.user_id = promotions.employee_id
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
            AND up_admin.property_id = up_emp.property_id
        )
    );


-- 4. RPC: Submit Promotion Request
-- Creates a promotion record AND a corresponding Request
CREATE OR REPLACE FUNCTION public.submit_promotion_request(
    p_employee_id UUID,
    p_new_role app_role,
    p_new_job_title TEXT,
    p_new_department_id UUID,
    p_effective_date DATE,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_promotion_id UUID;
    v_request_id UUID;
    v_request_no BIGINT;
    v_requester_id UUID := auth.uid();
    v_old_role app_role;
    v_old_job_title TEXT;
    v_old_department_id UUID;
    v_property_id UUID;
    v_hr_assignee UUID;
BEGIN
    -- Get current employee details
    SELECT job_title INTO v_old_job_title FROM public.profiles WHERE id = p_employee_id;
    SELECT role INTO v_old_role FROM public.user_roles WHERE user_id = p_employee_id LIMIT 1;
    SELECT department_id INTO v_old_department_id FROM public.user_departments WHERE user_id = p_employee_id LIMIT 1;
    SELECT property_id INTO v_property_id FROM public.user_properties WHERE user_id = p_employee_id LIMIT 1;

    -- 1. Create Promotion Record (Status: pending)
    INSERT INTO public.promotions (
        employee_id, promoted_by, old_role, new_role, 
        old_job_title, new_job_title, old_department_id, new_department_id,
        effective_date, notes, status
    ) VALUES (
        p_employee_id, v_requester_id, v_old_role, p_new_role,
        v_old_job_title, p_new_job_title, v_old_department_id, p_new_department_id,
        p_effective_date, p_notes, 'pending'
    ) RETURNING id INTO v_promotion_id;

    -- 2. Find HR Assignee (for approval)
    -- Logic: Find Regional HR or Property Manager if requester is Property HR
    -- For now, generic logic: Find Regional HR
    SELECT user_id INTO v_hr_assignee 
    FROM public.user_roles 
    WHERE role = 'regional_hr' LIMIT 1;

    -- 3. Create Request
    INSERT INTO public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata
    ) VALUES (
        'promotion',
        v_promotion_id,
        v_requester_id,
        v_hr_assignee,
        'pending_hr_review',
        jsonb_build_object(
            'employee_name', (SELECT full_name FROM profiles WHERE id = p_employee_id),
            'new_role', p_new_role,
            'effective_date', p_effective_date
        )
    ) RETURNING id, request_no INTO v_request_id, v_request_no;

    -- 4. Create Initial Request Step
    INSERT INTO public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status
    ) VALUES (
        v_request_id, 1, v_hr_assignee, 'regional_hr', 'pending'
    );
    
    RETURN jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
END;
$$;


-- 5. RPC: Submit Transfer Request
CREATE OR REPLACE FUNCTION public.submit_transfer_request(
    p_employee_id UUID,
    p_to_property_id UUID,
    p_to_department_id UUID,
    p_effective_date DATE,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer_id UUID;
    v_request_id UUID;
    v_request_no BIGINT;
    v_requester_id UUID := auth.uid();
    v_from_property_id UUID;
    v_from_department_id UUID;
    v_hr_assignee UUID;
BEGIN
    -- Get current details
    SELECT property_id INTO v_from_property_id FROM public.user_properties WHERE user_id = p_employee_id LIMIT 1;
    SELECT department_id INTO v_from_department_id FROM public.user_departments WHERE user_id = p_employee_id LIMIT 1;

    -- 1. Create Transfer Record
    INSERT INTO public.transfers (
        employee_id, from_property_id, to_property_id, 
        from_department_id, to_department_id, effective_date, notes, status
    ) VALUES (
        p_employee_id, v_from_property_id, p_to_property_id,
        v_from_department_id, p_to_department_id, p_effective_date, p_notes, 'pending'
    ) RETURNING id INTO v_transfer_id;

    -- 2. Find HR Assignee (Target Property HR or Regional)
    -- Prioritize Target Property HR
    SELECT user_id INTO v_hr_assignee
    FROM public.user_properties up
    JOIN public.user_roles ur ON ur.user_id = up.user_id
    WHERE up.property_id = p_to_property_id AND ur.role = 'property_hr' LIMIT 1;
    
    -- Fallback to Regional HR
    IF v_hr_assignee IS NULL THEN
        SELECT user_id INTO v_hr_assignee FROM public.user_roles WHERE role = 'regional_hr' LIMIT 1;
    END IF;

    -- 3. Create Request
    INSERT INTO public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata
    ) VALUES (
        'transfer',
        v_transfer_id,
        v_requester_id,
        v_hr_assignee,
        'pending_hr_review',
        jsonb_build_object(
            'employee_name', (SELECT full_name FROM profiles WHERE id = p_employee_id),
            'target_property', (SELECT name FROM properties WHERE id = p_to_property_id),
            'effective_date', p_effective_date
        )
    ) RETURNING id, request_no INTO v_request_id, v_request_no;

    -- 4. Create Initial Request Step
    INSERT INTO public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status
    ) VALUES (
        v_request_id, 1, v_hr_assignee, 'hr', 'pending'
    );
    
    RETURN jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
END;
$$;

-- 6. Trigger to Auto-Finalize Promotions/Transfers on Request Approval
CREATE OR REPLACE FUNCTION public.process_request_finalization()
RETURNS TRIGGER AS $$
DECLARE
    v_promo_id UUID;
    v_transfer_id UUID;
BEGIN
    -- Only act when request is APPROVED
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        
        -- Handle Promotion
        IF NEW.entity_type = 'promotion' THEN
            SELECT id INTO v_promo_id FROM public.promotions WHERE id = NEW.entity_id;
            -- Mark promotion as approved (ready for date-based processing)
            UPDATE public.promotions SET status = 'approved' WHERE id = v_promo_id;
            
            -- Call process_due_promotions immediately to check if it should apply TODAY
            PERFORM public.process_due_promotions();
        END IF;

        -- Handle Transfer
        IF NEW.entity_type = 'transfer' THEN
            SELECT id INTO v_transfer_id FROM public.transfers WHERE id = NEW.entity_id;
            -- Mark transfer as approved
            UPDATE public.transfers SET status = 'approved' WHERE id = v_transfer_id;
            
            -- Can add process_due_transfers logic here similar to promotions
             PERFORM public.process_due_transfers();
        END IF;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on Requests Table
DROP TRIGGER IF EXISTS trigger_finalize_request ON public.requests;
CREATE TRIGGER trigger_finalize_request
    AFTER UPDATE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.process_request_finalization();


-- 7. Process Due Transfers (Similar to Promotion Logic)
CREATE OR REPLACE FUNCTION public.process_due_transfers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_transfer IN 
        SELECT * FROM public.transfers 
        WHERE status = 'approved' AND effective_date <= CURRENT_DATE
    LOOP
        -- Update Property
        UPDATE public.user_properties 
        SET property_id = v_transfer.to_property_id, updated_at = NOW() 
        WHERE user_id = v_transfer.employee_id;

        -- Update Department (if specified)
        IF v_transfer.to_department_id IS NOT NULL THEN
            UPDATE public.user_departments
            SET department_id = v_transfer.to_department_id
            WHERE user_id = v_transfer.employee_id;
        ELSE
            -- Clear department if transferring property without specific department assignment yet
            DELETE FROM public.user_departments WHERE user_id = v_transfer.employee_id;
        END IF;

        -- Mark as completed
        UPDATE public.transfers SET status = 'completed', updated_at = NOW() WHERE id = v_transfer.id;
        
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;
