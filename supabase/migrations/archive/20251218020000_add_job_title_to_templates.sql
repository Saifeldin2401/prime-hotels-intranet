-- Add job_title column to onboarding_templates
ALTER TABLE public.onboarding_templates
ADD COLUMN IF NOT EXISTS job_title text;

-- Add comment
COMMENT ON COLUMN public.onboarding_templates.job_title IS 'Specific job title this template applies to (alternative to system role)';
