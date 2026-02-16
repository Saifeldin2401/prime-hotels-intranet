-- Reduce high-signal Supabase advisor warnings:
-- 1) Add missing FK covering indexes
-- 2) Recreate specific RLS policies to avoid per-row auth function re-evaluation

-- FK covering indexes
create index if not exists idx_ai_change_evaluations_policy_change_id
    on public.ai_change_evaluations (policy_change_id);

create index if not exists idx_ai_decisions_proposal_id
    on public.ai_decisions (proposal_id);

create index if not exists idx_ai_policy_changes_from_version_id
    on public.ai_policy_changes (from_version_id);

create index if not exists idx_ai_policy_changes_to_version_id
    on public.ai_policy_changes (to_version_id);

create index if not exists idx_ai_policy_sets_active_version_id
    on public.ai_policy_sets (active_version_id);

create index if not exists idx_ai_proposals_base_version_id
    on public.ai_proposals (base_version_id);

create index if not exists idx_ai_proposals_policy_set_id
    on public.ai_proposals (policy_set_id);

create index if not exists idx_sop_comment_votes_user_id
    on public.sop_comment_votes (user_id);

-- Certificate template policies
drop policy if exists certificate_templates_admin_write on public.certificate_templates;
drop policy if exists certificate_templates_admin_insert on public.certificate_templates;
drop policy if exists certificate_templates_admin_update on public.certificate_templates;
drop policy if exists certificate_templates_admin_delete on public.certificate_templates;

create policy certificate_templates_admin_insert
on public.certificate_templates
for insert
to authenticated
with check (is_admin((select auth.uid())));

create policy certificate_templates_admin_update
on public.certificate_templates
for update
to authenticated
using (is_admin((select auth.uid())))
with check (is_admin((select auth.uid())));

create policy certificate_templates_admin_delete
on public.certificate_templates
for delete
to authenticated
using (is_admin((select auth.uid())));

-- SOP comment vote policies
drop policy if exists sop_comment_votes_insert on public.sop_comment_votes;
drop policy if exists sop_comment_votes_update on public.sop_comment_votes;
drop policy if exists sop_comment_votes_delete on public.sop_comment_votes;

create policy sop_comment_votes_insert
on public.sop_comment_votes
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy sop_comment_votes_update
on public.sop_comment_votes
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy sop_comment_votes_delete
on public.sop_comment_votes
for delete
to authenticated
using (user_id = (select auth.uid()));
