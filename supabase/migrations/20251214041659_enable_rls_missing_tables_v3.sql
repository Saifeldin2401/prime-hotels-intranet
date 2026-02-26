-- Enable RLS on tables that were missing it

-- conversation_participants table
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_participants
CREATE POLICY "Users can view their own conversations"
ON public.conversation_participants FOR SELECT
TO authenticated
USING (participant_id = auth.uid());

CREATE POLICY "Users can join conversations they're invited to"
ON public.conversation_participants FOR INSERT
TO authenticated
WITH CHECK (participant_id = auth.uid());

CREATE POLICY "Users can leave their own conversations"
ON public.conversation_participants FOR DELETE
TO authenticated
USING (participant_id = auth.uid());

-- job_title_role_mappings table (read-only for most, admin can manage)
ALTER TABLE public.job_title_role_mappings ENABLE ROW LEVEL SECURITY;

-- Everyone can read job title mappings (configuration data)
CREATE POLICY "All authenticated users can read job title mappings"
ON public.job_title_role_mappings FOR SELECT
TO authenticated
USING (true);

-- Only HR roles can modify job title mappings
CREATE POLICY "HR can manage job title mappings"
ON public.job_title_role_mappings FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('regional_admin', 'regional_hr', 'property_hr')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('regional_admin', 'regional_hr', 'property_hr')
    )
);;
