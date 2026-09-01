-- ==============================================================================
-- P4-c TENANCY: messaging (conversations, conversation_participants, messages,
--                          message_attachments)
-- ==============================================================================
-- Intent
--   Add organization_id to all four messaging tables, backfill, index, enforce
--   NOT NULL, keep populated via BEFORE INSERT triggers, and rewrite RLS so that
--   messaging is strictly tenant-scoped.
--
--   Backfill sources:
--     conversations           -> LIT (single tenant; AMBIGUOUS container)
--     messages                -> department_id -> departments.organization_id
--                                else sender's active org membership
--                                else LIT
--     conversation_participants -> parent conversation.organization_id else LIT
--     message_attachments     -> parent message.organization_id else LIT
--
--   CRITICAL RLS changes to public.messages:
--     (a) every command now requires org_visible(organization_id);
--     (b) the "recipient_id IS NULL => world readable" broadcast leak is removed
--         -- recipient_id IS NULL rows are now readable ONLY within the same
--         organization_id (org-broadcast concept), enforced by the org_visible
--         gate that wraps the whole USING clause;
--     (c) the is_regional_admin_or_higher() all-messages read is replaced with
--         is_tenant_people_admin(organization_id).
--     Sender/recipient own-row access is preserved. Property/department scoped
--     reads are preserved but now additionally require same-org.
--
--   No access is broadened relative to the current live policies except the
--   addition of is_platform_super_admin() escape hatches (consistent with the
--   rest of the tenancy sweep) and explicit service_role FOR ALL policies
--   (service_role already bypasses RLS).
--
-- Rollback
--   BEGIN;
--     ALTER TABLE public.message_attachments      DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.conversation_participants DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.messages                 DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.conversations            DROP COLUMN IF EXISTS organization_id;
--     DROP FUNCTION IF EXISTS public.set_messaging_org_default_lit();
--     DROP FUNCTION IF EXISTS public.set_messaging_message_org();
--     DROP FUNCTION IF EXISTS public.set_messaging_org_from_parent();
--   COMMIT;
--   (and restore the previous policies from git history)
--
-- Idempotent. Wrapped in a single transaction.
-- ==============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Trigger functions
-- --------------------------------------------------------------------------

-- conversations: no parent path -> default to the canonical org when NULL.
CREATE OR REPLACE FUNCTION public.set_messaging_org_default_lit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := 'e0000000-0000-0000-0000-000000000001'::uuid;
  END IF;
  RETURN NEW;
END;
$fn$;

-- messages: department -> sender membership -> LIT
CREATE OR REPLACE FUNCTION public.set_messaging_message_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT d.organization_id INTO v_org
    FROM public.departments d
    WHERE d.id = NEW.department_id;
  END IF;

  IF v_org IS NULL AND NEW.sender_id IS NOT NULL THEN
    SELECT om.organization_id INTO v_org
    FROM public.organization_memberships om
    WHERE om.user_id = NEW.sender_id
      AND om.is_active
    ORDER BY om.is_primary DESC, om.created_at ASC
    LIMIT 1;
  END IF;

  NEW.organization_id := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);
  RETURN NEW;
END;
$fn$;

-- VIA_PARENT: read organization_id from a parent row.
-- TG_ARGV[0] = parent table name, TG_ARGV[1] = local FK column name.
CREATE OR REPLACE FUNCTION public.set_messaging_org_from_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_parent text := TG_ARGV[0];
  v_fk     text := TG_ARGV[1];
  v_fkval  uuid;
  v_org    uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;

  IF v_fkval IS NOT NULL THEN
    EXECUTE format('SELECT organization_id FROM public.%I WHERE id = $1', v_parent)
      INTO v_org USING v_fkval;
  END IF;

  NEW.organization_id := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_messaging_org_default_lit()  FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.set_messaging_message_org()      FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.set_messaging_org_from_parent()  FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.set_messaging_org_default_lit()  TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.set_messaging_message_org()      TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.set_messaging_org_from_parent()  TO authenticated, service_role;

-- --------------------------------------------------------------------------
-- 1. conversations  (AMBIGUOUS -> LIT)
-- --------------------------------------------------------------------------
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'conversations'
      AND constraint_name = 'conversations_organization_id_fkey'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.conversations
   SET organization_id = 'e0000000-0000-0000-0000-000000000001'::uuid
 WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_organization_id
  ON public.conversations (organization_id);

ALTER TABLE public.conversations ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.conversations;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_messaging_org_default_lit();

-- --------------------------------------------------------------------------
-- 2. messages  (USER_OWNED)
-- --------------------------------------------------------------------------
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'messages'
      AND constraint_name = 'messages_organization_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.messages m
   SET organization_id = COALESCE(
     (SELECT d.organization_id FROM public.departments d WHERE d.id = m.department_id),
     (SELECT om.organization_id
        FROM public.organization_memberships om
       WHERE om.user_id = m.sender_id
         AND om.is_active
       ORDER BY om.is_primary DESC, om.created_at ASC
       LIMIT 1),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE m.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_organization_id
  ON public.messages (organization_id);

ALTER TABLE public.messages ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.messages;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_messaging_message_org();

-- --------------------------------------------------------------------------
-- 3. conversation_participants  (VIA_PARENT -> conversations)
-- --------------------------------------------------------------------------
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'conversation_participants'
      AND constraint_name = 'conversation_participants_organization_id_fkey'
  ) THEN
    ALTER TABLE public.conversation_participants
      ADD CONSTRAINT conversation_participants_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.conversation_participants cp
   SET organization_id = COALESCE(
     (SELECT c.organization_id FROM public.conversations c WHERE c.id = cp.conversation_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE cp.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_organization_id
  ON public.conversation_participants (organization_id);

ALTER TABLE public.conversation_participants ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.conversation_participants;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.conversation_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_messaging_org_from_parent('conversations', 'conversation_id');

-- --------------------------------------------------------------------------
-- 4. message_attachments  (VIA_PARENT -> messages)
-- --------------------------------------------------------------------------
ALTER TABLE public.message_attachments ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'message_attachments'
      AND constraint_name = 'message_attachments_organization_id_fkey'
  ) THEN
    ALTER TABLE public.message_attachments
      ADD CONSTRAINT message_attachments_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.message_attachments ma
   SET organization_id = COALESCE(
     (SELECT m.organization_id FROM public.messages m WHERE m.id = ma.message_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE ma.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_attachments_organization_id
  ON public.message_attachments (organization_id);

ALTER TABLE public.message_attachments ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.message_attachments;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.message_attachments
  FOR EACH ROW EXECUTE FUNCTION public.set_messaging_org_from_parent('messages', 'message_id');

-- ==============================================================================
-- RLS
-- ==============================================================================

-- --------------------------------------------------------------------------
-- conversations
-- --------------------------------------------------------------------------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view conversations they are part of" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations"               ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations"         ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_participant_same_org"    ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_participant_same_org"    ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_participant_same_org"    ON public.conversations;

CREATE POLICY "conversations_select_participant_same_org" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    ((SELECT auth.uid()) = ANY (participant_ids) AND public.org_visible(organization_id))
    OR public.is_platform_super_admin()
  );

CREATE POLICY "conversations_insert_participant_same_org" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = ANY (participant_ids)
    AND public.org_visible(organization_id)
  );

CREATE POLICY "conversations_update_participant_same_org" ON public.conversations
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = ANY (participant_ids)
    AND public.org_visible(organization_id)
  )
  WITH CHECK (
    (SELECT auth.uid()) = ANY (participant_ids)
    AND public.org_visible(organization_id)
  );

DROP POLICY IF EXISTS "conversations_service_role_all" ON public.conversations;
CREATE POLICY "conversations_service_role_all" ON public.conversations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- conversation_participants
-- --------------------------------------------------------------------------
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own conversations"           ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations they're invited to"  ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can leave their own conversations"          ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_own_same_org"    ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_own_same_org"    ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_delete_own_same_org"    ON public.conversation_participants;

CREATE POLICY "conversation_participants_select_own_same_org" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (
    (participant_id = (SELECT auth.uid()) AND public.org_visible(organization_id))
    OR public.is_platform_super_admin()
  );

CREATE POLICY "conversation_participants_insert_own_same_org" ON public.conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    participant_id = (SELECT auth.uid())
    AND public.org_visible(organization_id)
  );

CREATE POLICY "conversation_participants_delete_own_same_org" ON public.conversation_participants
  FOR DELETE TO authenticated
  USING (
    participant_id = (SELECT auth.uid())
    AND public.org_visible(organization_id)
  );

DROP POLICY IF EXISTS "conversation_participants_service_role_all" ON public.conversation_participants;
CREATE POLICY "conversation_participants_service_role_all" ON public.conversation_participants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- messages  (CRITICAL rewrite)
-- --------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consolidated_messages_select" ON public.messages;
DROP POLICY IF EXISTS "consolidated_messages_insert" ON public.messages;
DROP POLICY IF EXISTS "consolidated_messages_update" ON public.messages;

-- SELECT: same-org required on every row. recipient_id IS NULL rows are now
-- org-broadcast only (readable within the same organization_id, never globally).
-- is_regional_admin_or_higher() -> is_tenant_people_admin(organization_id).
CREATE POLICY "consolidated_messages_select" ON public.messages
  FOR SELECT TO authenticated
  USING (
    (
      public.org_visible(organization_id)
      AND (
        sender_id = (SELECT auth.uid())
        OR recipient_id = (SELECT auth.uid())
        OR recipient_id IS NULL
        OR public.is_tenant_people_admin(organization_id)
        OR (property_id IS NOT NULL AND property_id = ANY (get_user_properties((SELECT auth.uid()))))
        OR (department_id IS NOT NULL AND department_id = ANY (get_user_departments((SELECT auth.uid()))))
      )
    )
    OR public.is_platform_super_admin()
  );

CREATE POLICY "consolidated_messages_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND public.org_visible(organization_id)
    AND (property_id IS NULL   OR property_id   = ANY (get_user_properties((SELECT auth.uid()))))
    AND (department_id IS NULL OR department_id = ANY (get_user_departments((SELECT auth.uid()))))
  );

CREATE POLICY "consolidated_messages_update" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    public.org_visible(organization_id)
    AND (sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()))
    AND status <> 'archived'::text
  )
  WITH CHECK (
    public.org_visible(organization_id)
    AND (sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "messages_service_role_all" ON public.messages;
CREATE POLICY "messages_service_role_all" ON public.messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- message_attachments
-- --------------------------------------------------------------------------
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view attachments of accessible messages" ON public.message_attachments;
DROP POLICY IF EXISTS "Users can insert attachments to their messages"    ON public.message_attachments;
DROP POLICY IF EXISTS "Users can update their own attachments"            ON public.message_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments"            ON public.message_attachments;
DROP POLICY IF EXISTS "message_attachments_select_same_org"               ON public.message_attachments;
DROP POLICY IF EXISTS "message_attachments_insert_own_same_org"           ON public.message_attachments;
DROP POLICY IF EXISTS "message_attachments_update_own_same_org"           ON public.message_attachments;
DROP POLICY IF EXISTS "message_attachments_delete_own_same_org"           ON public.message_attachments;

CREATE POLICY "message_attachments_select_same_org" ON public.message_attachments
  FOR SELECT TO authenticated
  USING (
    (
      public.org_visible(organization_id)
      AND EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.id = message_attachments.message_id
          AND (
            m.sender_id = (SELECT auth.uid())
            OR m.recipient_id = (SELECT auth.uid())
            OR m.recipient_id IS NULL
          )
      )
    )
    OR public.is_platform_super_admin()
  );

CREATE POLICY "message_attachments_insert_own_same_org" ON public.message_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by_id = (SELECT auth.uid())
    AND public.org_visible(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
        AND m.sender_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "message_attachments_update_own_same_org" ON public.message_attachments
  FOR UPDATE TO authenticated
  USING (
    uploaded_by_id = (SELECT auth.uid())
    AND public.org_visible(organization_id)
  )
  WITH CHECK (
    uploaded_by_id = (SELECT auth.uid())
    AND public.org_visible(organization_id)
  );

CREATE POLICY "message_attachments_delete_own_same_org" ON public.message_attachments
  FOR DELETE TO authenticated
  USING (
    uploaded_by_id = (SELECT auth.uid())
    AND public.org_visible(organization_id)
  );

DROP POLICY IF EXISTS "message_attachments_service_role_all" ON public.message_attachments;
CREATE POLICY "message_attachments_service_role_all" ON public.message_attachments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
