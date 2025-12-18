-- Migration: Fix Transfer Logic and Property Visibility
-- Purpose: 
-- 1. Ensure 'process_due_transfers' only updates the specific property assignment (safe for multi-prop).
-- 2. Ensure 'properties' table is visible to authenticated users for transfer target selection.

-- ============================================================================
-- 1. FIX process_due_transfers
-- ============================================================================
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
        -- Update Property Assignment
        -- Logic: We move the user FROM the source property TO the target property.
        
        -- OPTION A: If we want to replace the old property assignment with the new one
        UPDATE public.user_properties 
        SET property_id = v_transfer.to_property_id, updated_at = NOW() 
        WHERE user_id = v_transfer.employee_id AND property_id = v_transfer.from_property_id;

        -- If the update affected 0 rows (e.g., from_property_id missing?), we should fallback OR log warning.
        -- If user didn't have the 'from' property anymore, maybe we just INSERT the new one?
        -- For now, we assume data integrity was checked at request time.
        
        -- Safe Insert if Update failed (Edge Case: User removed from property while transfer pending)
        IF NOT FOUND THEN
             INSERT INTO public.user_properties (user_id, property_id) 
             VALUES (v_transfer.employee_id, v_transfer.to_property_id)
             ON CONFLICT (user_id, property_id) DO NOTHING;
        END IF;

        -- Update Department (if specified)
        -- We should only update the department associated with that property?
        -- But user_departments tracks 'department_id' only (not linked to property in table definition typically, 
        -- though logically it is).
        -- We will update the user's primary department logic if simplistic, or remove old department.
        
        -- In simple schema: user_departments has (user_id, department_id).
        -- If we move properties, we should likely clear old department and add new.
        
        IF v_transfer.to_department_id IS NOT NULL THEN
             -- Remove old department if it was in the old property? 
             -- Hard to know which department belonged to old property without joining.
             -- Simplified: Just set the department.
             
             -- Attempt to update existing?
             UPDATE public.user_departments
             SET department_id = v_transfer.to_department_id
             WHERE user_id = v_transfer.employee_id AND department_id = v_transfer.from_department_id;
             
             IF NOT FOUND THEN
                INSERT INTO public.user_departments (user_id, department_id)
                VALUES (v_transfer.employee_id, v_transfer.to_department_id)
                ON CONFLICT (user_id, department_id) DO NOTHING;
             END IF;
        ELSE
            -- If no new department, and we know the old one, remove it?
            IF v_transfer.from_department_id IS NOT NULL THEN
                DELETE FROM public.user_departments 
                WHERE user_id = v_transfer.employee_id AND department_id = v_transfer.from_department_id;
            END IF;
        END IF;

        -- Mark as completed
        UPDATE public.transfers SET status = 'completed', updated_at = NOW() WHERE id = v_transfer.id;
        
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- ============================================================================
-- 2. ENSURE PROPERTY VISIBILITY
-- ============================================================================
-- Rerun of the visibility logic to be safe
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "properties_view_all_authenticated" ON public.properties;

CREATE POLICY "properties_view_all_authenticated"
ON public.properties
FOR SELECT
TO authenticated
USING (true);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
