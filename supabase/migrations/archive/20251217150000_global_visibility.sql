-- Migration: Grant Global Visibility for Regional Roles
-- Purpose: Ensure Regional Admin and Regional HR can see ALL promotions and transfers, regardless of property assignment.

-- 1. Update Promotions Select Policy
DROP POLICY IF EXISTS "promotions_select_strict" ON public.promotions;

CREATE POLICY "promotions_select_global" ON public.promotions
    FOR SELECT TO authenticated
    USING (
        -- User can see their own promotions
        employee_id = auth.uid()
        OR
        -- Regional Admin/HR can see EVERYTHING
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr')
        )
        OR
        -- Property Manager/HR can see if they share property with the employee
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.user_properties up_admin ON up_admin.user_id = ur.user_id
            JOIN public.user_properties up_emp ON up_emp.user_id = promotions.employee_id
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('property_manager', 'property_hr')
            AND up_admin.property_id = up_emp.property_id
        )
    );

-- 2. Update Transfers Select Policy
DROP POLICY IF EXISTS "transfers_select_policy" ON public.transfers;

CREATE POLICY "transfers_select_global" ON public.transfers
    FOR SELECT TO authenticated
    USING (
        -- User can see their own transfers
        employee_id = auth.uid()
        OR
        -- Regional Admin/HR can see EVERYTHING
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr')
        )
        OR
        -- Property Manager/HR can see if they have access to EITHER from_property OR to_property
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.user_properties up ON up.user_id = ur.user_id
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('property_manager', 'property_hr')
            AND (up.property_id = transfers.from_property_id OR up.property_id = transfers.to_property_id)
        )
    );

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
