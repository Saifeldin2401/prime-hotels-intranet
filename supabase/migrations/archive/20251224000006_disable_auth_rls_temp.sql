-- EMERGENCY FIX: Disable RLS on auth-critical tables
-- These tables are queried during initial auth and have circular dependencies via has_role()

-- Disable RLS on all auth-related tables
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- NOTE: This is a temporary fix. Proper solution is to:
-- 1. Create SECURITY DEFINER functions that don't trigger RLS
-- 2. Or restructure RLS policies to not call has_role() during initial auth
