
-- get_next_shift still has a live caller (CalendarWidget.tsx via useUserShifts.ts's
-- useNextShift()), but the `shifts` table it queries was dropped somewhere after the
-- 20260720231635_merge_shifts_user_shifts migration (shift-scheduling appears to have
-- been intentionally descoped along with `properties`/`user_properties`/etc during a
-- later consolidation -- NOT recreating that dropped schema here, per explicit
-- direction not to resurrect things that were deliberately removed).
-- What IS a real bug regardless of that decision: this raised a raw
-- "relation does not exist" SQL error on every call instead of returning "no upcoming
-- shift". Fixed to fail gracefully (empty result) so the widget just shows nothing
-- instead of erroring. The frontend shift-scheduling UI (CalendarWidget/useUserShifts)
-- is still calling into a feature with no backing table and should be revisited
-- separately -- either restore `shifts` deliberately, or remove the dead UI.
CREATE OR REPLACE FUNCTION public.get_next_shift(user_uuid uuid)
 RETURNS TABLE(shift_id uuid, shift_date date, start_time time without time zone, end_time time without time zone, department_name text, property_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF user_uuid IS DISTINCT FROM (select auth.uid()) AND NOT public.is_hr_or_admin((select auth.uid())) THEN
        RAISE EXCEPTION 'Unauthorized: can only view your own shift schedule';
    END IF;

    RETURN QUERY
    SELECT NULL::uuid, NULL::date, NULL::time, NULL::time, NULL::text, NULL::text
    WHERE false;
END;
$function$;
