-- Practical-assignment submissions never received an organization_id: the table
-- had no org-fill trigger and assignmentSubmissionService does not send one, so
-- the INSERT policy (user_id = auth.uid() AND org_visible(organization_id))
-- rejected every learner submission (the table has 0 rows in production).
-- Fill it from the module (fallback: the learner's primary membership).

DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.training_assignment_submissions;
CREATE TRIGGER trg_fill_organization_id
  BEFORE INSERT ON public.training_assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_organization_id('training_modules:training_module_id', 'member:user_id');

UPDATE public.training_assignment_submissions s
   SET organization_id = m.organization_id
  FROM public.training_modules m
 WHERE m.id = s.training_module_id AND s.organization_id IS NULL;

ALTER TABLE public.training_assignment_submissions ALTER COLUMN organization_id SET NOT NULL;
