-- Create employee_of_the_month table
-- Created: 2026-02-07

CREATE TABLE IF NOT EXISTS public.employee_of_the_month (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2024),
    reason_en TEXT NOT NULL,
    reason_ar TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE(property_id, month, year)
);

-- Enable RLS
ALTER TABLE public.employee_of_the_month ENABLE ROW LEVEL SECURITY;

-- Select policy: Everyone can see EOM winners
CREATE POLICY "EOM select policy" ON public.employee_of_the_month
    FOR SELECT TO authenticated
    USING (true);

-- Insert/Update/Delete policies: Only Admin and HR can manage
CREATE POLICY "EOM manage policy" ON public.employee_of_the_month
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr')
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_eom_updated_at ON public.employee_of_the_month;
CREATE TRIGGER update_eom_updated_at
    BEFORE UPDATE ON public.employee_of_the_month
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_eom_property_date ON public.employee_of_the_month(property_id, year, month);
CREATE INDEX IF NOT EXISTS idx_eom_user ON public.employee_of_the_month(user_id);
