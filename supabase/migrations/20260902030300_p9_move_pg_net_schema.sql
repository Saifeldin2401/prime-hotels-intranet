-- Migration: Move pg_net extension to extensions schema (P9)
-- Resolves Supabase advisor extension_in_public lint

CREATE SCHEMA IF NOT EXISTS extensions;

DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
