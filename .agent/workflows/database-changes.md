---
description: Database changes safety checklist to prevent RLS, trigger, and auth issues
---

# Database Changes Safety Checklist

## Before Making Any Database Changes

### 1. RLS Policy Rules (CRITICAL)
**NEVER** create RLS policies that call helper functions (`has_role()`, `has_property_access()`, etc.) on these tables:
- `user_roles`
- `user_properties`  
- `user_departments`
- `profiles`
- `properties`
- `departments`

**WHY:** These are queried during authentication. If RLS policies on these tables call functions that query these same tables, you get **infinite recursion** that hangs the database.

**SAFE PATTERNS:**
```sql
-- GOOD: Simple direct checks
CREATE POLICY "users_read_own" ON user_roles
FOR SELECT USING (user_id = auth.uid());

-- GOOD: Allow all authenticated
CREATE POLICY "profiles_viewable" ON profiles
FOR SELECT USING (true);

-- BAD: Calls has_role() which queries user_roles
CREATE POLICY "admin_access" ON user_roles
FOR ALL USING (has_role(auth.uid(), 'regional_admin'));
```

### 2. Trigger Rules
Before creating a trigger, verify:
1. **The trigger function only references columns that exist in the target table**
2. **The trigger doesn't query auth-critical tables** (can cause hangs during auth)
3. **Test the trigger with a simple INSERT before deploying**

**Example of broken trigger we fixed:**
```sql
-- BROKEN: Trigger on user_departments references NEW.role (doesn't exist!)
CREATE TRIGGER on_department_assigned_start_onboarding 
AFTER INSERT ON user_departments 
FOR EACH ROW EXECUTE FUNCTION handle_new_user_onboarding();

-- The function referenced NEW.role but user_departments has no 'role' column
```

### 3. Migration Testing
Before applying any migration:
```bash
# 1. Test on a branch first (if available)
# 2. Check for circular dependencies
# 3. Verify all referenced columns exist
```

---

## Current Database State (Dec 24, 2024) - PRODUCTION READY ✅

### RLS Status
| Table | RLS Enabled | Policies | Notes |
|-------|-------------|----------|-------|
| profiles | ✅ YES | 3 | Select all, Update own, Admin manage |
| user_roles | ✅ YES | 2 | Select own, Admin manage |
| user_properties | ✅ YES | 2 | Select own, Admin manage |
| user_departments | ✅ YES | 2 | Select own, Admin manage |
| properties | ✅ YES | 2 | Select all, Admin manage |
| departments | ✅ YES | 2 | Select all, Admin manage |

### Security Architecture
Uses `SECURITY DEFINER` functions to avoid recursion:
- `auth_get_user_roles(uid)` - Returns array of user's roles
- `auth_has_role(uid, role)` - Checks if user has specific role  
- `auth_has_any_role(uid, roles[])` - Checks if user has any of the roles

These functions bypass RLS when called, breaking the recursion cycle.

### Removed/Fixed Items
- ❌ `on_department_assigned_start_onboarding` trigger - Was broken (referenced non-existent column)
- ❌ Old `has_role()` function - Replaced with `auth_has_role()` SECURITY DEFINER version

---

## Future Tasks

### Re-enable RLS (When Ready)
To properly re-enable RLS without circular dependencies:

1. Create a `SECURITY DEFINER` function that bypasses RLS for role checks:
```sql
CREATE OR REPLACE FUNCTION get_user_roles(uid uuid)
RETURNS text[] 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT array_agg(role::text) FROM user_roles WHERE user_id = uid;
$$ LANGUAGE sql STABLE;
```

2. Use this function in RLS policies instead of direct queries
3. Test thoroughly before enabling

### Fix Onboarding Trigger
The `handle_new_user_onboarding()` function needs to be rewritten to:
1. Only use columns from `user_departments` (user_id, department_id)
2. Look up the user's role from `user_roles` table separately
3. Handle NULL cases gracefully

---

## Debugging Commands

### Check RLS status
```sql
SELECT c.relname, c.relrowsecurity 
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('profiles', 'user_roles', 'user_properties', 'user_departments');
```

### Check policies on a table
```sql
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'user_roles';
```

### Check triggers on a table
```sql
SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger 
WHERE tgrelid = 'user_departments'::regclass AND NOT tgisinternal;
```

### Check function source
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'function_name';
```
