-- ============================================================================
-- Phase 1 close-out — disable the legacy operator grace period.
--
-- After this, `super_admin` / `corporate_admin` / `administrator` in the old
-- `user_roles` table NO LONGER auto-count as platform operators. Operator
-- status comes ONLY from `platform_users` + `platform_role_assignments`.
--
-- Safe because every current operator is already seeded (migration
-- 20260901230000 §13): islam.mahrous → system_owner, admin@prime.com →
-- platform_admin, hsmadi2223 + yousef.buobaid → platform_support. The two
-- regional_admin users were never covered by the fallback anyway.
--
-- Reversible: UPDATE public.platform_config SET legacy_role_fallback_enabled = true;
-- ============================================================================

UPDATE public.platform_config
SET legacy_role_fallback_enabled = false,
    updated_at = now()
WHERE id = true;
