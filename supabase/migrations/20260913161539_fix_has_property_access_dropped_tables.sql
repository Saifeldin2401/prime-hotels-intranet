
-- has_property_access() referenced two tables that no longer exist (user_properties,
-- properties -- dropped in a prior architecture pass per docs/remaining-architecture-work.md
-- §3). Every call raised "relation does not exist" at runtime. It's called from 7 other
-- functions (search_sops, search_documents, fuzzy_search_documents, get_dashboard_summary,
-- can_view_report_definition, resolve_comment, toggle_comment_pin) -- any of them hitting a
-- property-scoped row would crash the whole query rather than just skip that row.
--
-- Rewritten against the current schema: "property" here means the same thing as "hotel"
-- (organization_memberships.hotel_id), consistent with the rest of the multi-tenant model.
CREATE OR REPLACE FUNCTION public.has_property_access(_user_id uuid, _property_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    -- Platform operators always have access
    public.is_platform_operator()
    OR
    -- Legacy super_admin fallback, preserved from the original check
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
    OR
    -- Org-wide admins see every hotel within their own organization
    EXISTS (
      SELECT 1 FROM public.organization_memberships om
      JOIN public.hotels h ON h.id = _property_id
      WHERE om.user_id = _user_id AND om.is_active = true
        AND om.role IN ('organization_owner', 'organization_admin')
        AND om.organization_id = h.organization_id
    )
    OR
    -- Direct hotel-scoped membership
    EXISTS (
      SELECT 1 FROM public.organization_memberships om
      WHERE om.user_id = _user_id AND om.is_active = true AND om.hotel_id = _property_id
    );
$function$;
