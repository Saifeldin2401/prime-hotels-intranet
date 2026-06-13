-- Fix get_events_for_range RPC ambiguity
CREATE OR REPLACE FUNCTION public.get_events_for_range(p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS TABLE(id uuid, title text, description text, start_time timestamp with time zone, end_time timestamp with time zone, type text, color text, created_by uuid)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  -- Calendar Events
  SELECT 
    e.id,
    e.title,
    e.description,
    e.start_time,
    e.end_time,
    'event' as type,
    e.color,
    e.created_by
  FROM calendar_events e
  WHERE e.start_time >= p_start_date AND e.start_time <= p_end_date
  
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
  WHERE a.created_at >= p_start_date AND a.created_at <= p_end_date
  
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
    la.user_id as created_by -- loosely mapping user_id to created_by for schema compatibility
  FROM learning_assignments la
  JOIN training_modules tm ON la.module_id = tm.id
  WHERE la.due_date >= p_start_date AND la.due_date <= p_end_date;
END;
$function$;

-- Fix training_progress foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'training_progress_assignment_id_fkey' 
        AND table_name = 'training_progress'
    ) THEN
        ALTER TABLE training_progress
        ADD CONSTRAINT training_progress_assignment_id_fkey
        FOREIGN KEY (assignment_id)
        REFERENCES learning_assignments(id)
        ON DELETE CASCADE;
    END IF;
END $$;
