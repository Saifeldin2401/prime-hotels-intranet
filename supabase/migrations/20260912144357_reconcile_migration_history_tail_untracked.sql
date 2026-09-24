
-- Bookkeeping-only reconciliation: these 8 local migration files were applied to
-- production via raw SQL execution (bypassing the tracked migration flow), so their
-- versions never landed in schema_migrations even though their effects are live.
-- Verified live on 2026-09-12 before backfilling (organization_id NOT NULL constraints,
-- resolve_account_context break-glass logic, deploy_master_content clone logic,
-- profiles/user_roles organization_id nullability, gemini fallback config, storage
-- policies since superseded by fix_video_upload_storage_final). No DDL executed here,
-- purely restoring migration-history integrity.
insert into supabase_migrations.schema_migrations (version, name, statements)
values
  ('20260903100000', 'ai_reenable_gemini_fallback', ARRAY['-- reconciled: see supabase/migrations/20260903100000_ai_reenable_gemini_fallback.sql']),
  ('20260904140000', 'p12_multi_tenant_remediation_core', ARRAY['-- reconciled: see supabase/migrations/20260904140000_p12_multi_tenant_remediation_core.sql']),
  ('20260904150000', 'p13_storage_and_subsystems_hardening', ARRAY['-- reconciled: see supabase/migrations/20260904150000_p13_storage_and_subsystems_hardening.sql']),
  ('20260904170000', 'p14_platform_operator_tenant_separation', ARRAY['-- reconciled: see supabase/migrations/20260904170000_p14_platform_operator_tenant_separation.sql']),
  ('20260905230000', 'fix_video_upload_and_media_storage', ARRAY['-- reconciled: see supabase/migrations/20260905230000_fix_video_upload_and_media_storage.sql']),
  ('20260907173000', 'deploy_master_content_with_training_blocks', ARRAY['-- reconciled: see supabase/migrations/20260907173000_deploy_master_content_with_training_blocks.sql']),
  ('20260908124000', 'platform_operator_user_creation_fixes', ARRAY['-- reconciled: see supabase/migrations/20260908124000_platform_operator_user_creation_fixes.sql']),
  ('20260908165714', 'remove_legacy_tenant_defaults', ARRAY['-- reconciled: see supabase/migrations/20260908165714_remove_legacy_tenant_defaults.sql'])
on conflict (version) do nothing;
