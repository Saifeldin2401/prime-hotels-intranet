-- Migration: phase3_entitlement_enforcement_triggers
-- Enforce hotel and learner quotas at the DB write boundary

CREATE OR REPLACE FUNCTION public.enforce_hotel_entitlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- platform operators (incl. inside an audited session) bypass tenant quotas
  IF public.is_platform_operator() THEN RETURN NEW; END IF;
  IF NEW.organization_id IS NOT NULL AND NOT public.check_entitlement(NEW.organization_id, 'hotel') THEN
    RAISE EXCEPTION 'Hotel limit reached for this subscription plan (%).',
      (public.effective_entitlements(NEW.organization_id)->>'max_hotels')
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_hotel_entitlement ON public.hotels;
CREATE TRIGGER trg_enforce_hotel_entitlement
BEFORE INSERT ON public.hotels
FOR EACH ROW EXECUTE FUNCTION public.enforce_hotel_entitlement();

CREATE OR REPLACE FUNCTION public.enforce_membership_entitlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- platform operators (incl. inside an audited session) bypass tenant quotas
  IF public.is_platform_operator() THEN RETURN NEW; END IF;
  IF NEW.organization_id IS NOT NULL AND NEW.is_active = true AND NOT public.check_entitlement(NEW.organization_id, 'learner') THEN
    RAISE EXCEPTION 'User seat limit reached for this subscription plan (%).',
      (public.effective_entitlements(NEW.organization_id)->>'max_learners')
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_membership_entitlement ON public.organization_memberships;
CREATE TRIGGER trg_enforce_membership_entitlement
BEFORE INSERT ON public.organization_memberships
FOR EACH ROW EXECUTE FUNCTION public.enforce_membership_entitlement();
