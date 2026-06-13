-- Create skills table
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_skills table
CREATE TABLE IF NOT EXISTS public.user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, skill_id)
);

-- Create module_skills table
CREATE TABLE IF NOT EXISTS public.module_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    points_awarded INTEGER DEFAULT 0,
    UNIQUE(module_id, skill_id)
);

-- Enable RLS
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skills
CREATE POLICY "Everyone can view skills" ON public.skills
    FOR SELECT USING (true);

CREATE POLICY "Admins and HR can manage skills" ON public.skills
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
        )
    );

-- RLS Policies for user_skills
CREATE POLICY "Users can view own skills" ON public.user_skills
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user skills" ON public.user_skills
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
        )
    );

CREATE POLICY "Admins can manage user skills" ON public.user_skills
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
        )
    );

-- RLS Policies for module_skills
CREATE POLICY "Everyone can view module skills" ON public.module_skills
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage module skills" ON public.module_skills
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
        )
    );;
