-- training_progress.assignment_id points at training_assignment_rules but had no
-- foreign key (so PostgREST could not embed the assignment, and ids from dropped
-- assignment tables lingered). Clients may still pass a non-rule id (e.g. a
-- self-enrolment's own progress id) to the completion RPCs, so unknown ids are
-- dropped to NULL instead of failing the learner's write.

CREATE OR REPLACE FUNCTION public.tg_training_progress_valid_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.assignment_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.training_assignment_rules r WHERE r.id = NEW.assignment_id) THEN
    NEW.assignment_id := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.tg_training_progress_valid_assignment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_training_progress_valid_assignment ON public.training_progress;
CREATE TRIGGER trg_training_progress_valid_assignment
  BEFORE INSERT OR UPDATE OF assignment_id ON public.training_progress
  FOR EACH ROW EXECUTE FUNCTION public.tg_training_progress_valid_assignment();

UPDATE public.training_progress tp
   SET assignment_id = NULL
 WHERE tp.assignment_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.training_assignment_rules r WHERE r.id = tp.assignment_id);

ALTER TABLE public.training_progress
  ADD CONSTRAINT training_progress_assignment_id_fkey
  FOREIGN KEY (assignment_id) REFERENCES public.training_assignment_rules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_training_progress_assignment_id ON public.training_progress (assignment_id);
