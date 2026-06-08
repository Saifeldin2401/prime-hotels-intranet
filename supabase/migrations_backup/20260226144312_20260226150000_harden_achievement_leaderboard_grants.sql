-- Restrict leaderboard view access to authenticated read-only usage.

REVOKE ALL ON TABLE public.achievement_leaderboard FROM PUBLIC;
REVOKE ALL ON TABLE public.achievement_leaderboard FROM anon;
REVOKE ALL ON TABLE public.achievement_leaderboard FROM authenticated;
REVOKE ALL ON TABLE public.achievement_leaderboard FROM service_role;

GRANT SELECT ON TABLE public.achievement_leaderboard TO authenticated;;
