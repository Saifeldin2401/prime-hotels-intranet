UPDATE public.workflow_definitions
SET is_deleted = TRUE,
    is_active = FALSE,
    updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND (
    (action_config->>'action') IN ('staff_escalation', 'send_priority_alert', 'escalate_approvals')
    OR name IN ('guest_complaint_SLA_escalation', 'maintenance_urgent_alert', 'approval_escalation')
  );;
