-- Merge public.user_shifts into public.shifts (single consolidated shift table).
--
-- Context: shifts and user_shifts were two near-duplicate shift-scheduling tables.
-- Both are empty (0 rows) at the time of this migration, so no data migration is
-- required. `shifts` is kept as the surviving table (it is the one referenced by
-- the bulk of the frontend: useShifts.ts, ShiftScheduling.tsx, useDashboardStats.ts,
-- useUserData.ts, useDepartmentKPIs.ts, useDepartmentStaff.ts,
-- PropertyComparisonWidget.tsx). `user_shifts` is dropped.
--
-- Column-mapping decisions (shifts vs user_shifts):
--   id, user_id, property_id, department_id, notes, created_by, created_at,
--   updated_at  -> identical concept in both tables, kept as-is on shifts.
--   status      -> both tables had a text `status` column with a CHECK
--                  constraint restricting the allowed values. shifts allowed
--                  ('scheduled','in_progress','completed','cancelled','no_show'),
--                  user_shifts allowed ('scheduled','confirmed','completed',
--                  'cancelled','no_show'). The merged constraint is the union of
--                  both value sets so either table's former write-path keeps
--                  working unchanged.
--   shift_type  -> shifts.shift_type was `text NOT NULL` with no CHECK
--                  (free-form). user_shifts.shift_type was `text NULL DEFAULT
--                  'regular'` with a CHECK restricting it to a 5-value enum.
--                  Kept shifts' looser, unconstrained definition (no CHECK,
--                  since the shifts write-path already relies on free-form
--                  values like 'Shift'), but relaxed it to be NULLable with a
--                  DEFAULT of 'regular' to match user_shifts' more convenient
--                  default for callers that don't set it explicitly. This is a
--                  superset of what either table enforced before (strictly
--                  looser than user_shifts' CHECK, unchanged from shifts).
--   start_time,
--   end_time    -> shifts stored these as `timestamptz` (full date+time).
--                  user_shifts stored a separate `shift_date` (date) plus
--                  `start_time`/`end_time` as `time` (time-of-day only). These
--                  are the same underlying concept (when a shift starts/ends),
--                  just represented differently. Since shifts' timestamptz
--                  representation already fully encodes the date, it is kept
--                  as the canonical representation and no separate
--                  `shift_date` column is introduced (would be redundant,
--                  derivable via start_time::date). Call sites that need the
--                  date-only or time-only parts derive them from start_time /
--                  end_time (see get_next_shift() and get_dashboard_stats()
--                  below, and src/hooks/useUserShifts.ts).
--   location    -> unique to shifts, kept as-is (user_shifts had no
--                  equivalent column).
--   break_duration_minutes -> unique to shifts, kept as-is (user_shifts had no
--                  equivalent column).
--   (user_id, shift_date, start_time) UNIQUE
--               -> user_shifts had a uniqueness guard to prevent a user being
--                  double-booked at the exact same date+start time. Preserved
--                  on the merged table as UNIQUE (user_id, start_time), the
--                  timestamptz equivalent of the same guard.
--
-- RLS: shifts previously had 5 stacked policies (an ALL-command
-- property_isolation_shifts policy layered on top of 4 narrower per-command
-- policies covering the same roles/actions), and user_shifts had 2 more
-- (an ALL-command HR policy plus a SELECT-only policy). Postgres OR's every
-- permissive policy that applies to a given command together, so this was
-- pure redundant overhead with no additional restriction. This migration
-- replaces all 7 with exactly one permissive policy per command (4 total),
-- each expressing the *union* of what the old policies allowed (own record OR
-- property-scoped access via the existing check_property_access() helper --
-- the same helper used by property_isolation_announcements/_departments/
-- _training_modules -- OR an elevated HR/management role), so the effective
-- access is unchanged while eliminating the multiple_permissive_policies
-- performance advisory.

-- 1. Relax shift_type to match the more permissive of the two prior definitions.
ALTER TABLE public.shifts
  ALTER COLUMN shift_type DROP NOT NULL,
  ALTER COLUMN shift_type SET DEFAULT 'regular';

-- 2. Widen the status CHECK to the union of both tables' allowed values.
ALTER TABLE public.shifts
  DROP CONSTRAINT IF EXISTS shifts_status_check;
ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_status_check
  CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text]));

-- 3. Preserve user_shifts' duplicate-booking guard on the merged timestamptz columns.
ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_user_id_start_time_key UNIQUE (user_id, start_time);

-- 4. Drop the stacked/redundant policies on shifts.
DROP POLICY IF EXISTS "Managers can create shifts" ON public.shifts;
DROP POLICY IF EXISTS "Managers can delete shifts" ON public.shifts;
DROP POLICY IF EXISTS "Update own shifts" ON public.shifts;
DROP POLICY IF EXISTS "consolidated_shifts_select" ON public.shifts;
DROP POLICY IF EXISTS "property_isolation_shifts" ON public.shifts;

-- 5. Recreate as one clean permissive policy per command (equivalent-or-stricter
--    than the union of what was previously allowed across both tables).
CREATE POLICY "shifts_select" ON public.shifts
FOR SELECT
USING (
  user_id = (SELECT auth.uid())
  OR check_property_access(property_id)
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])
  )
);

CREATE POLICY "shifts_insert" ON public.shifts
FOR INSERT
WITH CHECK (
  check_property_access(property_id)
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])
  )
);

CREATE POLICY "shifts_update" ON public.shifts
FOR UPDATE
USING (
  user_id = (SELECT auth.uid())
  OR check_property_access(property_id)
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR check_property_access(property_id)
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])
  )
);

CREATE POLICY "shifts_delete" ON public.shifts
FOR DELETE
USING (
  check_property_access(property_id)
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])
  )
);

-- 6. Repoint DB functions that queried user_shifts at the merged shifts table,
--    deriving the date-only / time-only parts from the timestamptz columns to
--    keep their existing return signatures (and therefore frontend callers)
--    unchanged.
CREATE OR REPLACE FUNCTION public.get_next_shift(user_uuid uuid)
 RETURNS TABLE(shift_id uuid, shift_date date, start_time time without time zone, end_time time without time zone, department_name text, property_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.start_time::date,
        s.start_time::time,
        s.end_time::time,
        d.name,
        p.name
    FROM shifts s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN properties p ON s.property_id = p.id
    WHERE s.user_id = user_uuid
      AND s.start_time::date >= CURRENT_DATE
      AND s.status IN ('scheduled', 'confirmed')
    ORDER BY s.start_time
    LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_uuid uuid)
 RETURNS TABLE(pending_tasks bigint, completed_training bigint, in_progress_training bigint, unread_announcements bigint, pending_approvals bigint, unread_notifications bigint, next_shift_date date, next_shift_start time without time zone, vacation_remaining numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate user scope access
  IF user_uuid != auth.uid() AND NOT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN (
        'regional_admin', 'regional_hr', 'corporate_admin',
        'property_manager', 'property_hr', 'department_head'
      )
  ) THEN
      RAISE EXCEPTION 'Access denied to user dashboard statistics';
  END IF;

  RETURN QUERY
  SELECT
      -- Tasks
      COALESCE((
          SELECT COUNT(*) FROM tasks
          WHERE assigned_to_id = user_uuid AND status NOT IN ('completed', 'cancelled')
      ), 0),
      -- Training
      COALESCE((
          SELECT COUNT(*) FROM training_progress
          WHERE user_id = user_uuid AND status = 'completed'
      ), 0),
      COALESCE((
          SELECT COUNT(*) FROM training_progress
          WHERE user_id = user_uuid AND status = 'in_progress'
      ), 0),
      -- Announcements
      COALESCE((
          SELECT COUNT(*) FROM announcements a
          WHERE a.created_at > now() - interval '30 days'
          AND NOT EXISTS (
              SELECT 1 FROM announcement_reads ar
              WHERE ar.announcement_id = a.id AND ar.user_id = user_uuid
          )
      ), 0),
      -- Approvals
      COALESCE((
          SELECT COUNT(*) FROM approval_requests
          WHERE current_approver_id = user_uuid AND status = 'pending'
      ), 0),
      -- Notifications
      COALESCE((
          SELECT COUNT(*) FROM notifications
          WHERE user_id = user_uuid AND read_at IS NULL
      ), 0),
      -- Next shift (derived from shifts.start_time now that user_shifts is gone)
      (SELECT start_time::date FROM shifts
       WHERE user_id = user_uuid AND start_time::date >= CURRENT_DATE
       ORDER BY start_time LIMIT 1),
      (SELECT start_time::time FROM shifts
       WHERE user_id = user_uuid AND start_time::date >= CURRENT_DATE
       ORDER BY start_time LIMIT 1),
      -- Vacation
      COALESCE((
          SELECT (total_days + carried_over - used_days - pending_days)
          FROM user_vacation_balance
          WHERE user_id = user_uuid AND year = EXTRACT(YEAR FROM CURRENT_DATE)
      ), 0);
END;
$function$;

-- 7. Drop the now-redundant table (this also drops its own policies, trigger,
--    indexes, and constraints, including user_shifts_user_id_shift_date_start_time_key).
DROP TABLE public.user_shifts;
