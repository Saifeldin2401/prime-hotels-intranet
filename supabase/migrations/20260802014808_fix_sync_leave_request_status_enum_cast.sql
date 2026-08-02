-- ============================================================================
-- MIGRATION: fix_sync_leave_request_status_enum_cast
-- Discovered while functionally testing the request_apply_action fix:
-- sync_leave_request_status_trigger fires AFTER UPDATE ON requests FOR EACH
-- ROW WHEN (old.status <> new.status) -- i.e. on EVERY status transition for
-- EVERY request in the generic requests/request_steps engine (leave,
-- promotions, transfers, expense claims, invoices, anything routed through
-- it), not just leave requests. Its body does:
--   UPDATE leave_requests SET status = CASE NEW.status
--     WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' ...
--   END WHERE id = NEW.entity_id AND NEW.entity_type = 'leave_request'
-- requests.status is `text`, but leave_requests.status is the `entity_status`
-- enum. The CASE produces untyped text literals with no cast, assigned into
-- an enum column -- Postgres rejects this at statement-preparation time,
-- UNCONDITIONALLY, regardless of whether any row actually matches the WHERE
-- clause (confirmed via a rolled-back test using a fake entity_type that
-- guarantees zero matching rows -- the error fired anyway). This means every
-- approve/reject/return action across the ENTIRE requests engine has been
-- hard-failing in production, not just for leave requests.
--
-- Fix: cast the CASE result to entity_status.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_leave_request_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update leave request status based on workflow request status
  UPDATE leave_requests
  SET status = (CASE NEW.status
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'returned_for_correction' THEN 'pending' -- Reset to pending for correction
    ELSE OLD.status
  END)::entity_status
  WHERE id = NEW.entity_id AND NEW.entity_type = 'leave_request';

  RETURN NEW;
END;
$function$;
