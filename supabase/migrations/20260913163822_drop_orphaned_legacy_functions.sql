
-- Dropping functions confirmed to have ZERO live callers: not called from the frontend
-- (.rpc()), not called by any other function, not used in any RLS policy, and not
-- attached as a trigger. They reference tables (user_properties, user_departments,
-- properties, requests) dropped in an earlier consolidation -- leftover legacy code from
-- the pre-multi-tenant hospitality-ops model (shift scheduling, HR/finance approval
-- routing, guest-review admin, department-access checks) that nothing can reach anymore.
-- Deleting outright rather than "fixing" logic nobody calls.
DROP FUNCTION IF EXISTS public.find_finance_approver(uuid);
DROP FUNCTION IF EXISTS public.find_hr_assignee(uuid);
DROP FUNCTION IF EXISTS public.is_guest_review_portfolio_admin();
DROP FUNCTION IF EXISTS public.user_has_department_access(uuid, uuid);
DROP FUNCTION IF EXISTS public.users_share_property(uuid, uuid);
DROP FUNCTION IF EXISTS public.log_activity() CASCADE;
DROP FUNCTION IF EXISTS public.process_due_promotions();
DROP FUNCTION IF EXISTS public.process_due_transfers();
DROP FUNCTION IF EXISTS public.resolve_comment(uuid);
DROP FUNCTION IF EXISTS public.toggle_comment_pin(uuid);
DROP FUNCTION IF EXISTS public.apply_training_rules_to_user() CASCADE;

-- get_dashboard_stats: confirmed unused (only useDashboardStats.ts called it, and that
-- entire file is being deleted -- see companion frontend change).
DROP FUNCTION IF EXISTS public.get_dashboard_stats(uuid);

-- get_dashboard_summary: both overloads. Its only real caller was
-- fetchDashboardStats()/useDashboardStats() in useDashboardStats.ts, which itself has no
-- consumer anywhere in the actual rendered app (Dashboard.tsx doesn't import it). Dropping
-- both overloads alongside deleting that file rather than leaving a "fixed" but orphaned
-- RPC that looks load-bearing to the next person who reads it.
DROP FUNCTION IF EXISTS public.get_dashboard_summary(uuid, uuid[]);
DROP FUNCTION IF EXISTS public.get_dashboard_summary(uuid, uuid[], text[], uuid[], uuid[]);
