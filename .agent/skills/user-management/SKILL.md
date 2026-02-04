---
name: User Management
description: Guidelines for user, role, and permission management
---

# User Management Skill

## Overview
Multi-tenant user system with roles, properties, and departments.

## Database Tables
- `profiles` - User profiles (extends auth.users)
- `user_roles` - Role assignments
- `user_properties` - Property access
- `user_departments` - Department membership

## IMPORTANT
- **NEVER** modify `auth.users` directly
- Use `profiles` table for user data
- Supabase handles authentication

## Roles
```typescript
type AppRole = 'staff' | 'manager' | 'admin' | 'super_admin';
```

| Role | Description |
|------|-------------|
| `staff` | Regular employee |
| `manager` | Department manager |
| `admin` | Property admin |
| `super_admin` | System admin |

## Hooks
- `useUsers` - User CRUD
- `useUserData` - Current user
- `usePermissions` - Role checks
- `useOrganization` - Org structure
- `useOrgHierarchy` - Reporting chain

## Permission Checks
```typescript
import { usePermissions } from '@/hooks/usePermissions';

const { hasRole, canManage, isAdmin } = usePermissions();

if (hasRole('manager')) {
  // Manager actions
}

if (canManage('training')) {
  // Training management
}
```

## Profile Structure
```typescript
interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  hire_date: string;
  job_title: string;
  staff_id: string; // e.g., "PH-1001"
  reporting_to: string; // Manager's UUID
  is_active: boolean;
}
```

## Translations
Namespace: `users`
