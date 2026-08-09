-- consolidated_certificates_select had no branch for a plain reporting-line manager
-- (profiles.reporting_to) - only property_manager/property_hr/department_head (property-scoped)
-- and corporate/regional-tier roles (global) could see a report's certificates. A manager
-- holding only the generic 'manager' role (or any role outside that specific list) got zero
-- rows for their own direct reports' certificates, with RLS silently filtering rather than
-- erroring - surfaced while building the My Team "certificates expiring soon" signal, which
-- would have quietly under-reported for exactly this manager population. Adds a direct-report
-- branch consistent with the reporting_to read-only pattern already used for employee_documents.
DROP POLICY IF EXISTS consolidated_certificates_select ON public.certificates;

CREATE POLICY consolidated_certificates_select ON public.certificates
FOR SELECT
USING (
  (user_id = (SELECT auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = certificates.user_id AND p.reporting_to = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = ANY (ARRAY['corporate_admin', 'regional_admin', 'regional_hr']::app_role[])
  )
  OR (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = ANY (ARRAY['property_manager', 'property_hr', 'department_head']::app_role[])
    )
    AND EXISTS (
      SELECT 1 FROM public.user_properties up
      WHERE up.user_id = (SELECT auth.uid()) AND up.property_id = certificates.property_id
    )
  )
);
