-- ============================================================================
-- DELETE ALL USERS EXCEPT ISLAM MAHROUS AND ADMIN@PRIME ACCOUNTS
-- WARNING: This permanently deletes users and all their history
-- Run this in Supabase Dashboard → SQL Editor with service_role permissions
-- ============================================================================

-- First, let's identify the users to KEEP
DO $$
DECLARE
    v_islam_id UUID;
    v_admin_id UUID;
    v_count INTEGER;
BEGIN
    -- Find Islam Mahrous by email pattern or full name
    SELECT id INTO v_islam_id 
    FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%';
    
    -- Find admin@PRIME accounts (any email containing admin and prime)
    SELECT id INTO v_admin_id 
    FROM auth.users 
    WHERE email ILIKE 'admin@prime%' 
       OR email ILIKE '%admin%prime%';
    
    RAISE NOTICE 'Islam Mahrous ID: %', v_islam_id;
    RAISE NOTICE 'Admin ID: %', v_admin_id;
    
    -- Count total users to be deleted (for logging)
    SELECT COUNT(*) INTO v_count
    FROM auth.users
    WHERE id NOT IN (SELECT unnest(ARRAY[v_islam_id, v_admin_id]) WHERE unnest IS NOT NULL);
    
    RAISE NOTICE 'Users to be deleted: %', v_count;
END $$;

-- ============================================================================
-- STEP 1: DELETE FROM USER-DEPENDENT TABLES (child tables first)
-- ============================================================================

-- Delete from training_progress
DELETE FROM training_progress 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from training_assignments
DELETE FROM training_assignments 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from training_enrollments
DELETE FROM training_enrollments 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from training_completions
DELETE FROM training_completions 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from certification_assignments
DELETE FROM certification_assignments 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from leave_requests
DELETE FROM leave_requests 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from leave_balances
DELETE FROM leave_balances 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from time_clock
DELETE FROM time_clock 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from attendance
DELETE FROM attendance 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from shift_swaps
DELETE FROM shift_swaps 
WHERE requester_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

DELETE FROM shift_swaps 
WHERE requested_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from shift_assignments
DELETE FROM shift_assignments 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from referrals
DELETE FROM referrals 
WHERE referrer_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from maintenance_tickets
DELETE FROM maintenance_tickets 
WHERE created_by NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from maintenance_comments
DELETE FROM maintenance_comments 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from announcements (if user-specific)
DELETE FROM announcements 
WHERE created_by NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from document_library_views
DELETE FROM document_library_views 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from document_library_downloads
DELETE FROM document_library_downloads 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from user_sessions
DELETE FROM user_sessions 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from activity_logs
DELETE FROM activity_logs 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from user_activities
DELETE FROM user_activities 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from audit_logs (user-related entries)
DELETE FROM audit_logs 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- ============================================================================
-- STEP 2: DELETE FROM USER LINK TABLES
-- ============================================================================

-- Delete from user_roles
DELETE FROM user_roles 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from user_properties
DELETE FROM user_properties 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from user_departments
DELETE FROM user_departments 
WHERE user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- Delete from temporary_approvers (as delegator or delegate)
DELETE FROM temporary_approvers 
WHERE delegator_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

DELETE FROM temporary_approvers 
WHERE delegate_id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- ============================================================================
-- STEP 3: DELETE FROM PROFILES
-- ============================================================================

DELETE FROM profiles 
WHERE id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- ============================================================================
-- STEP 4: DELETE FROM AUTH.USERS (THE MAIN USER ACCOUNTS)
-- ============================================================================

-- This permanently deletes the users from authentication
DELETE FROM auth.users 
WHERE id NOT IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%eslam.mady.2020%' 
       OR email ILIKE 'admin@prime%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%madi%'
       OR raw_user_meta_data->>'full_name' ILIKE '%islam%mady%'
);

-- ============================================================================
-- VERIFICATION: Show remaining users
-- ============================================================================

SELECT 
    'REMAINING USERS' as status,
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    created_at
FROM auth.users
ORDER BY created_at DESC;
