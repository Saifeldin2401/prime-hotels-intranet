-- Fix authorization model for public.employee_documents.
--
-- Problems fixed:
-- 1. INSERT policy was self-only (auth.uid() = user_id), so there was no way
--    for HR/admin to upload a document on behalf of an employee even though
--    the UI (EmployeeDocuments.tsx) renders the upload affordance on every
--    profile, including other people's.
-- 2. SELECT policy let property_manager/property_hr read EVERY employee's
--    documents company-wide with zero property scoping.
-- 3. No concept of "direct reporting manager" existed at all, despite
--    profiles.reporting_to / get_direct_reports() being the established
--    manager relationship used elsewhere in this app.
--
-- New model:
-- - Self: full access (view/upload/delete) - unchanged.
-- - Direct manager (profiles.reporting_to = auth.uid() for the target's
--   profile row): READ-ONLY (SELECT only, no INSERT).
-- - HR/admin-tier roles: super_admin / corporate_admin / regional_admin /
--   regional_hr are global; property_manager / property_hr are scoped via
--   has_property_access() to a property the target employee is actually
--   assigned to (via user_properties) - full access (view + upload-on-behalf).
-- - Everyone else: no access.
--
-- DELETE stays self-only (USING (auth.uid() = user_id)) and there is still no
-- UPDATE policy - both intentionally left untouched, no evidence of an
-- HR-delete-on-behalf UI exists.

CREATE OR REPLACE FUNCTION public.can_view_employee_document(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := (select auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Self can always view their own documents.
  IF v_uid = p_target_user_id THEN
    RETURN true;
  END IF;

  -- Direct reporting manager: read-only access to their report's documents.
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_target_user_id AND p.reporting_to = v_uid
  ) THEN
    RETURN true;
  END IF;

  -- Global HR/admin-tier roles: company-wide access.
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_uid
      AND ur.role IN ('super_admin', 'corporate_admin', 'regional_admin', 'regional_hr')
  ) THEN
    RETURN true;
  END IF;

  -- Property-scoped HR/admin roles: must actually share a property with the
  -- target employee (via user_properties), not just hold the role.
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_uid
      AND ur.role IN ('property_manager', 'property_hr')
  ) AND EXISTS (
    SELECT 1 FROM public.user_properties up
    WHERE up.user_id = p_target_user_id
      AND public.has_property_access(v_uid, up.property_id)
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.can_view_employee_document(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_employee_document(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_employee_document(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := (select auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Self can always manage (upload for) their own documents.
  IF v_uid = p_target_user_id THEN
    RETURN true;
  END IF;

  -- Global HR/admin-tier roles: company-wide access.
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_uid
      AND ur.role IN ('super_admin', 'corporate_admin', 'regional_admin', 'regional_hr')
  ) THEN
    RETURN true;
  END IF;

  -- Property-scoped HR/admin roles: must actually share a property with the
  -- target employee (via user_properties), not just hold the role.
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_uid
      AND ur.role IN ('property_manager', 'property_hr')
  ) AND EXISTS (
    SELECT 1 FROM public.user_properties up
    WHERE up.user_id = p_target_user_id
      AND public.has_property_access(v_uid, up.property_id)
  ) THEN
    RETURN true;
  END IF;

  -- NOTE: a plain direct manager (reporting_to) is intentionally NOT granted
  -- manage access here - view-only, per can_view_employee_document() above.
  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.can_manage_employee_document(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_employee_document(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view own documents" ON public.employee_documents;
CREATE POLICY "Users can view own documents"
ON public.employee_documents
FOR SELECT
USING (public.can_view_employee_document(user_id));

DROP POLICY IF EXISTS "Users can upload own documents" ON public.employee_documents;
CREATE POLICY "Users can upload own documents"
ON public.employee_documents
FOR INSERT
WITH CHECK (public.can_manage_employee_document(user_id));
