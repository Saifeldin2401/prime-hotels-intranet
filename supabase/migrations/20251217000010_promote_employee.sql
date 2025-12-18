-- Create promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id),
    promoted_by UUID NOT NULL REFERENCES public.profiles(id),
    
    old_role app_role,
    new_role app_role NOT NULL,
    old_job_title TEXT,
    new_job_title TEXT NOT NULL,
    old_department_id UUID REFERENCES public.departments(id),
    new_department_id UUID REFERENCES public.departments(id),
    
    effective_date DATE NOT NULL,
    notes TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow viewing promotions for own property/department (simplified to authenticated for now, can be refined)
CREATE POLICY "Allow read access for authenticated users" ON public.promotions
    FOR SELECT TO authenticated USING (true);

-- Allow HR/Admin to insert
CREATE POLICY "Allow insert for HR and Admins" ON public.promotions
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'property_manager', 'property_hr', 'regional_hr')
        )
    );

-- Function to Promote Employee (RPC)
CREATE OR REPLACE FUNCTION public.promote_employee(
    p_employee_id UUID,
    p_new_role app_role,
    p_new_job_title TEXT,
    p_new_department_id UUID,
    p_effective_date DATE,
    p_notes TEXT,
    p_promoter_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_promotion_id UUID;
    v_old_role app_role;
    v_old_job_title TEXT;
    v_old_department_id UUID;
    v_current_date DATE;
BEGIN
    -- Get current date
    v_current_date := CURRENT_DATE;

    -- Fetch current details
    SELECT job_title INTO v_old_job_title FROM public.profiles WHERE id = p_employee_id;
    
    SELECT role INTO v_old_role FROM public.user_roles WHERE user_id = p_employee_id LIMIT 1;
    
    SELECT department_id INTO v_old_department_id FROM public.user_departments WHERE user_id = p_employee_id LIMIT 1;

    -- Insert Promotion Record
    INSERT INTO public.promotions (
        employee_id,
        promoted_by,
        old_role,
        new_role,
        old_job_title,
        new_job_title,
        old_department_id,
        new_department_id,
        effective_date,
        notes,
        status
    ) VALUES (
        p_employee_id,
        p_promoter_id,
        v_old_role,
        p_new_role,
        v_old_job_title,
        p_new_job_title,
        v_old_department_id,
        p_new_department_id,
        p_effective_date,
        p_notes,
        CASE WHEN p_effective_date <= v_current_date THEN 'completed' ELSE 'pending' END
    ) RETURNING id INTO v_promotion_id;

    -- Apply changes IMMEDIATELY if date is today or present
    IF p_effective_date <= v_current_date THEN
        -- Update Profile Title
        UPDATE public.profiles 
        SET job_title = p_new_job_title, updated_at = NOW() 
        WHERE id = p_employee_id;

        -- Update Role (Upsert)
        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_employee_id, p_new_role)
        ON CONFLICT (user_id) DO UPDATE SET role = p_new_role;

        -- Update Department (Upsert)
        -- First delete existing if needed or just upsert if unique constraint exists.
        -- Assuming 1 department per user logic for now.
        DELETE FROM public.user_departments WHERE user_id = p_employee_id;
        IF p_new_department_id IS NOT NULL THEN
            INSERT INTO public.user_departments (user_id, department_id)
            VALUES (p_employee_id, p_new_department_id);
        END IF;
    END IF;

    RETURN v_promotion_id;
END;
$$;

-- Function to Process Due Promotions (Can be called via Cron or Admin Button)
CREATE OR REPLACE FUNCTION public.process_due_promotions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_promo RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_promo IN 
        SELECT * FROM public.promotions 
        WHERE status = 'pending' AND effective_date <= CURRENT_DATE
    LOOP
        -- Update Profile Title
        UPDATE public.profiles 
        SET job_title = v_promo.new_job_title, updated_at = NOW() 
        WHERE id = v_promo.employee_id;

        -- Update Role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_promo.employee_id, v_promo.new_role)
        ON CONFLICT (user_id) DO UPDATE SET role = v_promo.new_role;

        -- Update Department
        DELETE FROM public.user_departments WHERE user_id = v_promo.employee_id;
        IF v_promo.new_department_id IS NOT NULL THEN
            INSERT INTO public.user_departments (user_id, department_id)
            VALUES (v_promo.employee_id, v_promo.new_department_id);
        END IF;

        -- Mark as completed
        UPDATE public.promotions SET status = 'completed', updated_at = NOW() WHERE id = v_promo.id;
        
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;
