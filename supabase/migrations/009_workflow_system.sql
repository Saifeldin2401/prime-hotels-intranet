-- Workflow System Schema
-- This migration creates the infrastructure for automated workflows

-- Workflow definitions table
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('scheduled', 'event-based', 'manual')),
    trigger_config JSONB NOT NULL DEFAULT '{}',
    action_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Workflow executions table
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    result JSONB,
    error TEXT,
    metadata JSONB DEFAULT '{}',
    execution_time_ms INTEGER
);

-- Scheduled reminders table
CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    notification_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow schedules table (for cron-like scheduling)
CREATE TABLE IF NOT EXISTS public.workflow_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
    cron_expression TEXT NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON public.workflow_executions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_user_id ON public.scheduled_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_entity ON public.scheduled_reminders(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_scheduled_for ON public.scheduled_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_status ON public.scheduled_reminders(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_workflow_schedules_next_run ON public.workflow_schedules(next_run_at) WHERE is_active = true;

-- RLS Policies
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_schedules ENABLE ROW LEVEL SECURITY;

-- Admins can manage workflows
CREATE POLICY "Admins can manage workflow definitions" ON public.workflow_definitions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin')
        )
    );

-- Anyone can view workflow definitions
CREATE POLICY "Anyone can view workflow definitions" ON public.workflow_definitions
    FOR SELECT USING (true);

-- Admins can view all executions
CREATE POLICY "Admins can view workflow executions" ON public.workflow_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin')
        )
    );

-- Users can view their own reminders
CREATE POLICY "Users can view their reminders" ON public.scheduled_reminders
    FOR SELECT USING (user_id = auth.uid());

-- System can insert/update reminders (via service role)
CREATE POLICY "Service role can manage reminders" ON public.scheduled_reminders
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Admins can view schedules
CREATE POLICY "Admins can view schedules" ON public.workflow_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin')
        )
    );

-- Function to update workflow updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflow_definitions_updated_at ON public.workflow_definitions;
CREATE TRIGGER workflow_definitions_updated_at
    BEFORE UPDATE ON public.workflow_definitions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_workflow_updated_at();

-- Function to calculate next run time for cron schedules
CREATE OR REPLACE FUNCTION public.calculate_next_cron_run(
    cron_expr TEXT,
    from_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    next_run TIMESTAMPTZ;
BEGIN
    -- Simple implementation for common patterns
    -- For production, you'd want a proper cron parser
    CASE cron_expr
        WHEN '0 0 * * *' THEN -- Daily at midnight
            next_run := DATE_TRUNC('day', from_time) + INTERVAL '1 day';
        WHEN '0 9 * * *' THEN -- Daily at 9 AM
            next_run := DATE_TRUNC('day', from_time) + INTERVAL '9 hours';
            IF next_run <= from_time THEN
                next_run := next_run + INTERVAL '1 day';
            END IF;
        WHEN '0 * * * *' THEN -- Every hour
            next_run := DATE_TRUNC('hour', from_time) + INTERVAL '1 hour';
        WHEN '*/15 * * * *' THEN -- Every 15 minutes
            next_run := DATE_TRUNC('hour', from_time) + 
                       (FLOOR(EXTRACT(MINUTE FROM from_time) / 15) + 1) * INTERVAL '15 minutes';
        WHEN '0 0 * * 1' THEN -- Weekly on Monday
            next_run := DATE_TRUNC('week', from_time) + INTERVAL '1 week';
        ELSE
            -- Default to 1 hour from now
            next_run := from_time + INTERVAL '1 hour';
    END CASE;
    
    RETURN next_run;
END;
$$ LANGUAGE plpgsql;

-- Insert default workflow definitions
INSERT INTO public.workflow_definitions (name, description, type, trigger_config, action_config) VALUES
('training_deadline_reminders', 'Send reminders for upcoming training deadlines', 'scheduled', 
 '{"cron": "0 9 * * *", "timezone": "UTC"}'::jsonb,
 '{"action": "send_training_reminders", "days_before": [3, 1]}'::jsonb),

('approval_escalation', 'Escalate approvals pending for more than 48 hours', 'scheduled',
 '{"cron": "0 */6 * * *", "timezone": "UTC"}'::jsonb,
 '{"action": "escalate_approvals", "timeout_hours": 48}'::jsonb),

('overdue_task_notifications', 'Notify users of overdue tasks', 'scheduled',
 '{"cron": "0 8 * * *", "timezone": "UTC"}'::jsonb,
 '{"action": "notify_overdue_tasks"}'::jsonb),

('leave_balance_alerts', 'Monthly leave balance and expiry alerts', 'scheduled',
 '{"cron": "0 9 1 * *", "timezone": "UTC"}'::jsonb,
 '{"action": "send_leave_balance_alerts"}'::jsonb)

ON CONFLICT (name) DO NOTHING;
