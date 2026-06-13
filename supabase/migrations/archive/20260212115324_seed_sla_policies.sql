-- Phase 1: Seed default SLA policies

DO $$
BEGIN
  -- Request SLA defaults (entity-level + per-role)
  IF NOT EXISTS (
    SELECT 1 FROM public.request_sla_policies
    WHERE entity_type = 'leave_request' AND step_role IS NULL AND is_active = true
  ) THEN
    INSERT INTO public.request_sla_policies (entity_type, step_role, sla_hours, default_priority, is_active)
    VALUES ('leave_request', NULL, 72, 'normal', true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.request_sla_policies
    WHERE entity_type = 'leave_request' AND step_role = 'property_manager' AND is_active = true
  ) THEN
    INSERT INTO public.request_sla_policies (entity_type, step_role, sla_hours, default_priority, is_active)
    VALUES ('leave_request', 'property_manager', 48, NULL, true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.request_sla_policies
    WHERE entity_type = 'leave_request' AND step_role = 'property_hr' AND is_active = true
  ) THEN
    INSERT INTO public.request_sla_policies (entity_type, step_role, sla_hours, default_priority, is_active)
    VALUES ('leave_request', 'property_hr', 48, NULL, true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.request_sla_policies
    WHERE entity_type = 'transfer' AND step_role IS NULL AND is_active = true
  ) THEN
    INSERT INTO public.request_sla_policies (entity_type, step_role, sla_hours, default_priority, is_active)
    VALUES ('transfer', NULL, 96, 'high', true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.request_sla_policies
    WHERE entity_type = 'promotion' AND step_role IS NULL AND is_active = true
  ) THEN
    INSERT INTO public.request_sla_policies (entity_type, step_role, sla_hours, default_priority, is_active)
    VALUES ('promotion', NULL, 120, 'high', true);
  END IF;

  -- Maintenance SLA defaults
  IF NOT EXISTS (
    SELECT 1 FROM public.maintenance_sla_policies WHERE priority = 'critical' AND is_active = true
  ) THEN
    INSERT INTO public.maintenance_sla_policies (priority, sla_hours, is_active)
    VALUES ('critical', 4, true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.maintenance_sla_policies WHERE priority = 'urgent' AND is_active = true
  ) THEN
    INSERT INTO public.maintenance_sla_policies (priority, sla_hours, is_active)
    VALUES ('urgent', 12, true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.maintenance_sla_policies WHERE priority = 'high' AND is_active = true
  ) THEN
    INSERT INTO public.maintenance_sla_policies (priority, sla_hours, is_active)
    VALUES ('high', 24, true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.maintenance_sla_policies WHERE priority = 'medium' AND is_active = true
  ) THEN
    INSERT INTO public.maintenance_sla_policies (priority, sla_hours, is_active)
    VALUES ('medium', 48, true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.maintenance_sla_policies WHERE priority = 'low' AND is_active = true
  ) THEN
    INSERT INTO public.maintenance_sla_policies (priority, sla_hours, is_active)
    VALUES ('low', 72, true);
  END IF;

  -- Escalation rule for maintenance if missing
  IF NOT EXISTS (
    SELECT 1 FROM public.escalation_rules
    WHERE action_type = 'maintenance_ticket' AND is_active = true
  ) THEN
    INSERT INTO public.escalation_rules (action_type, threshold_hours, next_role, is_active)
    VALUES ('maintenance_ticket', 24, 'property_manager', true);
  END IF;
END;
$$;;
