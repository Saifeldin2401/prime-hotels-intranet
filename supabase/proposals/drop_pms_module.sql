-- =============================================================================
-- PROPOSAL: Drop the PMS (Property Management System) module tables
-- STATUS: CONDITIONALLY SAFE — review frontend references before applying
-- =============================================================================
--
-- Findings
-- --------
-- Row counts (exact, not estimated):
--   pms_systems        : 0 rows
--   pms_field_mappings : 0 rows
--   daily_occupancy    : 0 rows
--   daily_revenue      : 0 rows
--   rate_summary       : 0 rows
--   market_segments    : 0 rows
--   room_inventory     : 0 rows
--
-- All 7 tables are completely empty.
--
-- Frontend references found in:
--   src/pages/operations/PMSConfiguration.tsx
--     Reads/writes pms_systems (pms_type, pms_name columns).
--     Route: /operations/pms-config  guarded by ProtectedRoute(['regional_admin'])
--
--   src/hooks/useOperations.ts
--     Reads pms_systems, daily_occupancy, daily_revenue, market_segments,
--     room_inventory.
--     Consumed by OperationsDashboard, OperationsAnalytics, DailyFlashReport —
--     all guarded by ProtectedRoute(['regional_admin','regional_hr','property_manager'])
--
--   src/pages/operations/DataImport.tsx
--     References pms_systems (likely for import source selection).
--     Route: /operations/import  guarded by same roles.
--
-- Assessment
-- ----------
-- All references are behind authentication + role guards.  No data exists.
-- HOWEVER, the Operations dashboard pages (OperationsAnalytics, DailyFlashReport)
-- actively query these tables via useOperations.ts.  Dropping the tables would
-- cause runtime errors on those pages immediately.
--
-- Prerequisite before applying this DROP:
--   1. Remove or stub out all PMS-related queries in:
--        src/hooks/useOperations.ts
--        src/pages/operations/PMSConfiguration.tsx
--        src/pages/operations/DataImport.tsx
--   2. Confirm the Operations feature is being retired or replaced.
--   3. Deploy the frontend changes FIRST, then apply this migration.
--
-- If those conditions are met, apply the SQL below.
-- =============================================================================

-- HUMAN REVIEW REQUIRED.
-- Ensure frontend references are removed before applying.
-- Run in a staging branch first and validate the Operations pages still load.

DROP TABLE IF EXISTS public.pms_field_mappings CASCADE;
DROP TABLE IF EXISTS public.daily_occupancy CASCADE;
DROP TABLE IF EXISTS public.daily_revenue CASCADE;
DROP TABLE IF EXISTS public.rate_summary CASCADE;
DROP TABLE IF EXISTS public.market_segments CASCADE;
DROP TABLE IF EXISTS public.room_inventory CASCADE;
-- Drop pms_systems last (other tables may FK to it)
DROP TABLE IF EXISTS public.pms_systems CASCADE;
