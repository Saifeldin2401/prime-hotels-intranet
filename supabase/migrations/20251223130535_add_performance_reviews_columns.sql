-- Add rating column (alias for overall_rating for frontend compatibility)
ALTER TABLE public.performance_reviews
ADD COLUMN IF NOT EXISTS rating integer;

-- Add review_date column
ALTER TABLE public.performance_reviews
ADD COLUMN IF NOT EXISTS review_date date;

-- Backfill rating from overall_rating
UPDATE public.performance_reviews
SET rating = overall_rating
WHERE rating IS NULL AND overall_rating IS NOT NULL;

-- Backfill review_date from created_at
UPDATE public.performance_reviews
SET review_date = created_at::date
WHERE review_date IS NULL AND created_at IS NOT NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_date 
  ON public.performance_reviews(employee_id, review_date DESC);;
