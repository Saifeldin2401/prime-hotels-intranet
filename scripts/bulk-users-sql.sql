-- Bulk User Creation Script for Altus Connect Intranet
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Make sure you're running this with service_role permissions

-- Helper function to create user with all required assignments
CREATE OR REPLACE FUNCTION create_user_with_assignments(
    p_email TEXT,
    p_full_name TEXT,
    p_phone TEXT,
    p_date_of_birth DATE DEFAULT NULL,
    p_employment_type TEXT DEFAULT 'Full Time',
    p_job_title TEXT,
    p_property_name TEXT,
    p_department_name TEXT,
    p_reports_to_role TEXT DEFAULT 'staff'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_property_id UUID;
    v_department_id UUID;
    v_role app_role;
    v_result TEXT;
BEGIN
    -- Check if user already exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        -- Create auth user
        INSERT INTO auth.users (email, email_confirmed_at, phone)
        VALUES (p_email, now(), p_phone)
        RETURNING id INTO v_user_id;
        
        v_result := 'Created new user';
    ELSE
        v_result := 'User already exists';
    END IF;
    
    -- Create/update profile
    INSERT INTO profiles (id, email, full_name, phone, hire_date, is_active)
    VALUES (v_user_id, p_email, p_full_name, p_phone, CURRENT_DATE, true)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        updated_at = now();
    
    -- Get property ID
    SELECT id INTO v_property_id
    FROM properties
    WHERE name = p_property_name AND is_active = true;
    
    IF v_property_id IS NULL THEN
        RAISE EXCEPTION 'Property % not found', p_property_name;
    END IF;
    
    -- Get or create department
    SELECT id INTO v_department_id
    FROM departments
    WHERE property_id = v_property_id AND name = p_department_name AND is_active = true;
    
    IF v_department_id IS NULL THEN
        INSERT INTO departments (property_id, name, is_active)
        VALUES (v_property_id, p_department_name, true)
        RETURNING id INTO v_department_id;
    END IF;
    
    -- Assign role
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, p_reports_to_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Assign to property
    INSERT INTO user_properties (user_id, property_id)
    VALUES (v_user_id, v_property_id)
    ON CONFLICT (user_id, property_id) DO NOTHING;
    
    -- Assign to department
    INSERT INTO user_departments (user_id, department_id)
    VALUES (v_user_id, v_department_id)
    ON CONFLICT (user_id, department_id) DO NOTHING;
    
    RETURN v_result || ': ' || p_full_name || ' (' || p_email || ')';
END;
$$;

-- First, ensure all required departments exist
DO $$
BEGIN
    -- Riyadh Properties Departments
    INSERT INTO departments (property_id, name, is_active)
    SELECT p.id, 'Front Office', true
    FROM properties p 
    WHERE p.name = 'Altus Al Hamra Hotel Riyadh' 
    AND NOT EXISTS (
        SELECT 1 FROM departments d 
        WHERE d.property_id = p.id AND d.name = 'Front Office'
    );
    
    INSERT INTO departments (property_id, name, is_active)
    SELECT p.id, 'Housekeeping', true
    FROM properties p 
    WHERE p.name = 'Altus Al Hamra Hotel Riyadh' 
    AND NOT EXISTS (
        SELECT 1 FROM departments d 
        WHERE d.property_id = p.id AND d.name = 'Housekeeping'
    );
    
    INSERT INTO departments (property_id, name, is_active)
    SELECT p.id, 'Maintenance', true
    FROM properties p 
    WHERE p.name = 'Altus Al Hamra Hotel Riyadh' 
    AND NOT EXISTS (
        SELECT 1 FROM departments d 
        WHERE d.property_id = p.id AND d.name = 'Maintenance'
    );
    
    -- Medhal Qurtuba Departments
    INSERT INTO departments (property_id, name, is_active)
    SELECT p.id, 'Front Office', true
    FROM properties p 
    WHERE p.name = 'Medhal Qurtuba by Altus Advisory' 
    AND NOT EXISTS (
        SELECT 1 FROM departments d 
        WHERE d.property_id = p.id AND d.name = 'Front Office'
    );
    
    INSERT INTO departments (property_id, name, is_active)
    SELECT p.id, 'Housekeeping', true
    FROM properties p 
    WHERE p.name = 'Medhal Qurtuba by Altus Advisory' 
    AND NOT EXISTS (
        SELECT 1 FROM departments d 
        WHERE d.property_id = p.id AND d.name = 'Housekeeping'
    );
    
    -- Jeddah Properties Departments
    INSERT INTO departments (property_id, name, is_active)
    SELECT p.id, 'Front Office', true
    FROM properties p 
    WHERE p.name IN ('Altus Al Hamra Hotel Jeddah', 'Altus Al Corniche Hotel Jeddah')
    AND NOT EXISTS (
        SELECT 1 FROM departments d 
        WHERE d.property_id = p.id AND d.name = 'Front Office'
    );
    
    INSERT INTO departments (property_id, name, is_active)
    SELECT p.id, 'Housekeeping', true
    FROM properties p 
    WHERE p.name IN ('Altus Al Hamra Hotel Jeddah', 'Altus Al Corniche Hotel Jeddah')
    AND NOT EXISTS (
        SELECT 1 FROM departments d 
        WHERE d.property_id = p.id AND d.name = 'Housekeeping'
    );
END $$;

-- Create all users
DO $$
DECLARE
    v_result TEXT;
BEGIN
    -- Riyadh Users from Riyadh User Forum.xlsx
    v_result := create_user_with_assignments(
        'a.taha.mamoun1991@gmail.com',
        'Ahmed Taha Mamoun',
        '500418959',
        '1991-08-01',
        'Full Time',
        'Front Office Manager',
        'Altus Al Hamra Hotel Riyadh',
        'Front Office',
        'department_head'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'mahmoudelakabawey@gmail.com',
        'Mahmoud Ahmed elakabawy',
        '576234611',
        '1981-03-09',
        'Full Time',
        'House Keeping Manager',
        'Altus Al Hamra Hotel Riyadh',
        'Housekeeping',
        'property_hr'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'Alatawi1213@gmail.com',
        'Faisal Mohamed Al Otaibi',
        '551448914',
        NULL,
        'Full Time',
        'Front Office Agent',
        'Altus Al Hamra Hotel Riyadh',
        'Front Office',
        'staff'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'elegantlayla88@gmail.com',
        'Layla Ali Shrahily',
        '506388055',
        NULL,
        'Full Time',
        'Front Office Agent',
        'Altus Al Hamra Hotel Riyadh',
        'Front Office',
        'staff'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'hassanshalaby280@gmail.com',
        'Hasan Abdel Raof Shalaby',
        '569409945',
        NULL,
        'Full Time',
        'Front Office Supervisor',
        'Altus Al Hamra Hotel Riyadh',
        'Front Office',
        'department_head'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'eslam.mady.2020@gmail.com',
        'Islam Mahmoud Madi',
        '570958030',
        NULL,
        'Full Time',
        'Front Office Agent',
        'Altus Al Hamra Hotel Riyadh',
        'Front Office',
        'staff'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'looa01230th@gmail.com',
        'AIIam Ali lbrahim',
        '570481399',
        NULL,
        'Full Time',
        'Front Office Supervisor',
        'Medhal Qurtuba by Altus Advisory',
        'Front Office',
        'department_head'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'mohamedgalallld@gmail.com',
        'MOHAMED Galal Anwer Ahmed',
        '561005446',
        NULL,
        'Full Time',
        'Front Office Agent',
        'Medhal Qurtuba by Altus Advisory',
        'Front Office',
        'staff'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'fhdalnzv209@gmail.com',
        'FAHAD MESHAAL AIANzi',
        '502792036',
        NULL,
        'Full Time',
        'Front Office Agent',
        'Medhal Qurtuba by Altus Advisory',
        'Front Office',
        'staff'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'mohamedreao49@gmail.com',
        'MOHAMED ABDELBADEAA ISMEAL',
        '559697307',
        NULL,
        'Full Time',
        'House Keeping Supervisor',
        'Medhal Qurtuba by Altus Advisory',
        'Housekeeping',
        'department_head'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'aymanabdelhamid091@gmail.com',
        'Ayman Abdul Hamid Saber',
        '538627751',
        NULL,
        'Full Time',
        'Maintenance',
        'Altus Al Hamra Hotel Riyadh',
        'Maintenance',
        'staff'
    );
    RAISE NOTICE '%', v_result;

    -- Jeddah Users from ALTUS user creation forum1.xlsx
    v_result := create_user_with_assignments(
        'Moustafamarzook7200416@gmail.com',
        'Moustafa mahmoud marzook',
        '567549721',
        '1990-02-07',
        'Full Time',
        'Fo Supervioser',
        'Altus Al Hamra Hotel Jeddah',
        'Front Office',
        'department_head'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'abdullahahmed54574@gmail.com',
        'Abdullah Ahmed Saleh Ali',
        '545747498',
        '1993-04-03',
        'Full Time',
        'Fo Supervioser',
        'Altus Al Hamra Hotel Jeddah',
        'Front Office',
        'department_head'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'mahmoudmo919@yahoo.com',
        'Mahmoud Zain Al-Abidin Hamed',
        '565542083',
        '1986-06-11',
        'Full Time',
        'HK Supervioser',
        'Altus Al Hamra Hotel Jeddah',
        'Housekeeping',
        'department_head'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'zooommm551@gmail.com',
        'MOHAMED HANAFY ELSAYED ABDELMAKSOUD',
        '595920662',
        '1974-05-05',
        'Full Time',
        'Laundry Supervioser',
        'Altus Al Hamra Hotel Jeddah',
        'Housekeeping',
        'department_head'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'Moh-oo@hotmail.com',
        'Saud abdulmajed alshalabi',
        '558221628',
        '1999-07-30',
        'Full Time',
        'Receptionist',
        'Altus Al Hamra Hotel Jeddah',
        'Front Office',
        'staff'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'Badebaksh@gmail.com',
        'Abdulelah Mohmmed Baksh',
        '547039704',
        '1995-03-20',
        'Full Time',
        'Receptionist',
        'Altus Al Hamra Hotel Jeddah',
        'Front Office',
        'staff'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'ibf672017@gmail.com',
        'Osayd Ibrahim Alrasheed',
        '566335467',
        '2002-01-13',
        'Full Time',
        'Receptionist',
        'Altus Al Hamra Hotel Jeddah',
        'Front Office',
        'staff'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'neehaal1989@gmail.com',
        'Nihal Abd Al Rahman Al Harbi',
        '543119562',
        '1989-11-03',
        'Full Time',
        'Receptionist',
        'Altus Al Hamra Hotel Jeddah',
        'Front Office',
        'staff'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'naserelsady2020@gmail.com',
        'Naser elsady Ibrahim',
        '540272932',
        '1967-07-01',
        'Full Time',
        'HK Supervioser',
        'Altus Al Corniche Hotel Jeddah',
        'Housekeeping',
        'department_head'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'azoooz.bk1993@gmail.com',
        'Abdulaziz Badr Bakili',
        '531656567',
        '1993-01-01',
        'Full Time',
        'FO Manager',
        'Altus Al Corniche Hotel Jeddah',
        'Front Office',
        'property_manager'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'mahranahmed231@gmail.com',
        'Ahmed Ahmed mahran',
        '564617675',
        '1982-03-06',
        'Full Time',
        'Fo Supervioser',
        'Altus Al Corniche Hotel Jeddah',
        'Front Office',
        'department_head'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'iimansoor6@gmail.com',
        'Mansour Mohammed Al-Mahwari',
        '544706217',
        '2001-11-21',
        'Full Time',
        'Receptionist',
        'Altus Al Corniche Hotel Jeddah',
        'Front Office',
        'staff'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'hmada18emam@gmail.com',
        'Mohammad Sami Emam',
        '509402019',
        '2003-11-03',
        'Full Time',
        'Receptionist',
        'Altus Al Corniche Hotel Jeddah',
        'Front Office',
        'staff'
    );
    RAISE NOTICE '%', v_result;
    
    v_result := create_user_with_assignments(
        'Play.com99874@gmail.com',
        'Nasser musa mahdey alzharani',
        '569379893',
        '1993-08-18',
        'Full Time',
        'Receptionist',
        'Altus Al Corniche Hotel Jeddah',
        'Front Office',
        'staff'
    );
    RAISE NOTICE '%', v_result;
    
    RAISE NOTICE 'All users processed successfully!';
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS create_user_with_assignments(
    TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT
);

-- Verify users were created
SELECT 
    p.email,
    p.full_name,
    p.phone,
    pr.name as property_name,
    d.name as department_name,
    ur.role,
    p.is_active
FROM profiles p
JOIN user_properties up ON p.id = up.user_id
JOIN properties pr ON up.property_id = pr.id
JOIN user_departments ud ON p.id = ud.user_id
JOIN departments d ON ud.department_id = d.id
JOIN user_roles ur ON p.id = ur.user_id
WHERE p.email IN (
    'a.taha.mamoun1991@gmail.com',
    'mahmoudelakabawey@gmail.com',
    'Alatawi1213@gmail.com',
    'elegantlayla88@gmail.com',
    'hassanshalaby280@gmail.com',
    'eslam.mady.2020@gmail.com',
    'looa01230th@gmail.com',
    'mohamedgalallld@gmail.com',
    'fhdalnzv209@gmail.com',
    'mohamedreao49@gmail.com',
    'aymanabdelhamid091@gmail.com',
    'Moustafamarzook7200416@gmail.com',
    'abdullahahmed54574@gmail.com',
    'mahmoudmo919@yahoo.com',
    'zooommm551@gmail.com',
    'Moh-oo@hotmail.com',
    'Badebaksh@gmail.com',
    'ibf672017@gmail.com',
    'neehaal1989@gmail.com',
    'naserelsady2020@gmail.com',
    'azoooz.bk1993@gmail.com',
    'mahranahmed231@gmail.com',
    'iimansoor6@gmail.com',
    'hmada18emam@gmail.com',
    'Play.com99874@gmail.com'
)
ORDER BY pr.name, d.name, p.full_name;
