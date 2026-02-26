-- Function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Maintenance Schedules Table
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    last_generated_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ NOT NULL,
    assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Training Assignment Rules Table
CREATE TABLE IF NOT EXISTS public.training_assignment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_module_id UUID REFERENCES public.training_modules(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL,
    target_department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- RLS Policies for Maintenance Schedules
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Maintenance schedules viewable by authorized roles" ON public.maintenance_schedules
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('regional_admin', 'regional_hr', 'property_manager', 'department_head'))
    );

CREATE POLICY "Maintenance schedules manageable by admins/managers" ON public.maintenance_schedules
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('regional_admin', 'property_manager'))
    );

-- RLS Policies for Training Rules
ALTER TABLE public.training_assignment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Training rules viewable by admins" ON public.training_assignment_rules
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('regional_admin', 'regional_hr', 'property_manager'))
    );

CREATE POLICY "Training rules manageable by admins" ON public.training_assignment_rules
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('regional_admin', 'regional_hr', 'property_manager'))
    );

-- Trigger to update updated_at for maintenance_schedules
DROP TRIGGER IF EXISTS update_maintenance_schedules_modtime ON public.maintenance_schedules;
CREATE TRIGGER update_maintenance_schedules_modtime
    BEFORE UPDATE ON public.maintenance_schedules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
;
