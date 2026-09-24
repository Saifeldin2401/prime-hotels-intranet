BEGIN;
-- approval_delegations: 0 rows, ZERO frontend references (never queried), no inbound FKs.
-- Superseded in practice by temporary_approvers (approval routing) + admin_delegations
-- (permission delegation). Pure dead table.
DROP TABLE IF EXISTS public.approval_delegations CASCADE;
COMMIT;
