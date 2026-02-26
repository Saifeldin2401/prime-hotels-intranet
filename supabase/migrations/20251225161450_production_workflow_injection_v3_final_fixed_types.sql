-- 1. GUEST COMPLAINT ESCALATION WORKFLOW
INSERT INTO public.workflow_definitions (
    id, 
    name, 
    description, 
    type, 
    trigger_config, 
    action_config, 
    is_active
) VALUES (
    'a0000000-0000-4000-a000-000000000001',
    'guest_complaint_SLA_escalation',
    'Escalate guest complaints to Duty Manager if unresolved after 15 minutes, and to GM after 30 minutes.',
    'scheduled',
    '{"cron": "*/5 * * * *", "timezone": "Asia/Riyadh"}',
    '{"action": "staff_escalation", "levels": [{"timer": 15, "role": "duty_manager"}, {"timer": 30, "role": "general_manager"}]}',
    true
) ON CONFLICT (id) DO UPDATE SET 
    description = EXCLUDED.description,
    trigger_config = EXCLUDED.trigger_config,
    action_config = EXCLUDED.action_config,
    type = EXCLUDED.type;

-- 2. MAINTENANCE TICKET AUTO-REASSIGNMENT
INSERT INTO public.workflow_definitions (
    id, 
    name, 
    description, 
    type, 
    trigger_config, 
    action_config, 
    is_active
) VALUES (
    'a0000000-0000-4000-a000-000000000002',
    'maintenance_urgent_alert',
    'Trigger SMS/Push alert for Category A (Urgent) engineering issues.',
    'event-based',
    '{"event_type": "ticket_created", "conditions": {"priority": "urgent"}}',
    '{"action": "send_priority_alert", "channels": ["push", "sms"]}',
    true
) ON CONFLICT (id) DO UPDATE SET 
    description = EXCLUDED.description,
    type = EXCLUDED.type;
;
