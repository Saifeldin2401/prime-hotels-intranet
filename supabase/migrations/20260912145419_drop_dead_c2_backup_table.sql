
-- The only object in the public schema found with zero references anywhere
-- (no .from() call, no whole-word mention, in src/ or supabase/functions/) and
-- zero rows: a temporary backup snapshot table created by the 2026-09-08
-- legacy-platform-operator-membership cleanup migration. Its purpose (a
-- rollback safety net for that cleanup) is over; nothing reads it.
DROP TABLE IF EXISTS public._c2_removed_operator_memberships_backup;
