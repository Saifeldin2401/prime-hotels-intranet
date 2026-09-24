BEGIN;
-- log_audit_event_trigger() still resolved as anon-executable because anon
-- inherits the PUBLIC grant (the prior REVOKE only removed the direct anon grant).
-- It is a trigger function (runs as table owner under trigger context) and needs
-- no role-level EXECUTE. Revoke PUBLIC, grant only authenticated for consistency.
REVOKE EXECUTE ON FUNCTION public.log_audit_event_trigger() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event_trigger() TO authenticated;
COMMIT;
