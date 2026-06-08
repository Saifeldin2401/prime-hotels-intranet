-- Phase 1: add pause tracking to admin_delegations

ALTER TABLE public.admin_delegations
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_delegations_paused_at ON public.admin_delegations(paused_at);;
