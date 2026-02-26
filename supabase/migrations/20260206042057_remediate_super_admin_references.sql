-- 1. Update audit_logs_strict_select policy
DROP POLICY IF EXISTS audit_logs_strict_select ON public.audit_logs;
CREATE POLICY audit_logs_strict_select ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role])
        )
    );

-- 2. Update pii_access_logs_strict_select policy
DROP POLICY IF EXISTS pii_access_logs_strict_select ON public.pii_access_logs;
CREATE POLICY pii_access_logs_strict_select ON public.pii_access_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role])
        )
    );
;
