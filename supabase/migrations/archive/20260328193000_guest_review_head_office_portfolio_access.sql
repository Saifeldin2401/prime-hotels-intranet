-- Ensure Head Office leadership users can access full guest-review portfolio.
-- This preserves existing corporate/regional admin access while adding
-- an explicit HQ-based override for operations leadership at HQ.

CREATE OR REPLACE FUNCTION public.is_guest_review_portfolio_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR (
      (
        public.has_role_optimized('property_manager'::public.app_role)
        OR public.has_role_optimized('property_hr'::public.app_role)
        OR public.has_role_optimized('regional_hr'::public.app_role)
      )
      AND EXISTS (
        SELECT 1
        FROM public.user_properties up
        WHERE up.user_id = auth.uid()
          AND up.property_id = '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_guest_review_portfolio_admin() TO authenticated;
