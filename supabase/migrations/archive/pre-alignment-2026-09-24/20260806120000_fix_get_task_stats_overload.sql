-- Two get_task_stats overloads existed: get_task_stats(uuid) (matches the frontend's TaskStats
-- shape and is the only one actually called, from useTasks.ts's useTaskStats) and
-- get_task_stats(uuid, uuid, uuid) (a different, never-called return shape -- not referenced
-- anywhere in the frontend or edge functions). PostgREST can't disambiguate a call carrying
-- only user_id_param between the two, so every Tasks Dashboard stats request errored with
-- PGRST203. Dropping the unused overload resolves the ambiguity.

DROP FUNCTION IF EXISTS public.get_task_stats(uuid, uuid, uuid);
