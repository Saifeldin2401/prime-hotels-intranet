-- Add training builder rule settings and template metadata
ALTER TABLE public.training_modules
  ADD COLUMN IF NOT EXISTS allow_retake BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER,
  ADD COLUMN IF NOT EXISTS auto_advance BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_feedback BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_answers BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS audience TEXT,
  ADD COLUMN IF NOT EXISTS content_language TEXT,
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.training_content_templates(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.training_modules.allow_retake IS 'Allow learners to retry assessments';
COMMENT ON COLUMN public.training_modules.max_attempts IS 'Maximum attempts allowed when retries are enabled';
COMMENT ON COLUMN public.training_modules.auto_advance IS 'Auto-advance to next section when completed';
COMMENT ON COLUMN public.training_modules.show_feedback IS 'Show feedback during/after content';
COMMENT ON COLUMN public.training_modules.randomize_questions IS 'Randomize quiz questions when possible';
COMMENT ON COLUMN public.training_modules.show_answers IS 'Show correct answers after completion';
COMMENT ON COLUMN public.training_modules.time_limit_minutes IS 'Time limit for the module in minutes';
COMMENT ON COLUMN public.training_modules.audience IS 'Target audience segment';
COMMENT ON COLUMN public.training_modules.content_language IS 'Primary content language';
COMMENT ON COLUMN public.training_modules.template_id IS 'Template used to seed module content';
