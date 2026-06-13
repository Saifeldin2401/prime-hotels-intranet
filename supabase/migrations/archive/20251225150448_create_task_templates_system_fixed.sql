-- Create Task Templates for Recurring Checklists
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    
    -- Recurrence Configuration
    recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly')),
    recurrence_config JSONB DEFAULT '{}', -- e.g. {"days_of_week": [1, 3, 5]}
    
    -- Assignment
    assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    
    -- Internal State
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    
    -- Metadata
    created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Admins and Managers can manage templates
CREATE POLICY "Managers can manage task templates" ON public.task_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'property_manager', 'department_head')
        )
    );

-- Everyone can view templates in their property
CREATE POLICY "Staff can view templates" ON public.task_templates
    FOR SELECT USING (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_property_access(auth.uid(), property_id)
    );

-- Function to calculate next run
CREATE OR REPLACE FUNCTION calculate_next_task_run(recurrence TEXT, last_run TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    CASE recurrence
        WHEN 'daily' THEN RETURN (COALESCE(last_run, NOW()) + INTERVAL '1 day');
        WHEN 'weekly' THEN RETURN (COALESCE(last_run, NOW()) + INTERVAL '1 week');
        WHEN 'monthly' THEN RETURN (COALESCE(last_run, NOW()) + INTERVAL '1 month');
        ELSE RETURN NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set next_run_at on insert
CREATE OR REPLACE FUNCTION set_next_run_on_template()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.next_run_at IS NULL THEN
        NEW.next_run_at := calculate_next_task_run(NEW.recurrence_type, NULL);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_next_run ON public.task_templates;
CREATE TRIGGER trg_set_next_run
    BEFORE INSERT ON public.task_templates
    FOR EACH ROW EXECUTE FUNCTION set_next_run_on_template();
;
