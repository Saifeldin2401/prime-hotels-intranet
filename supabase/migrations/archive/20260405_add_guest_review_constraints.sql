BEGIN;

-- Add CHECK constraints for data integrity
ALTER TABLE public.guest_review_sources 
  ADD CONSTRAINT IF NOT EXISTS chk_poll_frequency_hours 
  CHECK (poll_frequency_hours > 0 AND poll_frequency_hours <= 168);

ALTER TABLE public.guest_reviews 
  ADD CONSTRAINT IF NOT EXISTS chk_sentiment_score_range 
  CHECK (sentiment_score IS NULL OR (sentiment_score >= -1 AND sentiment_score <= 1));

ALTER TABLE public.guest_reviews 
  ADD CONSTRAINT IF NOT EXISTS chk_rating_normalized_5_range 
  CHECK (rating_normalized_5 IS NULL OR (rating_normalized_5 >= 0 AND rating_normalized_5 <= 5));

ALTER TABLE public.guest_reviews 
  ADD CONSTRAINT IF NOT EXISTS chk_rating_normalized_10_range 
  CHECK (rating_normalized_10 IS NULL OR (rating_normalized_10 >= 0 AND rating_normalized_10 <= 10));

ALTER TABLE public.guest_review_issues 
  ADD CONSTRAINT IF NOT EXISTS chk_confidence_range 
  CHECK (confidence > 0 AND confidence <= 1);

COMMIT;
