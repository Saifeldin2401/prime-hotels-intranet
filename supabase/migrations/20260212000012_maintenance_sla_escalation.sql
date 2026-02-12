-- Phase 1: Maintenance SLA and escalation

ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_hours integer,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_due_at
  ON public.maintenance_tickets(due_at);

CREATE TABLE IF NOT EXISTS public.maintenance_sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority text NOT NULL,
  sla_hours integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sla_hours > 0),
  CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'critical'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_maintenance_sla_policies_active
  ON public.maintenance_sla_policies(priority)
  WHERE is_active;

DROP TRIGGER IF EXISTS update_maintenance_sla_policies_updated_at ON public.maintenance_sla_policies;
CREATE TRIGGER update_maintenance_sla_policies_updated_at
  BEFORE UPDATE ON public.maintenance_sla_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.maintenance_sla_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maintenance_sla_policies_select ON public.maintenance_sla_policies;
DROP POLICY IF EXISTS maintenance_sla_policies_manage ON public.maintenance_sla_policies;

CREATE POLICY maintenance_sla_policies_select
  ON public.maintenance_sla_policies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY maintenance_sla_policies_manage
  ON public.maintenance_sla_policies FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    public.has_role(auth.uid(), 'property_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    public.has_role(auth.uid(), 'property_manager')
  );

CREATE OR REPLACE FUNCTION public.apply_maintenance_sla()
RETURNS TRIGGER AS $$
DECLARE
  v_sla_hours integer;
BEGIN
  IF NEW.due_at IS NULL THEN
    SELECT p.sla_hours INTO v_sla_hours
    FROM public.maintenance_sla_policies p
    WHERE p.is_active = true
      AND p.priority = NEW.priority
    ORDER BY p.created_at DESC
    LIMIT 1;

    IF v_sla_hours IS NOT NULL THEN
      NEW.sla_hours := v_sla_hours;
      NEW.due_at := now() + make_interval(hours => v_sla_hours);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_sla_trigger ON public.maintenance_tickets;
CREATE TRIGGER maintenance_sla_trigger
  BEFORE INSERT OR UPDATE OF priority, due_at ON public.maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_maintenance_sla();

CREATE OR REPLACE FUNCTION public.check_and_escalate_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket RECORD;
  rule RECORD;
  next_assignee_id uuid;
  new_due_at timestamptz;
BEGIN
  FOR ticket IN
    SELECT mt.*
    FROM public.maintenance_tickets mt
    WHERE mt.status IN ('open', 'in_progress', 'pending_parts')
      AND mt.is_deleted = false
      AND (
        (mt.due_at IS NOT NULL AND mt.due_at < now()) OR
        (mt.due_at IS NULL AND mt.created_at < now() - interval '24 hours')
      )
      AND (mt.escalated_at IS NULL OR mt.escalated_at < now() - interval '1 hour')
  LOOP
    SELECT * INTO rule
    FROM public.escalation_rules er
    WHERE er.is_active = true
      AND er.action_type = 'maintenance_ticket'
    ORDER BY er.threshold_hours ASC
    LIMIT 1;

    IF rule IS NULL THEN
      CONTINUE;
    END IF;

    SELECT p.id INTO next_assignee_id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    LEFT JOIN public.user_properties up ON up.user_id = p.id
    WHERE ur.role = rule.next_role
      AND p.is_active = true
      AND (
        ticket.property_id IS NULL OR
        ur.role IN ('regional_admin', 'regional_hr', 'corporate_admin') OR
        up.property_id = ticket.property_id
      )
    ORDER BY (up.property_id = ticket.property_id) DESC, p.created_at
    LIMIT 1;

    IF next_assignee_id IS NULL OR next_assignee_id = ticket.assigned_to_id THEN
      CONTINUE;
    END IF;

    new_due_at := now() + make_interval(hours => COALESCE(ticket.sla_hours, rule.threshold_hours));

    UPDATE public.maintenance_tickets
    SET assigned_to_id = next_assignee_id,
        escalated_at = now(),
        due_at = new_due_at
    WHERE id = ticket.id;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (
      NULL,
      'escalate',
      'maintenance_ticket',
      ticket.id,
      jsonb_build_object(
        'old_assignee_id', ticket.assigned_to_id,
        'new_assignee_id', next_assignee_id,
        'rule_id', rule.id
      )
    );

    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      next_assignee_id,
      'escalation_alert',
      'Maintenance Ticket Escalated',
      format('Maintenance ticket "%s" has been escalated to you.', ticket.title),
      jsonb_build_object('ticket_id', ticket.id)
    );
  END LOOP;
END;
$$;

-- Schedule (enable if pg_cron is available)
-- SELECT cron.schedule('check-maintenance-escalations', '0 * * * *', 'SELECT public.check_and_escalate_maintenance();');
