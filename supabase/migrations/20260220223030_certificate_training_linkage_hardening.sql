-- Harden training certificate linkage and backfill missing references.

CREATE OR REPLACE FUNCTION public.resolve_training_certificate_progress(
  p_user_id uuid,
  p_training_module_id uuid,
  p_completion_date timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT tp.id
  FROM public.training_progress tp
  WHERE tp.user_id = p_user_id
    AND tp.training_id = p_training_module_id
    AND coalesce(tp.is_deleted, false) = false
  ORDER BY
    CASE WHEN tp.status = 'completed' THEN 0 ELSE 1 END,
    ABS(EXTRACT(EPOCH FROM (
      coalesce(tp.completed_at, tp.updated_at, tp.created_at) - coalesce(p_completion_date, coalesce(tp.completed_at, tp.updated_at, tp.created_at))
    ))) ASC NULLS LAST,
    coalesce(tp.completed_at, tp.updated_at, tp.created_at) DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.hydrate_training_certificate_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_progress_id uuid;
  v_module_id uuid;
  v_quiz_score integer;
  v_passing_score integer;
BEGIN
  IF NEW.certificate_type <> 'training' THEN
    RETURN NEW;
  END IF;

  IF NEW.training_progress_id IS NOT NULL AND NEW.training_module_id IS NULL THEN
    SELECT tp.training_id, tp.quiz_score
    INTO v_module_id, v_quiz_score
    FROM public.training_progress tp
    WHERE tp.id = NEW.training_progress_id
      AND coalesce(tp.is_deleted, false) = false
    LIMIT 1;

    IF v_module_id IS NOT NULL THEN
      NEW.training_module_id := v_module_id;
    END IF;
    IF NEW.score IS NULL AND v_quiz_score IS NOT NULL THEN
      NEW.score := v_quiz_score;
    END IF;
  END IF;

  IF NEW.training_progress_id IS NULL
     AND NEW.training_module_id IS NOT NULL
     AND NEW.user_id IS NOT NULL THEN
    SELECT public.resolve_training_certificate_progress(
      NEW.user_id,
      NEW.training_module_id,
      NEW.completion_date
    )
    INTO v_progress_id;

    IF v_progress_id IS NOT NULL THEN
      NEW.training_progress_id := v_progress_id;
    END IF;
  END IF;

  IF NEW.training_progress_id IS NOT NULL
     AND (NEW.score IS NULL OR NEW.training_module_id IS NULL) THEN
    SELECT tp.training_id, tp.quiz_score
    INTO v_module_id, v_quiz_score
    FROM public.training_progress tp
    WHERE tp.id = NEW.training_progress_id
      AND coalesce(tp.is_deleted, false) = false
    LIMIT 1;

    IF NEW.training_module_id IS NULL AND v_module_id IS NOT NULL THEN
      NEW.training_module_id := v_module_id;
    END IF;
    IF NEW.score IS NULL AND v_quiz_score IS NOT NULL THEN
      NEW.score := v_quiz_score;
    END IF;
  END IF;

  IF NEW.passing_score IS NULL AND NEW.training_module_id IS NOT NULL THEN
    SELECT tm.passing_score_percentage
    INTO v_passing_score
    FROM public.training_modules tm
    WHERE tm.id = NEW.training_module_id
    LIMIT 1;

    IF v_passing_score IS NOT NULL THEN
      NEW.passing_score := v_passing_score;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hydrate_training_certificate_fields ON public.certificates;
CREATE TRIGGER trg_hydrate_training_certificate_fields
BEFORE INSERT OR UPDATE OF certificate_type, training_module_id, training_progress_id, user_id, completion_date, score, passing_score
ON public.certificates
FOR EACH ROW
EXECUTE FUNCTION public.hydrate_training_certificate_fields();

WITH ranked_matches AS (
  SELECT
    c.id AS cert_id,
    tp.id AS progress_id,
    ROW_NUMBER() OVER (
      PARTITION BY c.id
      ORDER BY
        CASE WHEN tp.status = 'completed' THEN 0 ELSE 1 END,
        ABS(EXTRACT(EPOCH FROM (coalesce(tp.completed_at, tp.updated_at, tp.created_at) - c.completion_date))) ASC NULLS LAST,
        coalesce(tp.completed_at, tp.updated_at, tp.created_at) DESC
    ) AS rn
  FROM public.certificates c
  JOIN public.training_progress tp
    ON tp.user_id = c.user_id
   AND tp.training_id = c.training_module_id
   AND coalesce(tp.is_deleted, false) = false
  WHERE c.certificate_type = 'training'
    AND c.training_progress_id IS NULL
    AND c.training_module_id IS NOT NULL
)
UPDATE public.certificates c
SET training_progress_id = rm.progress_id
FROM ranked_matches rm
WHERE c.id = rm.cert_id
  AND rm.rn = 1;

UPDATE public.certificates c
SET training_module_id = tp.training_id
FROM public.training_progress tp
WHERE c.certificate_type = 'training'
  AND c.training_progress_id = tp.id
  AND c.training_module_id IS NULL
  AND coalesce(tp.is_deleted, false) = false;

UPDATE public.certificates c
SET score = tp.quiz_score
FROM public.training_progress tp
WHERE c.certificate_type = 'training'
  AND c.training_progress_id = tp.id
  AND c.score IS NULL
  AND tp.quiz_score IS NOT NULL
  AND coalesce(tp.is_deleted, false) = false;

UPDATE public.certificates c
SET passing_score = tm.passing_score_percentage
FROM public.training_modules tm
WHERE c.certificate_type = 'training'
  AND c.training_module_id = tm.id
  AND c.passing_score IS NULL
  AND tm.passing_score_percentage IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_certificates_training_progress_id
ON public.certificates (training_progress_id)
WHERE training_progress_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_certificates_training_lookup
ON public.certificates (certificate_type, user_id, training_module_id, completion_date DESC);
