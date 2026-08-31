-- Phase 6: drop the empty duplicate knowledge tables (canonical KB is `documents`).
DROP TABLE IF EXISTS public.knowledge_articles CASCADE;
DROP TABLE IF EXISTS public.knowledge_documents CASCADE;

-- Phase 8: tenant-isolate learning_quizzes (20 live rows) - had only legacy p5_* policies.
ALTER TABLE public.learning_quizzes ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
UPDATE public.learning_quizzes lq SET organization_id = COALESCE(tm.organization_id, 'e0000000-0000-0000-0000-000000000001')
  FROM public.training_modules tm WHERE lq.training_module_id = tm.id AND lq.organization_id IS NULL;
UPDATE public.learning_quizzes SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='learning_quizzes'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.learning_quizzes', p.policyname); END LOOP;
END $$;
ALTER TABLE public.learning_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY learning_quizzes_sel ON public.learning_quizzes FOR SELECT TO authenticated
USING (COALESCE(is_deleted,false) = false AND public.org_visible(organization_id)
  AND (status = 'published' OR created_by = auth.uid() OR public.is_tenant_content_editor(organization_id)));
CREATE POLICY learning_quizzes_write ON public.learning_quizzes FOR ALL TO authenticated
USING (public.org_visible(organization_id) AND (public.is_tenant_content_editor(organization_id) OR public.is_content_author() OR public.is_training_manager() OR created_by = auth.uid()))
WITH CHECK (public.org_visible(organization_id) AND (public.is_tenant_content_editor(organization_id) OR public.is_content_author() OR public.is_training_manager()));

-- Phase 8: defense-in-depth org_id on per-user quiz session/attempt tables (SELF policies kept).
ALTER TABLE public.unified_quiz_sessions ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
UPDATE public.unified_quiz_sessions SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.unified_question_attempts ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
UPDATE public.unified_question_attempts SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Phase 8: assessment_questions re-scoped via parent assessment org (0 rows today).
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='assessment_questions'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.assessment_questions', p.policyname); END LOOP;
END $$;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY assessment_questions_sel ON public.assessment_questions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_questions.assessment_id
  AND (public.is_platform_super_admin() OR COALESCE(a.is_master_template,false) OR public.org_visible(a.organization_id))));
CREATE POLICY assessment_questions_write ON public.assessment_questions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_questions.assessment_id
  AND ((COALESCE(a.is_master_template,false) AND public.is_platform_super_admin())
       OR (public.org_visible(a.organization_id) AND public.is_tenant_content_editor(a.organization_id)))))
WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_questions.assessment_id
  AND ((COALESCE(a.is_master_template,false) AND public.is_platform_super_admin())
       OR (public.org_visible(a.organization_id) AND public.is_tenant_content_editor(a.organization_id)))));
