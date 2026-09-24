-- training_progress had no org-fill trigger either. Rows created by assignment
-- RPCs carry organization_id, but a learner's first progress row written by the
-- app (catalog self-enrolment, first open of an unassigned module) omits it and
-- failed the INSERT policy (org_visible(organization_id) AND ...).
-- Fill from the module, else the quiz, else the learner's primary membership.

DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.training_progress;
CREATE TRIGGER trg_fill_organization_id
  BEFORE INSERT ON public.training_progress
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_organization_id(
    'training_modules:training_id', 'learning_quizzes:training_id', 'member:user_id');

UPDATE public.training_progress tp
   SET organization_id = COALESCE(
         (SELECT m.organization_id FROM public.training_modules m WHERE m.id = tp.training_id),
         (SELECT q.organization_id FROM public.learning_quizzes q WHERE q.id = tp.training_id),
         (SELECT om.organization_id FROM public.organization_memberships om
           WHERE om.user_id = tp.user_id AND om.is_active
           ORDER BY om.is_primary DESC NULLS LAST, om.created_at ASC LIMIT 1))
 WHERE tp.organization_id IS NULL;
