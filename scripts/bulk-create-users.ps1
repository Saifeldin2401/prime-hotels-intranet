# Bulk User Creation Script for Altus Connect Intranet
# Run with: .\scripts\bulk-create-users.ps1

param(
    [string]$ServiceKey = $env:SUPABASE_SERVICE_KEY,
    [string]$SupabaseUrl = "http://127.0.0.1:54321"
)

if (-not $ServiceKey) {
    Write-Host "❌ ERROR: Supabase service key required!" -ForegroundColor Red
    Write-Host "Set environment variable: `$env:SUPABASE_SERVICE_KEY = 'your-service-role-key'" -ForegroundColor Yellow
    Write-Host "Or pass as parameter: .\scripts\bulk-create-users.ps1 -ServiceKey 'your-key'" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Starting bulk user creation for Altus Connect Intranet" -ForegroundColor Green

# Users from Riyadh User Forum.xlsx and ALTUS user creation forum1.xlsx
$users = @(
    # Riyadh Users
    @{ email = 'a.taha.mamoun1991@gmail.com'; name = 'Ahmed Taha Mamoun'; phone = '500418959'; dob = '1991-08-01'; job = 'Front Office Manager'; property = 'Altus Al Hamra Hotel Riyadh'; dept = 'Front Office'; role = 'department_head' },
    @{ email = 'mahmoudelakabawey@gmail.com'; name = 'Mahmoud Ahmed elakabawy'; phone = '576234611'; dob = '1981-03-09'; job = 'House Keeping Manager'; property = 'Altus Al Hamra Hotel Riyadh'; dept = 'Housekeeping'; role = 'department_head' },
    @{ email = 'Alatawi1213@gmail.com'; name = 'Faisal Mohamed Al Otaibi'; phone = '551448914'; job = 'Front Office Agent'; property = 'Altus Al Hamra Hotel Riyadh'; dept = 'Front Office'; role = 'staff' },
    @{ email = 'elegantlayla88@gmail.com'; name = 'Layla Ali Shrahily'; phone = '506388055'; job = 'Front Office Agent'; property = 'Altus Al Hamra Hotel Riyadh'; dept = 'Front Office'; role = 'staff' },
    @{ email = 'hassanshalaby280@gmail.com'; name = 'Hasan Abdel Raof Shalaby'; phone = '569409945'; job = 'Front Office Supervisor'; property = 'Altus Al Hamra Hotel Riyadh'; dept = 'Front Office'; role = 'department_head' },
    @{ email = 'eslam.mady.2020@gmail.com'; name = 'Islam Mahmoud Madi'; phone = '570958030'; job = 'Front Office Agent'; property = 'Altus Al Hamra Hotel Riyadh'; dept = 'Front Office'; role = 'staff' },
    @{ email = 'looa01230th@gmail.com'; name = 'AIIam Ali lbrahim'; phone = '570481399'; job = 'Front Office Supervisor'; property = 'Medhal Qurtuba by Altus Advisory'; dept = 'Front Office'; role = 'department_head' },
    @{ email = 'mohamedgalallld@gmail.com'; name = 'MOHAMED Galal Anwer Ahmed'; phone = '561005446'; job = 'Front Office Agent'; property = 'Medhal Qurtuba by Altus Advisory'; dept = 'Front Office'; role = 'staff' },
    @{ email = 'fhdalnzv209@gmail.com'; name = 'FAHAD MESHAAL AIANzi'; phone = '502792036'; job = 'Front Office Agent'; property = 'Medhal Qurtuba by Altus Advisory'; dept = 'Front Office'; role = 'staff' },
    @{ email = 'mohamedreao49@gmail.com'; name = 'MOHAMED ABDELBADEAA ISMEAL'; phone = '559697307'; job = 'House Keeping Supervisor'; property = 'Medhal Qurtuba by Altus Advisory'; dept = 'Housekeeping'; role = 'department_head' },
    @{ email = 'aymanabdelhamid091@gmail.com'; name = 'Ayman Abdul Hamid Saber'; phone = '538627751'; job = 'Maintenance'; property = 'Altus Al Hamra Hotel Riyadh'; dept = 'Engineering'; role = 'staff' },

    # Jeddah Users
    @{ email = 'Moustafamarzook7200416@gmail.com'; name = 'Moustafa mahmoud marzook'; phone = '567549721'; dob = '1990-02-07'; job = 'Fo Supervioser'; property = 'Altus Al Hamra Hotel Jeddah'; dept = 'Front Office'; role = 'department_head' },
    @{ email = 'abdullahahmed54574@gmail.com'; name = 'Abdullah Ahmed Saleh Ali'; phone = '545747498'; dob = '1993-04-03'; job = 'Fo Supervioser'; property = 'Altus Al Hamra Hotel Jeddah'; dept = 'Front Office'; role = 'department_head' },
    @{ email = 'mahmoudmo919@yahoo.com'; name = 'Mahmoud Zain Al-Abidin Hamed'; phone = '565542083'; dob = '1986-06-11'; job = 'HK Supervioser'; property = 'Altus Al Hamra Hotel Jeddah'; dept = 'Housekeeping'; role = 'department_head' },
    @{ email = 'zooommm551@gmail.com'; name = 'MOHAMED HANAFY ELSAYED ABDELMAKSOUD'; phone = '595920662'; dob = '1974-05-05'; job = 'Laundry Supervioser'; property = 'Altus Al Hamra Hotel Jeddah'; dept = 'Housekeeping'; role = 'department_head' },
    @{ email = 'Moh-oo@hotmail.com'; name = 'Saud abdulmajed alshalabi'; phone = '558221628'; dob = '1999-07-30'; job = 'Receptionist'; property = 'Altus Al Hamra Hotel Jeddah'; dept = 'Front Office'; role = 'staff' },
    @{ email = 'Badebaksh@gmail.com'; name = 'Abdulelah Mohmmed Baksh'; phone = '547039704'; dob = '1995-03-20'; job = 'Receptionist'; property = 'Altus Al Hamra Hotel Jeddah'; dept = 'Front Office'; role = 'staff' },
    @{ email = 'ibf672017@gmail.com'; name = 'Osayd Ibrahim Alrasheed'; phone = '566335467'; dob = '2002-01-13'; job = 'Receptionist'; property = 'Altus Al Hamra Hotel Jeddah'; dept = 'Front Office'; role = 'staff' },
    @{ email = 'neehaal1989@gmail.com'; name = 'Nihal Abd Al Rahman Al Harbi'; phone = '543119562'; dob = '1989-11-03'; job = 'Receptionist'; property = 'Altus Al Hamra Hotel Jeddah'; dept = 'Front Office'; role = 'staff' },
    @{ email = 'naserelsady2020@gmail.com'; name = 'Naser elsady Ibrahim'; phone = '540272932'; dob = '1967-07-01'; job = 'HK Supervioser'; property = 'Altus Al Corniche Hotel Jeddah'; dept = 'Housekeeping'; role = 'department_head' },
    @{ email = 'azoooz.bk1993@gmail.com'; name = 'Abdulaziz Badr Bakili'; phone = '531656567'; dob = '1993-01-01'; job = 'FO Manager'; property = 'Altus Al Corniche Hotel Jeddah'; dept = 'Front Office'; role = 'property_manager' },
    @{ email = 'mahranahmed231@gmail.com'; name = 'Ahmed Ahmed mahran'; phone = '564617675'; dob = '1982-03-06'; job = 'Fo Supervioser'; property = 'Altus Al Corniche Hotel Jeddah'; dept = 'Front Office'; role = 'department_head' },
    @{ email = 'iimansoor6@gmail.com'; name = 'Mansour Mohammed Al-Mahwari'; phone = '544706217'; dob = '2001-11-21'; job = 'Receptionist'; property = 'Altus Al Corniche Hotel Jeddah'; dept = 'Front Office'; role = 'staff' },
    @{ email = 'hmada18emam@gmail.com'; name = 'Mohammad Sami Emam'; phone = '509402019'; dob = '2003-11-03'; job = 'Receptionist'; property = 'Altus Al Corniche Hotel Jeddah'; dept = 'Front Office'; role = 'staff' },
    @{ email = 'Play.com99874@gmail.com'; name = 'Nasser musa mahdey alzharani'; phone = '569379893'; dob = '1993-08-18'; job = 'Receptionist'; property = 'Altus Al Corniche Hotel Jeddah'; dept = 'Front Office'; role = 'staff' }
)

Write-Host "📋 Total users to process: $($users.Count)" -ForegroundColor Blue

# SQL function to create user with all assignments
$sqlFunction = @"
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
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_property_id UUID;
    v_department_id UUID;
    v_role app_role;
BEGIN
    -- Create auth user
    INSERT INTO auth.users (email, email_confirmed_at, phone)
    VALUES (p_email, now(), p_phone)
    RETURNING id INTO v_user_id;
    
    -- Create profile
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
    
    RETURN v_user_id;
END;
$$;
"@

# Headers for API requests
$headers = @{
    'apikey' = $ServiceKey
    'Authorization' = "Bearer $ServiceKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=minimal'
}

$successCount = 0
$failureCount = 0

try {
    # Create the helper function first
    Write-Host "🔧 Creating helper function..." -ForegroundColor Yellow
    $functionResponse = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/rpc/exec" -Method POST -Headers $headers -Body (@{ sql = $sqlFunction } | ConvertTo-Json)
    Write-Host "✅ Helper function created" -ForegroundColor Green

    # Process each user
    foreach ($user in $users) {
        Write-Host "`n📧 Processing: $($user.email)" -ForegroundColor Cyan
        
        $sql = @"
        SELECT create_user_with_assignments(
            '$($user.email)',
            '$($user.name)',
            '$($user.phone)',
            $(if ($user.dob) { "'$($user.dob)'" } else { 'NULL' }),
            'Full Time',
            '$($user.job)',
            '$($user.property)',
            '$($user.dept)',
            '$($user.role)'
        );
"@
        
        try {
            $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/rpc/exec" -Method POST -Headers $headers -Body (@{ sql = $sql } | ConvertTo-Json)
            Write-Host "✅ Created: $($user.name)" -ForegroundColor Green
            $successCount++
        }
        catch {
            if ($_.Exception.Message -like "*duplicate*") {
                Write-Host "⚠️  Already exists: $($user.email)" -ForegroundColor Yellow
                $successCount++
            } else {
                Write-Host "❌ Failed: $($user.email) - $($_.Exception.Message)" -ForegroundColor Red
                $failureCount++
            }
        }
        
        # Small delay
        Start-Sleep -Milliseconds 500
    }

    # Clean up function
    Write-Host "`n🧹 Cleaning up helper function..." -ForegroundColor Yellow
    $cleanupSql = "DROP FUNCTION IF EXISTS create_user_with_assignments(TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT);"
    try {
        Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/rpc/exec" -Method POST -Headers $headers -Body (@{ sql = $cleanupSql } | ConvertTo-Json) | Out-Null
    } catch {
        Write-Host "Warning: Could not clean up function" -ForegroundColor Yellow
    }

    # Summary
    Write-Host "`n📊 Summary:" -ForegroundColor Magenta
    Write-Host "✅ Successfully created: $successCount users" -ForegroundColor Green
    Write-Host "❌ Failed to create: $failureCount users" -ForegroundColor Red
    $successRate = [math]::Round(($successCount / $users.Count) * 100, 1)
    Write-Host "📈 Success rate: $successRate%" -ForegroundColor Blue

    if ($failureCount -eq 0) {
        Write-Host "`n🎉 All users created successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Some users failed. Check the errors above." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "`n❌ Critical error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure your local Supabase instance is running at $SupabaseUrl" -ForegroundColor Yellow
}
