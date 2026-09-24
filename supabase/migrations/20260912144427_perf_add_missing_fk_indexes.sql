
-- Fixes unindexed_foreign_keys findings: quizzes and tasks FK columns had no
-- covering index. Cheap now; these are exactly the org/department/user scoping
-- columns RLS policies filter on, so this matters more as data grows.
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON public.quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_quizzes_organization_id ON public.quizzes(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON public.tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_id ON public.tasks(created_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON public.tasks(organization_id);
