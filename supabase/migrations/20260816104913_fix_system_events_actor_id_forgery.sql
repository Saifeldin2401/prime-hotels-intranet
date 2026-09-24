-- SEC-07: system_events_insert_own allowed WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL).
-- The actor_id IS NULL branch let any authenticated user insert unattributed audit rows with
-- arbitrary event_type/entity_type/entity_id/metadata - audit-log forgery/pollution. Verified
-- live: a staff user inserted an actor-less row referencing another user's id.
--
-- All ~15 legitimate frontend call sites (useAnnouncements, useApprovalAuthority, useDepartments,
-- useEvents, useQuickCreate, useUserBulkOperations, useDocumentAnalytics) already set
-- actor_id: user.id explicitly. The one exception (useMedia.ts getSecureDownloadUrl's access log)
-- omitted actor_id and relied on the NULL branch - fixed in the same pass to pass actor_id:
-- currentUser.id, which was already in scope. Server-side writes (admin-account-actions edge
-- function) use the service-role client and are unaffected by this authenticated-role policy;
-- SECURITY DEFINER logging functions (log_security_event etc.) run as the owning role and bypass
-- RLS regardless.
DROP POLICY IF EXISTS system_events_insert_own ON public.system_events;

CREATE POLICY system_events_insert_own ON public.system_events
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = (select auth.uid()));
