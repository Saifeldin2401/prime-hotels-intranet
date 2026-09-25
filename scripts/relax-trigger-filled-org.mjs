// `supabase gen types` marks every NOT NULL column without a DEFAULT as required on
// Insert. organization_id on the tables below is NOT NULL but is filled by a BEFORE
// INSERT trigger (derived from the parent row / owner / caller), so callers legitimately
// omit it. This makes it optional in those tables' Insert types only.
//
// Regenerate the list with:
//   select string_agg(distinct cl.relname, ' ' order by cl.relname)
//   from pg_trigger tg join pg_class cl on cl.oid = tg.tgrelid
//   join pg_namespace n on n.oid = cl.relnamespace join pg_proc p on p.oid = tg.tgfoid
//   where n.nspname = 'public' and not tg.tgisinternal
//     and (tg.tgtype & 2) = 2 and (tg.tgtype & 4) = 4
//     and p.prosrc ~* 'NEW\.organization_id\s*:='
//     and exists (select 1 from information_schema.columns c where c.table_schema = 'public'
//       and c.table_name = cl.relname and c.column_name = 'organization_id'
//       and c.is_nullable = 'NO' and c.column_default is null);
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const TRIGGER_FILLED_ORG_TABLES = `
account_action_notes ai_usage_log analytics_events announcement_acknowledgments announcement_attachments
announcement_comments announcement_reads announcement_targets announcements assessment_questions assessments
audit_export_retention_policies brands categories certificate_history certificate_templates certificates comments
competencies competency_levels content_change_log content_reviews conversations course_competencies
course_generation_presets course_modules course_source_documents course_visual_assets courses departments
document_acknowledgments document_approvals document_bookmarks document_categories document_comments
document_department_access document_favorites document_feedback document_folders document_tag_assignments
document_tags document_versions documents events hotels inbound_emails knowledge_chunks knowledge_related_articles
quizzes media_asset_usages media_assets media_collection_items media_collections messages
microlearning_content module_skills pending_user_approvals practical_assessments practical_submissions
question_banks related_articles report_definitions scheduled_compliance_reports search_logs sop_comments
source_change_flags status_history system_events assignments training_assignment_submissions lesson_progress
training_certificates training_content_templates course_versions courses training_path_modules
training_paths training_session_attendees training_sessions unified_question_attempts unified_question_options
unified_question_usages unified_question_versions unified_questions unified_quiz_questions unified_quiz_sessions
user_competencies user_path_enrollments user_sessions user_skills webhook_deliveries
`.trim().split(/\s+/)

export function relaxTriggerFilledOrg(types) {
  let out = types
  let changed = 0
  for (const table of TRIGGER_FILLED_ORG_TABLES) {
    // Locate "      <table>: {\n        Row: {" then the following "        Insert: {" block.
    const start = out.indexOf(`\n      ${table}: {\n        Row: {`)
    if (start === -1) continue
    const insertStart = out.indexOf('\n        Insert: {', start)
    const insertEnd = out.indexOf('\n        }', insertStart + 1)
    if (insertStart === -1 || insertEnd === -1) continue
    const block = out.slice(insertStart, insertEnd)
    // organization_id may be the block's last field (the slice then has no trailing newline).
    const relaxed = block.replace(/\n(\s+)organization_id: string(?=\n|$)/, '\n$1organization_id?: string')
    if (relaxed !== block) {
      out = out.slice(0, insertStart) + relaxed + out.slice(insertEnd)
      changed++
    }
  }
  return { types: out, changed }
}

// CLI: node scripts/relax-trigger-filled-org.mjs <file> [<file> ...]
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const file of process.argv.slice(2)) {
    const { types, changed } = relaxTriggerFilledOrg(readFileSync(file, 'utf8'))
    writeFileSync(file, types)
    console.log(`${file}: relaxed organization_id on ${changed} Insert types`)
  }
}
