-- Allow NULL for target_role and target_department_id to support flexible rules
ALTER TABLE public.training_assignment_rules ALTER COLUMN target_role DROP NOT NULL;
ALTER TABLE public.training_assignment_rules ALTER COLUMN target_department_id DROP NOT NULL;

-- Ensure at least one condition is set
ALTER TABLE public.training_assignment_rules DROP CONSTRAINT IF EXISTS check_rule_not_empty;
ALTER TABLE public.training_assignment_rules ADD CONSTRAINT check_rule_not_empty 
    CHECK (target_role IS NOT NULL OR target_department_id IS NOT NULL OR job_title_id IS NOT NULL);
;
