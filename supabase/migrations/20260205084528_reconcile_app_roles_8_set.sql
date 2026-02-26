-- Reconcile app_role enum to match the 8-role set identified in the audit
-- Roles: super_admin, corporate_admin, regional_admin, property_manager, property_hr, department_head, manager, staff

-- Add missing values to the enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'regional_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'corporate_admin' BEFORE 'regional_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'manager' AFTER 'department_head';

-- Note: 'regional_hr' is kept in the enum for compatibility with existing schema definitions (if any)
-- but it is no longer referenced in the application constants or UI.
;
