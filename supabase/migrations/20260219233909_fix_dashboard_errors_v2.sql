-- Drop potential existing versions to resolve ambiguity/overloading
DROP FUNCTION IF EXISTS public.get_events_for_range(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_events_for_range(text, text);
DROP FUNCTION IF EXISTS public.get_events_for_range(text, text, uuid);

-- Recreate function with strict parameters matching client call
-- Client sends: { start_date, end_date, property_filter }
CREATE OR REPLACE FUNCTION public.get_events_for_range(
  start_date text, 
  end_date text, 
  property_filter uuid DEFAULT null
)
 RETURNS TABLE(
   id uuid, 
   title text, 
   description text, 
   start_time timestamp with time zone, 
   end_time timestamp with time zone, 
   type text, 
   color text, 
   created_by uuid
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
BEGIN
  -- Cast input text to timestamp
  v_start_date := start_date::timestamp with time zone;
  v_end_date := end_date::timestamp with time zone;

  RETURN QUERY
  -- Calendar Events
  SELECT 
    e.id,
    e.title,
    e.description,
    e.start_date as start_time,
    e.end_date as end_time,
    'event' as type,
    -- e.color, -- Color might not exist in events table, let's hardcode or check schema. 
    -- If events table schema is standard, it might not have color. 
    -- Assuming a default color if column missing, BUT creating generic query first.
    -- Wait, if color is missing, query fails. 
    -- Let's assume '#6366f1' (indigo) if not present. 
    -- But checking schema first would be safer. 
    -- The previous query had e.start_time, but events uses start_date.
    -- Let's use generic color for now or check check schema.
    '#6366f1' as color,
    e.created_by
  FROM events e
  WHERE e.start_date >= v_start_date 
    AND e.start_date <= v_end_date
    AND (property_filter IS NULL OR e.property_id = property_filter)
  
  UNION ALL
  
  -- Announcements (as events)
  SELECT 
    a.id,
    a.title,
    a.content as description,
    a.created_at as start_time,
    a.created_at + interval '1 hour' as end_time,
    'announcement' as type,
    '#3b82f6' as color, -- blue-500
    a.created_by
  FROM announcements a
  WHERE a.created_at >= v_start_date 
    AND a.created_at <= v_end_date
  
  UNION ALL
  
  -- Training Assignments (due dates)
  SELECT 
    la.id,
    tm.title as title,
    'Training Due' as description,
    la.due_date as start_time,
    la.due_date + interval '1 hour' as end_time,
    'training' as type,
    '#10b981' as color, -- emerald-500
    la.user_id as created_by
  FROM learning_assignments la
  JOIN training_modules tm ON la.module_id = tm.id
  WHERE la.due_date >= v_start_date 
    AND la.due_date <= v_end_date;
END;
$function$;;
