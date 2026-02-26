-- Optimize RLS by evaluating auth.uid() once via initPlan pattern.

-- request_sla_policies
alter policy request_sla_policies_manage on public.request_sla_policies
using (
  public.has_role((select auth.uid()), 'regional_admin')
  or public.has_role((select auth.uid()), 'regional_hr')
)
with check (
  public.has_role((select auth.uid()), 'regional_admin')
  or public.has_role((select auth.uid()), 'regional_hr')
);

-- maintenance_sla_policies
alter policy maintenance_sla_policies_manage on public.maintenance_sla_policies
using (
  public.has_role((select auth.uid()), 'regional_admin')
  or public.has_role((select auth.uid()), 'regional_hr')
  or public.has_role((select auth.uid()), 'property_manager')
)
with check (
  public.has_role((select auth.uid()), 'regional_admin')
  or public.has_role((select auth.uid()), 'regional_hr')
  or public.has_role((select auth.uid()), 'property_manager')
);

-- account_action_notes
alter policy account_action_notes_select on public.account_action_notes
using (
  public.has_role((select auth.uid()), 'regional_admin')
  or public.has_role((select auth.uid()), 'regional_hr')
  or public.has_role((select auth.uid()), 'property_manager')
  or public.has_role((select auth.uid()), 'property_hr')
);

alter policy account_action_notes_insert on public.account_action_notes
with check (
  public.has_role((select auth.uid()), 'regional_admin')
  or public.has_role((select auth.uid()), 'regional_hr')
  or public.has_role((select auth.uid()), 'property_manager')
  or public.has_role((select auth.uid()), 'property_hr')
);;
