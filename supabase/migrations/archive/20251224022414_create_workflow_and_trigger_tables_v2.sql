-- Trigger Rules Table
CREATE TABLE IF NOT EXISTS public.trigger_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    conditions JSONB DEFAULT '[]'::jsonb,
    action_type TEXT NOT NULL,
    action_config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for trigger_rules
ALTER TABLE public.trigger_rules ENABLE ROW LEVEL SECURITY;

-- Workflow Steps Table
CREATE TABLE IF NOT EXISTS public.workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    action TEXT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for workflow_steps
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

-- Modify Workflow Executions to add step tracking
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workflow_executions' AND column_name='current_step_id') THEN
        ALTER TABLE public.workflow_executions ADD COLUMN current_step_id UUID REFERENCES public.workflow_steps(id);
    END IF;
END $$;

-- Policies for Admins
DROP POLICY IF EXISTS "Admins can manage trigger rules" ON public.trigger_rules;
CREATE POLICY "Admins can manage trigger rules" ON public.trigger_rules
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr'))
    );

DROP POLICY IF EXISTS "Admins can manage workflow steps" ON public.workflow_steps;
CREATE POLICY "Admins can manage workflow steps" ON public.workflow_steps
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr'))
    );;
