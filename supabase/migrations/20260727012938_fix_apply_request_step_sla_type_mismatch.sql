-- ============================================================================
-- MIGRATION: fix_apply_request_step_sla_type_mismatch
-- apply_request_step_sla() compared request_sla_policies.step_role (app_role
-- enum) directly against request_steps.assignee_role (text) with no cast --
-- Postgres has no app_role = text operator, so ANY insert into request_steps
-- with status='pending' and due_at IS NULL would fail outright. This has
-- never surfaced in production because leave_requests (the only existing
-- caller of this insert path) has 0 rows -- caught here via a rolled-back
-- functional test while building the new invoice-approval workflow.
--
-- Fix casts the enum side to text (never the reverse): confirmed via
-- src/components/approvals/ApprovalWorkflow.tsx that assignee_role legitimately
-- holds non-enum values ('supervisor'), so casting text->enum would have
-- thrown "invalid input value for enum app_role" for that real caller.
-- Casting enum->text is always safe regardless of what's stored.
--
-- Applied live via Supabase MCP apply_migration on 2026-07-27.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_request_step_sla()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_entity_type text;
  v_sla_hours integer;
BEGIN
  IF NEW.status = 'pending' AND NEW.due_at IS NULL THEN
    SELECT r.entity_type INTO v_entity_type
    FROM public.requests r
    WHERE r.id = NEW.request_id;

    IF NEW.sla_hours IS NULL THEN
      SELECT p.sla_hours INTO v_sla_hours
      FROM public.request_sla_policies p
      WHERE p.is_active = true
        AND p.entity_type = v_entity_type
        AND (p.step_role::text = NEW.assignee_role OR p.step_role IS NULL)
        AND p.sla_hours IS NOT NULL
      ORDER BY (p.step_role IS NULL) ASC, p.created_at DESC
      LIMIT 1;

      NEW.sla_hours := v_sla_hours;
    END IF;

    IF NEW.sla_hours IS NOT NULL THEN
      NEW.due_at := now() + make_interval(hours => NEW.sla_hours);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
