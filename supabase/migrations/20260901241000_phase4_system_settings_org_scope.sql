-- Migration: 20260901241000_phase4_system_settings_org_scope.sql
-- Description: Phase 4 System Settings tenant scoping (nullable organization_id, unique indices, get_setting RPC, RLS)

-- 1. Add organization_id column to system_settings
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Update unique constraint
ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS system_settings_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_global_key
  ON public.system_settings(key)
  WHERE organization_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_org_key
  ON public.system_settings(organization_id, key)
  WHERE organization_id IS NOT NULL;

-- 3. Create get_setting RPC with org scope resolution
CREATE OR REPLACE FUNCTION public.get_setting(p_org_id uuid, p_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_val jsonb;
BEGIN
  -- 1. Try tenant-specific override first if p_org_id is provided
  IF p_org_id IS NOT NULL THEN
    SELECT value INTO v_val
    FROM public.system_settings
    WHERE organization_id = p_org_id AND key = p_key;

    IF v_val IS NOT NULL THEN
      RETURN v_val;
    END IF;
  END IF;

  -- 2. Fall back to global platform default
  SELECT value INTO v_val
  FROM public.system_settings
  WHERE organization_id IS NULL AND key = p_key;

  RETURN v_val;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_setting(uuid, text) TO authenticated, anon;

-- 4. Refine RLS policies on system_settings
DROP POLICY IF EXISTS "All authenticated users can read settings" ON public.system_settings;
DROP POLICY IF EXISTS "settings_insert_operators_and_admins" ON public.system_settings;
DROP POLICY IF EXISTS "settings_update_operators_and_admins" ON public.system_settings;
DROP POLICY IF EXISTS "settings_select_scope" ON public.system_settings;
DROP POLICY IF EXISTS "settings_insert_scope" ON public.system_settings;
DROP POLICY IF EXISTS "settings_update_scope" ON public.system_settings;
DROP POLICY IF EXISTS "settings_delete_scope" ON public.system_settings;

CREATE POLICY "settings_select_scope" ON public.system_settings
  FOR SELECT TO authenticated
  USING (
    public.is_platform_operator(auth.uid())
    OR organization_id IS NULL
    OR (
      organization_id IS NOT NULL
      AND organization_id = ANY(public.current_user_organization_ids())
      AND public.org_is_operational(organization_id)
    )
  );

CREATE POLICY "settings_insert_scope" ON public.system_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      organization_id IS NULL
      AND public.is_platform_operator(auth.uid())
      AND public.platform_operator_can('config.manage', auth.uid())
    )
    OR (
      organization_id IS NOT NULL
      AND (
        (public.is_platform_operator(auth.uid()) AND public.platform_operator_can('config.manage', auth.uid()))
        OR (public.is_tenant_admin(organization_id) AND public.org_is_operational(organization_id))
      )
    )
  );

CREATE POLICY "settings_update_scope" ON public.system_settings
  FOR UPDATE TO authenticated
  USING (
    (
      organization_id IS NULL
      AND public.is_platform_operator(auth.uid())
      AND public.platform_operator_can('config.manage', auth.uid())
    )
    OR (
      organization_id IS NOT NULL
      AND (
        (public.is_platform_operator(auth.uid()) AND public.platform_operator_can('config.manage', auth.uid()))
        OR (public.is_tenant_admin(organization_id) AND public.org_is_operational(organization_id))
      )
    )
  );

CREATE POLICY "settings_delete_scope" ON public.system_settings
  FOR DELETE TO authenticated
  USING (
    (
      organization_id IS NULL
      AND public.is_platform_operator(auth.uid())
      AND public.platform_operator_can('config.manage', auth.uid())
    )
    OR (
      organization_id IS NOT NULL
      AND (
        (public.is_platform_operator(auth.uid()) AND public.platform_operator_can('config.manage', auth.uid()))
        OR (public.is_tenant_admin(organization_id) AND public.org_is_operational(organization_id))
      )
    )
  );
