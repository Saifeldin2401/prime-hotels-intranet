UPDATE public.platform_config SET legacy_role_fallback_enabled = false, updated_at = now() WHERE id = true;
