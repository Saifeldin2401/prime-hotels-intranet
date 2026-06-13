-- Drop gov_* trigger functions (gov tables were dropped; these would error at runtime)
DROP FUNCTION IF EXISTS public.gov_log_feature_flag_change() CASCADE;
DROP FUNCTION IF EXISTS public.gov_log_delegation_change() CASCADE;
DROP FUNCTION IF EXISTS public.gov_log_financial_action() CASCADE;
DROP FUNCTION IF EXISTS public.gov_log_role_assignment_change() CASCADE;
DROP FUNCTION IF EXISTS public.gov_is_flag_enabled(text) CASCADE;
DROP FUNCTION IF EXISTS public.gov_assert_admin() CASCADE;
DROP FUNCTION IF EXISTS public.gov_is_governance_admin() CASCADE;

-- Drop delete_operations_import which references dropped PMS tables
-- (daily_occupancy, daily_revenue, rate_summary, market_segments, room_inventory)
DROP FUNCTION IF EXISTS public.delete_operations_import(uuid) CASCADE;
