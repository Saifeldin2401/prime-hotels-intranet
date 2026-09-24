-- SEC-01/02/03: property_isolation_{announcements,departments,training_modules} were declared
-- FOR ALL with no WITH CHECK. Postgres reuses USING as the write check when WITH CHECK is
-- omitted, and check_property_access(NULL) returns TRUE unconditionally (global rows visible
-- to everyone). Combined with all three tables' global rows having property_id IS NULL, any
-- authenticated user (verified: a plain 'staff' role) could DELETE/UPDATE/INSERT freely.
--
-- Fix: remove the FOR ALL grant from all three. Each table already has correctly-scoped
-- SELECT/INSERT/UPDATE policies alongside it; only training_modules lacked a SELECT policy of
-- its own (relying solely on the broken FOR ALL policy for reads), and neither announcements
-- nor training_modules had an admin-scoped DELETE policy. This migration restores exactly the
-- read/write capability that was intended, without the anyone-can-write bug.

-- announcements: SELECT is already covered by announcements_select_all_authenticated (no
-- property scoping by design - target_audience governs relevance, not RLS). INSERT/UPDATE
-- already covered by consolidated_announcements_insert / announcements_update_admins. Only
-- DELETE has no other policy - add an admin-scoped one to preserve the existing delete feature
-- in AnnouncementFeed.tsx.
DROP POLICY IF EXISTS property_isolation_announcements ON public.announcements;

CREATE POLICY announcements_delete_admins ON public.announcements
  FOR DELETE TO authenticated
  USING (
    has_role((select auth.uid()), 'regional_admin'::app_role)
    OR has_role((select auth.uid()), 'regional_hr'::app_role)
  );

-- departments: SELECT/INSERT/UPDATE/DELETE are already fully covered by
-- departments_select_authenticated (SELECT) and departments_modify_admin_pm (FOR ALL, scoped to
-- regional_admin or property-scoped property_manager). Safe to drop with no replacement.
DROP POLICY IF EXISTS property_isolation_departments ON public.departments;

-- training_modules: this was the ONLY select policy on the table - replace with a SELECT-only
-- equivalent so property-scoped reads keep working. INSERT/UPDATE already covered by
-- training_modules_insert_admins / training_modules_update_admins. No DELETE policy existed
-- under the old (broken) policy either in a safe sense - add an admin-scoped one.
DROP POLICY IF EXISTS property_isolation_training_modules ON public.training_modules;

CREATE POLICY training_modules_select_scope ON public.training_modules
  FOR SELECT TO authenticated
  USING (check_property_access(property_id));

CREATE POLICY training_modules_delete_admins ON public.training_modules
  FOR DELETE TO authenticated
  USING (
    has_role((select auth.uid()), 'regional_admin'::app_role)
    OR has_role((select auth.uid()), 'regional_hr'::app_role)
  );
