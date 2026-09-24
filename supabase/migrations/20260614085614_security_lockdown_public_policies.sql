BEGIN;
-- Remove anon/PUBLIC read access; restrict to authenticated (internal intranet).
-- Each of these was role={} (PUBLIC, includes anon) with USING(true).
ALTER POLICY "profiles_select_public"                ON public.profiles                  TO authenticated;
ALTER POLICY "properties_select_public"              ON public.properties                TO authenticated;
ALTER POLICY "Anyone can read role_permissions"      ON public.role_permissions          TO authenticated;
ALTER POLICY "Everyone can view skills"              ON public.skills                    TO authenticated;
ALTER POLICY "Everyone can view module skills"       ON public.module_skills             TO authenticated;
ALTER POLICY "Anyone view escalation rules"          ON public.escalation_rules          TO authenticated;
ALTER POLICY "Anyone can view related articles"      ON public.knowledge_related_articles TO authenticated;
ALTER POLICY "Templates are viewable by everyone"    ON public.onboarding_templates      TO authenticated;
ALTER POLICY "training_content_templates_select"     ON public.training_content_templates TO authenticated;
ALTER POLICY "Anyone can view workflow definitions"  ON public.workflow_definitions      TO authenticated;
COMMIT;
