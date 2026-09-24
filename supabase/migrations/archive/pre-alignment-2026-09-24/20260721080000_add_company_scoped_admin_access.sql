-- ============================================================================
-- MIGRATION: add_company_scoped_admin_access
-- Closes the P1 gap: corporate/regional admin roles currently see ALL
-- properties globally regardless of company. This adds an OPTIONAL
-- user_companies scope grant table and extends has_property_access() so
-- that admins with an explicit company grant are restricted to it, while
-- admins with NO grant (the current state for every existing user) keep
-- their exact current global-access behavior. Verified additive/no-op via
-- a before/after hash of has_property_access() over every (user, property)
-- pair prior to applying this migration (identical: ef81fa89ea563bbcdda1c1a815ff5164),
-- plus a rolled-back transactional functional test proving isolation works
-- once a grant exists.
--
-- Applied live via Supabase MCP apply_migration on 2026-07-21.
-- ============================================================================

CREATE TABLE public.user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);
COMMENT ON TABLE public.user_companies IS 'Optional company-scope grant for corporate_admin/regional_admin/regional_hr. If a user holding one of those roles has ANY row here, their property access is restricted to properties under their granted companies. If they have NO rows, they retain global access -- this preserves pre-multi-company behavior for every existing admin with zero migration needed.';

CREATE INDEX idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON public.user_companies(company_id);

ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_companies_select ON public.user_companies FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR has_role((SELECT auth.uid()), 'corporate_admin'::app_role));
CREATE POLICY user_companies_modify_admin ON public.user_companies FOR ALL TO authenticated
  USING (has_role((SELECT auth.uid()), 'corporate_admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));

CREATE OR REPLACE FUNCTION public.has_property_access(_user_id uuid, _property_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    -- Direct property assignment (unchanged from before this migration)
    EXISTS (
      SELECT 1 FROM user_properties WHERE user_id = _user_id AND property_id = _property_id
    )
    OR
    -- super_admin: always global, never company-scoped (platform-level role)
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'super_admin'
    )
    OR
    -- corporate_admin/regional_admin/regional_hr: global by default (matches
    -- pre-migration behavior), UNLESS the user has an explicit company scope
    -- grant in user_companies, in which case restricted to those companies.
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role IN ('corporate_admin', 'regional_admin', 'regional_hr')
        AND (
          NOT EXISTS (SELECT 1 FROM user_companies uc WHERE uc.user_id = _user_id)
          OR EXISTS (
            SELECT 1 FROM user_companies uc
            JOIN properties p ON p.company_id = uc.company_id
            WHERE uc.user_id = _user_id AND p.id = _property_id
          )
        )
    )
$function$;
