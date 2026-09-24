-- Fix maintenance_tickets SELECT RLS policy to exclude soft-deleted tickets.
--
-- Global search (useSearch.ts) queried maintenance_tickets without filtering
-- is_deleted, unlike the sibling documents/tasks search queries. That client
-- bug is fixed separately, but the underlying RLS SELECT policy on
-- maintenance_tickets ALSO does not scope out soft-deleted rows, and its
-- has_property_access() branch grants read access to ANY user directly
-- assigned to the property (not just managers/admins) -- so any
-- property-assigned staff member could read soft-deleted tickets directly
-- via the API even after the client fix. Role-simulated testing confirmed
-- a property_manager with no reporter/assignee relationship to a
-- soft-deleted ticket could still SELECT it before this change.
--
-- Scope out is_deleted rows at the RLS layer as defense in depth.

DROP POLICY IF EXISTS "maintenance_tickets_select_policy" ON public.maintenance_tickets;

CREATE POLICY "maintenance_tickets_select_policy"
ON public.maintenance_tickets
FOR SELECT
USING (
  (is_deleted IS NOT TRUE)
  AND (
    has_property_access((SELECT auth.uid()), property_id)
    OR (reported_by_id = (SELECT auth.uid()))
    OR (assigned_to_id = (SELECT auth.uid()))
  )
);
