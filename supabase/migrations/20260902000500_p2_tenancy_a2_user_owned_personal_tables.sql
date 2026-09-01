-- ==============================================================================
-- P2 TENANCY - BATCH A2: user-owned personal tables
-- ==============================================================================
-- Add organization_id to 15 USER_OWNED "personal" tables, backfill from the
-- owning user's active org membership (primary first) with fallback to the
-- canonical org 'e0000000-0000-0000-0000-000000000001' (LIT), index it, keep it
-- populated on INSERT via a BEFORE INSERT trigger, and attach tenant RLS:
--   * existing own-row user policies are left untouched (nothing stricter loosened);
--   * a people-admin READ policy is added ONLY to tables where cross-user
--     oversight is legitimate: notification_batches, knowledge_required_reading,
--     document_acknowledgments, learning_assignment_exemptions,
--     learning_assignment_user_overrides.
--   * personal-preference and credential tables (notifications,
--     notification_preferences, push_subscriptions [holds Web Push keys],
--     scheduled_reminders, user_achievements, user_settings,
--     user_dashboard_preferences, user_pins, password_history, mfa_secrets) get
--     the column/backfill/index/trigger and a service_role policy ONLY - no
--     people-admin read.
--   * service_role has full access on all 15.
--
-- document_acknowledgments had no SELECT policy - an own-row SELECT is added.
--
-- Idempotent. organization_id is NOT made NOT NULL (safe to drop later).
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.set_organization_id_from_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_col text := COALESCE(TG_ARGV[0], 'user_id');
  v_uid uuid;
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT ($1).%I', v_col) INTO v_uid USING NEW;

  IF v_uid IS NOT NULL THEN
    SELECT om.organization_id
      INTO v_org
    FROM public.organization_memberships om
    WHERE om.user_id = v_uid
      AND om.is_active
    ORDER BY om.is_primary DESC, om.created_at ASC
    LIMIT 1;
  END IF;

  NEW.organization_id := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_organization_id_from_member() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_organization_id_from_member() TO authenticated, service_role;

DO $mig$
DECLARE
  tbls text[][] := ARRAY[
    ['notifications','user_id','0'],
    ['notification_preferences','user_id','0'],
    ['notification_batches','created_by','1'],
    ['push_subscriptions','user_id','0'],
    ['scheduled_reminders','user_id','0'],
    ['user_achievements','user_id','0'],
    ['user_settings','user_id','0'],
    ['user_dashboard_preferences','user_id','0'],
    ['user_pins','user_id','0'],
    ['knowledge_required_reading','user_id','1'],
    ['document_acknowledgments','user_id','1'],
    ['learning_assignment_exemptions','user_id','1'],
    ['learning_assignment_user_overrides','user_id','1'],
    ['password_history','user_id','0'],
    ['mfa_secrets','user_id','0']
  ];
  t text;
  oc text;
  padm text;
  i int;
BEGIN
  FOR i IN 1 .. array_length(tbls, 1) LOOP
    t    := tbls[i][1];
    oc   := tbls[i][2];
    padm := tbls[i][3];

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid', t);

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = t
        AND constraint_name = t || '_organization_id_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE',
        t, t || '_organization_id_fkey');
    END IF;

    EXECUTE format(
      'UPDATE public.%I x
          SET organization_id = COALESCE(
            (SELECT om.organization_id
               FROM public.organization_memberships om
              WHERE om.user_id = x.%I
                AND om.is_active
              ORDER BY om.is_primary DESC, om.created_at ASC
              LIMIT 1),
            ''e0000000-0000-0000-0000-000000000001''::uuid)
        WHERE x.organization_id IS NULL', t, oc);

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (organization_id)',
                   'idx_' || t || '_organization_id', t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_org_from_member ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_set_org_from_member
         BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_member(%L)', t, oc);

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t || '_service_role_all', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_people_admin_read', t);
    IF padm = '1' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
           USING (organization_id = ANY (public.current_user_organization_ids())
                  AND public.is_tenant_people_admin(organization_id))',
        t || '_people_admin_read', t);
    END IF;
  END LOOP;
END;
$mig$;

DROP POLICY IF EXISTS "document_acknowledgments_select_own" ON public.document_acknowledgments;
CREATE POLICY "document_acknowledgments_select_own" ON public.document_acknowledgments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

COMMIT;
