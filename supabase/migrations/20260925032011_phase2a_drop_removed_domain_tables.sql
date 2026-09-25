-- Phase 2a (rebuild, 2026-09-25): drop tables of removed product domains.
--
-- Announcements, tasks, messaging, calendar events, status history, pinned
-- items, microlearning, motivational content, the marketing-site briefing form,
-- the system wiki and gamification (achievements) are not part of the product
-- (docs/product/PRODUCT_DEFINITION.md, decisions 2 and 4). No app code reads
-- them any more (removed in the same change); edge functions scheduled-reports
-- and auto-analyze-feedback were redeployed without their tasks dependency.
--
-- Every table is copied to the archive schema first, so no row is lost.

CREATE SCHEMA IF NOT EXISTS archive;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'announcement_acknowledgments', 'announcement_attachments', 'announcement_comments',
    'announcement_reads', 'announcement_targets', 'announcements',
    'tasks', 'messages', 'conversations', 'events', 'status_history', 'user_pins',
    'microlearning_content', 'motivational_content', 'partner_briefing_requests',
    'system_wiki', 'user_achievements', 'achievement_definitions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('CREATE TABLE IF NOT EXISTS archive.%I AS TABLE public.%I', t || '_20260925', t);
    END IF;
  END LOOP;
END $$;

-- Achievement awarding ran as a trigger on every training_progress write.
DROP TRIGGER IF EXISTS trg_check_achievements ON public.training_progress;

DROP VIEW IF EXISTS public.user_message_stats;
DROP VIEW IF EXISTS public.achievement_leaderboard;

-- Functions that only served the removed domains (all overloads).
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN (
         'get_announcement_compliance_breakdown', 'set_announcement_child_org',
         'get_user_pins_with_details', 'reorder_user_pins',
         'get_events_for_range', 'update_conversation_last_message', 'log_status_change',
         'get_task_stats', 'create_task_atomic', 'is_task_creator',
         'get_task_completion_metrics', 'secure_search_tasks',
         'check_and_award_achievement', 'trigger_check_achievements_on_training'
       )
  LOOP
    EXECUTE format('DROP FUNCTION %s CASCADE', f);
  END LOOP;
END $$;

DROP TABLE IF EXISTS
  public.announcement_acknowledgments, public.announcement_attachments, public.announcement_comments,
  public.announcement_reads, public.announcement_targets, public.announcements,
  public.tasks, public.messages, public.conversations, public.events, public.status_history,
  public.user_pins, public.microlearning_content, public.motivational_content,
  public.partner_briefing_requests, public.system_wiki,
  public.user_achievements, public.achievement_definitions;

-- The archived achievement copies still use this enum; keep it with them.
ALTER TYPE public.achievement_type SET SCHEMA archive;
