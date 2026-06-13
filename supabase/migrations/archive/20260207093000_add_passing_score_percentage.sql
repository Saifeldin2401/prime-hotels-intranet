-- Add passing score to training modules
ALTER TABLE public.training_modules
  ADD COLUMN IF NOT EXISTS passing_score_percentage INTEGER DEFAULT 80;

COMMENT ON COLUMN public.training_modules.passing_score_percentage IS 'Passing score percentage required to pass the module';
