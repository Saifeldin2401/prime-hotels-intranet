create schema if not exists extensions;

alter extension btree_gist set schema extensions;

alter policy "Users can view comments" on public.announcement_comments to authenticated;
alter policy "approval_history_select" on public.approval_history to authenticated;
alter policy "departments_select" on public.departments to authenticated;
alter policy "document_versions_select" on public.document_versions to authenticated;
alter policy "Anyone view escalation rules" on public.escalation_rules to authenticated;
alter policy "Everyone can view module skills" on public.module_skills to authenticated;
alter policy "notification_templates_read" on public.notification_templates to authenticated;
alter policy "Templates are viewable by everyone" on public.onboarding_templates to authenticated;
alter policy "properties_select" on public.properties to authenticated;
alter policy "Anyone can view related articles" on public.related_articles to authenticated;
alter policy "Anyone can read role_permissions" on public.role_permissions to authenticated;
alter policy "Everyone can view skills" on public.skills to authenticated;
alter policy "training_certificates_select" on public.training_certificates to authenticated;
alter policy "training_content_templates_select" on public.training_content_templates to authenticated;
alter policy "training_quizzes_select" on public.training_quizzes to authenticated;
;
