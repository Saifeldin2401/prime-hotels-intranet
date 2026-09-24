-- Close the mutable search_path finding on export_organization_archive
-- (SECURITY DEFINER). Behaviour is unchanged; the body still enforces
-- has_tenant_access(p_org_id) before returning any data.
CREATE OR REPLACE FUNCTION public.export_organization_archive(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT has_tenant_access(p_org_id) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to export this organization.';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', now(),
    'organization', (SELECT row_to_json(o) FROM organizations o WHERE o.id = p_org_id),
    'hotels', (SELECT jsonb_agg(row_to_json(h)) FROM hotels h WHERE h.organization_id = p_org_id AND h.is_deleted = false),
    'departments', (SELECT jsonb_agg(row_to_json(d)) FROM departments d WHERE d.organization_id = p_org_id AND d.is_active = true),
    'memberships', (SELECT jsonb_agg(row_to_json(om)) FROM organization_memberships om WHERE om.organization_id = p_org_id AND om.is_active = true),
    'courses', (SELECT jsonb_agg(row_to_json(c)) FROM courses c WHERE c.organization_id = p_org_id AND c.is_deleted = false),
    'assessments', (SELECT jsonb_agg(row_to_json(a)) FROM assessments a WHERE a.organization_id = p_org_id AND a.is_deleted = false),
    'certificates', (SELECT jsonb_agg(row_to_json(cert)) FROM certificates cert WHERE cert.organization_id = p_org_id),
    'documents', (SELECT jsonb_agg(row_to_json(doc)) FROM documents doc WHERE doc.organization_id = p_org_id AND doc.status = 'PUBLISHED')
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.export_organization_archive(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.export_organization_archive(uuid) TO authenticated;
