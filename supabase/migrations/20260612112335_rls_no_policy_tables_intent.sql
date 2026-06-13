-- =============================================================================
-- MIGRATION: rls_no_policy_tables_intent
-- =============================================================================
-- Four tables were found with RLS enabled but no policies, meaning they were
-- effectively deny-all. This migration adds the minimal correct policies (or
-- documents the deny-all as intentional) for each table.
--
-- Context: the emergency_security_hardening_batch_1 migration (20260608051844)
-- added some admin-SELECT policies conditionally. Those policies are present
-- in production. This migration adds the remaining policies that were not
-- addressed there, and documents the intentional deny-all tables.
-- =============================================================================


-- =============================================================================
-- 1. password_reset_requests
-- =============================================================================
-- Purpose: stores one-time password reset tokens keyed on email address.
-- Schema: id, email (text), ip_address, created_at
--
-- Access model:
--   - Rows are written exclusively by the `public-forgot-password` edge
--     function (runs under service-role key) and cleaned up by the same
--     function after token validation. No authenticated-user SELECT is needed
--     at the API layer because the edge function validates the token itself.
--   - Admin SELECT (corporate_admin, regional_admin) was added by the
--     emergency hardening migration for audit purposes.
--   - Deny-all for everyone else is CORRECT and intentional: a regular
--     authenticated user must not be able to list or probe reset tokens for
--     other users' email addresses.
--
-- Note: password_reset_requests has no user_id column, so a "users SELECT
-- their own rows" policy is not applicable. The edge function handles all
-- token lifecycle under service-role.
-- =============================================================================
-- No new policy is added here. The existing admin-SELECT policy from
-- 20260608051844_emergency_security_hardening_batch_1.sql is sufficient.
-- Deny-all for non-admins is intentional.


-- =============================================================================
-- 2. rate_limit_entries
-- =============================================================================
-- Purpose: sliding-window rate-limit counters, keyed on an arbitrary string
--          (e.g., "login:<ip>", "api:<uid>"). Written and read exclusively by
--          SECURITY DEFINER functions (check_rate_limit, etc.).
--
-- Access model:
--   - All reads and writes happen inside SECURITY DEFINER functions that
--     bypass RLS entirely. No direct row access by any client role is
--     required or desired.
--   - Admin SELECT was added by the emergency hardening migration.
--   - Deny-all for authenticated/anon is CORRECT and intentional: exposing
--     rate-limit keys or counts to clients would allow enumeration of other
--     users' activity patterns.
-- =============================================================================
-- No new policy is added here. Intentional deny-all for non-admins.


-- =============================================================================
-- 3. sop_access_logs
-- =============================================================================
-- Purpose: audit log of every SOP document access (view, download, etc.).
-- Schema: id, document_id, version_id, user_id, action, ip_address,
--         user_agent, metadata, created_at
--
-- Access model:
--   - INSERT is handled by the `log_sop_access` SECURITY DEFINER RPC so that
--     the log cannot be bypassed or forged by clients. An INSERT policy was
--     added by the emergency hardening migration to allow direct inserts by
--     authenticated users as a fallback (belt-and-suspenders).
--   - SELECT: admin roles can read all logs (added by emergency hardening).
--     Individual users can SELECT their own rows — added below.
--   - UPDATE / DELETE: deny-all is intentional. Audit logs must be immutable
--     from the client perspective.
-- =============================================================================
-- Allow users to read their own access log entries (e.g., "my SOP history").
-- The emergency hardening migration already covers admin SELECT.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'sop_access_logs'
      AND policyname = 'sop_access_logs_select_own'
  ) THEN
    CREATE POLICY sop_access_logs_select_own
      ON public.sop_access_logs
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;


-- =============================================================================
-- 4. sop_review_reminders
-- =============================================================================
-- Purpose: tracks scheduled review reminders for SOP documents.
-- Schema: id, document_id, reminder_date, status, sent_at, completed_at,
--         completed_by, created_at, updated_at
--
-- Access model:
--   - Reminders are created automatically by a trigger on sop_documents when
--     next_review_date is set. No client INSERT is needed.
--   - SELECT: HR roles (regional_hr, property_hr) and admin roles need to
--     see pending reminders so they can act on them. Added below if missing.
--   - UPDATE: HR/admins need to mark reminders as completed. Added below.
--   - DELETE: deny-all is intentional. Completed reminders should be
--     preserved as an audit trail; archiving is handled by status updates.
--
-- The emergency hardening migration added admin-only SELECT and UPDATE.
-- This migration extends access to HR roles (regional_hr, property_hr) which
-- are the primary operators of the SOP review workflow.
-- =============================================================================

-- Extend SELECT to HR roles (idempotent: skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'sop_review_reminders'
      AND policyname = 'sop_review_reminders_hr_select'
  ) THEN
    CREATE POLICY sop_review_reminders_hr_select
      ON public.sop_review_reminders
      FOR SELECT
      TO authenticated
      USING (
        has_role_optimized('regional_hr'::app_role)
        OR has_role_optimized('property_hr'::app_role)
        OR has_role_optimized('corporate_admin'::app_role)
        OR has_role_optimized('regional_admin'::app_role)
      );
  END IF;
END $$;

-- Extend UPDATE (mark completed) to HR roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'sop_review_reminders'
      AND policyname = 'sop_review_reminders_hr_update'
  ) THEN
    CREATE POLICY sop_review_reminders_hr_update
      ON public.sop_review_reminders
      FOR UPDATE
      TO authenticated
      USING (
        has_role_optimized('regional_hr'::app_role)
        OR has_role_optimized('property_hr'::app_role)
        OR has_role_optimized('corporate_admin'::app_role)
        OR has_role_optimized('regional_admin'::app_role)
      )
      WITH CHECK (
        has_role_optimized('regional_hr'::app_role)
        OR has_role_optimized('property_hr'::app_role)
        OR has_role_optimized('corporate_admin'::app_role)
        OR has_role_optimized('regional_admin'::app_role)
      );
  END IF;
END $$;
