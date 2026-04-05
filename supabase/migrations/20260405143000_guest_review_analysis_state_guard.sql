CREATE OR REPLACE FUNCTION public.preserve_guest_review_analysis_state_on_refresh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_fingerprint jsonb;
  new_fingerprint jsonb;
BEGIN
  old_fingerprint := jsonb_build_object(
    'review_url', coalesce(trim(OLD.review_url), ''),
    'reviewer_name', coalesce(trim(OLD.reviewer_name), ''),
    'review_title', coalesce(trim(OLD.review_title), ''),
    'review_text', coalesce(trim(OLD.review_text), ''),
    'review_text_normalized', coalesce(trim(OLD.review_text_normalized), ''),
    'review_language', coalesce(trim(OLD.review_language), ''),
    'rating_normalized_10', OLD.rating_normalized_10,
    'published_at', OLD.published_at
  );

  new_fingerprint := jsonb_build_object(
    'review_url', coalesce(trim(NEW.review_url), ''),
    'reviewer_name', coalesce(trim(NEW.reviewer_name), ''),
    'review_title', coalesce(trim(NEW.review_title), ''),
    'review_text', coalesce(trim(NEW.review_text), ''),
    'review_text_normalized', coalesce(trim(NEW.review_text_normalized), ''),
    'review_language', coalesce(trim(NEW.review_language), ''),
    'rating_normalized_10', NEW.rating_normalized_10,
    'published_at', NEW.published_at
  );

  IF NEW.ai_analysis_status = 'pending'
    AND old_fingerprint = new_fingerprint
    AND coalesce(OLD.ai_analysis_status, '') <> ''
  THEN
    NEW.ai_analysis_status := OLD.ai_analysis_status;
    NEW.status := coalesce(OLD.status, NEW.status, 'collected');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_preserve_guest_review_analysis_state_on_refresh ON public.guest_reviews;

CREATE TRIGGER trigger_preserve_guest_review_analysis_state_on_refresh
BEFORE UPDATE ON public.guest_reviews
FOR EACH ROW
EXECUTE FUNCTION public.preserve_guest_review_analysis_state_on_refresh();
