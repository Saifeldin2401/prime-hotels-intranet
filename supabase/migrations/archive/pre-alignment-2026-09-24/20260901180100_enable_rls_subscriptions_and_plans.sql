-- Phase 2 (security, advisor priority-1): subscriptions + subscription_plans were created by
-- migration 20260901140000 with RLS DISABLED -> anon key = full read/write of every tenant's
-- billing status, plan, and limits.

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Plans: catalogue data, readable by any signed-in user; only platform super admin manages them.
DROP POLICY IF EXISTS subscription_plans_read ON public.subscription_plans;
CREATE POLICY subscription_plans_read ON public.subscription_plans
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS subscription_plans_admin_write ON public.subscription_plans;
CREATE POLICY subscription_plans_admin_write ON public.subscription_plans
FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

-- Subscriptions: a tenant sees its own row; platform super admin / active platform session see all.
DROP POLICY IF EXISTS subscriptions_tenant_read ON public.subscriptions;
CREATE POLICY subscriptions_tenant_read ON public.subscriptions
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin()
  OR organization_id IN (SELECT unnest(public.current_user_organization_ids()))
  OR public.has_active_platform_session(organization_id)
);

DROP POLICY IF EXISTS subscriptions_admin_write ON public.subscriptions;
CREATE POLICY subscriptions_admin_write ON public.subscriptions
FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());
