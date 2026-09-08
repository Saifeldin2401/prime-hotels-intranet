-- RLS on the C2 backup table (fixes advisor rls_disabled_in_public).
ALTER TABLE public._c2_removed_operator_memberships_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS c2_backup_operator_read ON public._c2_removed_operator_memberships_backup;
CREATE POLICY c2_backup_operator_read ON public._c2_removed_operator_memberships_backup
  FOR SELECT USING (public.is_platform_operator());

-- No INSERT/UPDATE/DELETE policies: mutation only via migration / service_role.
REVOKE ALL ON public._c2_removed_operator_memberships_backup FROM anon;
