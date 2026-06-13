CREATE OR REPLACE FUNCTION public.can_view_document(document_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  doc record;
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    d.id,
    d.visibility,
    d.property_id,
    d.department_id,
    d.role,
    d.created_by,
    d.status,
    d.is_deleted
  INTO doc
  FROM public.documents d
  WHERE d.id = document_id
  LIMIT 1;

  IF doc IS NULL THEN
    RETURN false;
  END IF;

  IF doc.is_deleted IS TRUE THEN
    RETURN false;
  END IF;

  -- Authors can always view their own documents.
  IF doc.created_by = (select auth.uid()) THEN
    RETURN true;
  END IF;

  -- Privileged roles can view all documents.
  IF public.has_role_optimized('corporate_admin'::public.app_role)
     OR public.has_role_optimized('regional_admin'::public.app_role)
     OR public.has_role_optimized('regional_hr'::public.app_role) THEN
    RETURN true;
  END IF;

  -- For non-privileged users, only published documents are viewable.
  IF doc.status IS DISTINCT FROM 'PUBLISHED'::public.document_status THEN
    RETURN false;
  END IF;

  IF doc.visibility = 'all_properties'::public.document_visibility THEN
    RETURN true;
  ELSIF doc.visibility = 'property'::public.document_visibility THEN
    RETURN doc.property_id IS NOT NULL
      AND public.has_property_access((select auth.uid()), doc.property_id);
  ELSIF doc.visibility = 'department'::public.document_visibility THEN
    RETURN doc.department_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_departments ud
        WHERE ud.user_id = (select auth.uid())
          AND ud.department_id = doc.department_id
      );
  ELSIF doc.visibility = 'role'::public.document_visibility THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
        AND (doc.role IS NULL OR ur.role = doc.role)
    );
  END IF;

  RETURN false;
END;
$$;;
