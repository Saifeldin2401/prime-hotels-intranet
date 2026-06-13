-- Migration: Fix HR Integrity (Simplified)
-- Purpose: Add missing FKs and ensure data integrity for attendance, performance, and goals.
-- Date: 2024-12-19

BEGIN;

-- 1. ADD MISSING FOREIGN KEYS
-- Link attendance to profiles
ALTER TABLE public.attendance
ADD CONSTRAINT attendance_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Link performance_reviews to profiles (employee and reviewer)
ALTER TABLE public.performance_reviews
ADD CONSTRAINT performance_reviews_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.performance_reviews
ADD CONSTRAINT performance_reviews_reviewer_id_fkey 
FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Link goals to profiles
ALTER TABLE public.goals
ADD CONSTRAINT goals_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Link payslips to profiles
ALTER TABLE public.payslips
ADD CONSTRAINT payslips_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 2. ENFORCE ENUM CONSISTENCY
DO $$ 
BEGIN
    -- Attendance status check
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'attendance_status_check') THEN
        ALTER TABLE public.attendance ADD CONSTRAINT attendance_status_check CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave'));
    END IF;

    -- Goal status check
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'goals_status_check') THEN
        ALTER TABLE public.goals ADD CONSTRAINT goals_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));
    END IF;
END $$;

-- 3. ENABLE RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- 4. BASIC RLS POLICIES (Users see own, HR/Managers see property-scoped)
-- Note: Simplified scoping for now to match core profile model

DROP POLICY IF EXISTS "attendance_select_own" ON public.attendance;
CREATE POLICY "attendance_select_own" ON public.attendance
FOR SELECT USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "performance_select_own" ON public.performance_reviews;
CREATE POLICY "performance_select_own" ON public.performance_reviews
FOR SELECT USING (employee_id = auth.uid() OR reviewer_id = auth.uid());

DROP POLICY IF EXISTS "goals_select_own" ON public.goals;
CREATE POLICY "goals_select_own" ON public.goals
FOR SELECT USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "payslips_select_own" ON public.payslips;
CREATE POLICY "payslips_select_own" ON public.payslips
FOR SELECT USING (employee_id = auth.uid());

COMMIT;
;
