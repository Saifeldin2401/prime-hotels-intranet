
-- Phase 1, Migration 2: Secure dummy_for_trigger_check table
-- This table has no RLS, no primary key — exposed via PostgREST API

-- Enable RLS
ALTER TABLE public.dummy_for_trigger_check ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner
ALTER TABLE public.dummy_for_trigger_check FORCE ROW LEVEL SECURITY;

-- Add deny-all policy (no one should access this table directly)
CREATE POLICY "deny_all_access" ON public.dummy_for_trigger_check
  FOR ALL
  USING (false);
;
