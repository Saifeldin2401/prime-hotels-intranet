/**
 * Browser Console Script for Bulk User Creation
 * Run this in browser console while logged in as admin
 * 
 * Instructions:
 * 1. Login to Prime Hotels Intranet as admin
 * 2. Open browser console (F12)
 * 3. Copy-paste this entire script
 * 4. Press Enter
 * 5. Wait for completion
 */

// Users from Riyadh User Forum.xlsx and PHG user creation forum1.xlsx
const users = [
  // Riyadh Users
  {
    email: 'a.taha.mamoun1991@gmail.com',
    full_name: 'Ahmed Taha Mamoun',
    phone: '500418959',
    date_of_birth: '1991-08-01',
    job_title: 'Front Office Manager',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Front Office',
    role: 'department_head'
  },
  {
    email: 'mahmoudelakabawey@gmail.com',
    full_name: 'Mahmoud Ahmed elakabawy',
    phone: '576234611',
    date_of_birth: '1981-03-09',
    job_title: 'House Keeping Manager',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Housekeeping',
    role: 'property_hr'
  },
  {
    email: 'Alatawi1213@gmail.com',
    full_name: 'Faisal Mohamed Al Otaibi',
    phone: '551448914',
    job_title: 'Front Office Agent',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'elegantlayla88@gmail.com',
    full_name: 'Layla Ali Shrahily',
    phone: '506388055',
    job_title: 'Front Office Agent',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'hassanshalaby280@gmail.com',
    full_name: 'Hasan Abdel Raof Shalaby',
    phone: '569409945',
    job_title: 'Front Office Supervisor',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Front Office',
    role: 'department_head'
  },
  {
    email: 'eslam.mady.2020@gmail.com',
    full_name: 'Islam Mahmoud Madi',
    phone: '570958030',
    job_title: 'Front Office Agent',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'looa01230th@gmail.com',
    full_name: 'AIIam Ali lbrahim',
    phone: '570481399',
    job_title: 'Front Office Supervisor',
    property_name: 'Medhal Qurtuba by Prime Hotels',
    department_name: 'Front Office',
    role: 'department_head'
  },
  {
    email: 'mohamedgalallld@gmail.com',
    full_name: 'MOHAMED Galal Anwer Ahmed',
    phone: '561005446',
    job_title: 'Front Office Agent',
    property_name: 'Medhal Qurtuba by Prime Hotels',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'fhdalnzv209@gmail.com',
    full_name: 'FAHAD MESHAAL AIANzi',
    phone: '502792036',
    job_title: 'Front Office Agent',
    property_name: 'Medhal Qurtuba by Prime Hotels',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'mohamedreao49@gmail.com',
    full_name: 'MOHAMED ABDELBADEAA ISMEAL',
    phone: '559697307',
    job_title: 'House Keeping Supervisor',
    property_name: 'Medhal Qurtuba by Prime Hotels',
    department_name: 'Housekeeping',
    role: 'department_head'
  },
  {
    email: 'aymanabdelhamid091@gmail.com',
    full_name: 'Ayman Abdul Hamid Saber',
    phone: '538627751',
    job_title: 'Maintenance',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Maintenance',
    role: 'staff'
  },

  // Jeddah Users
  {
    email: 'Moustafamarzook7200416@gmail.com',
    full_name: 'Moustafa mahmoud marzook',
    phone: '567549721',
    date_of_birth: '1990-02-07',
    job_title: 'Fo Supervioser',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Front Office',
    role: 'department_head'
  },
  {
    email: 'abdullahahmed54574@gmail.com',
    full_name: 'Abdullah Ahmed Saleh Ali',
    phone: '545747498',
    date_of_birth: '1993-04-03',
    job_title: 'Fo Supervioser',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Front Office',
    role: 'department_head'
  },
  {
    email: 'mahmoudmo919@yahoo.com',
    full_name: 'Mahmoud Zain Al-Abidin Hamed',
    phone: '565542083',
    date_of_birth: '1986-06-11',
    job_title: 'HK Supervioser',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Housekeeping',
    role: 'department_head'
  },
  {
    email: 'zooommm551@gmail.com',
    full_name: 'MOHAMED HANAFY ELSAYED ABDELMAKSOUD',
    phone: '595920662',
    date_of_birth: '1974-05-05',
    job_title: 'Laundry Supervioser',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Housekeeping',
    role: 'department_head'
  },
  {
    email: 'Moh-oo@hotmail.com',
    full_name: 'Saud abdulmajed alshalabi',
    phone: '558221628',
    date_of_birth: '1999-07-30',
    job_title: 'Receptionist',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'Badebaksh@gmail.com',
    full_name: 'Abdulelah Mohmmed Baksh',
    phone: '547039704',
    date_of_birth: '1995-03-20',
    job_title: 'Receptionist',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'ibf672017@gmail.com',
    full_name: 'Osayd Ibrahim Alrasheed',
    phone: '566335467',
    date_of_birth: '2002-01-13',
    job_title: 'Receptionist',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'neehaal1989@gmail.com',
    full_name: 'Nihal Abd Al Rahman Al Harbi',
    phone: '543119562',
    date_of_birth: '1989-11-03',
    job_title: 'Receptionist',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'naserelsady2020@gmail.com',
    full_name: 'Naser elsady Ibrahim',
    phone: '540272932',
    date_of_birth: '1967-07-01',
    job_title: 'HK Supervioser',
    property_name: 'Prime Al Corniche Hotel Jeddah',
    department_name: 'Housekeeping',
    role: 'department_head'
  },
  {
    email: 'azoooz.bk1993@gmail.com',
    full_name: 'Abdulaziz Badr Bakili',
    phone: '531656567',
    date_of_birth: '1993-01-01',
    job_title: 'FO Manager',
    property_name: 'Prime Al Corniche Hotel Jeddah',
    department_name: 'Front Office',
    role: 'property_manager'
  },
  {
    email: 'mahranahmed231@gmail.com',
    full_name: 'Ahmed Ahmed mahran',
    phone: '564617675',
    date_of_birth: '1982-03-06',
    job_title: 'Fo Supervioser',
    property_name: 'Prime Al Corniche Hotel Jeddah',
    department_name: 'Front Office',
    role: 'department_head'
  },
  {
    email: 'iimansoor6@gmail.com',
    full_name: 'Mansour Mohammed Al-Mahwari',
    phone: '544706217',
    date_of_birth: '2001-11-21',
    job_title: 'Receptionist',
    property_name: 'Prime Al Corniche Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'hmada18emam@gmail.com',
    full_name: 'Mohammad Sami Emam',
    phone: '509402019',
    date_of_birth: '2003-11-03',
    job_title: 'Receptionist',
    property_name: 'Prime Al Corniche Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'Play.com99874@gmail.com',
    full_name: 'Nasser musa mahdey alzharani',
    phone: '569379893',
    date_of_birth: '1993-08-18',
    job_title: 'Receptionist',
    property_name: 'Prime Al Corniche Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  }
];

// Main function to create users
async function createBulkUsers() {
  console.log('🚀 Starting bulk user creation for Prime Hotels Intranet');
  console.log(`📋 Total users to process: ${users.length}`);
  
  let successCount = 0;
  let failureCount = 0;
  
  // Access the Supabase client from the app
  const { supabase } = window;
  
  if (!supabase) {
    console.error('❌ Supabase client not found. Make sure you are on the Prime Hotels Intranet site.');
    return;
  }
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`\n📧 [${i + 1}/${users.length}] Processing: ${user.email}`);
    
    try {
      // Step 1: Get property ID
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id')
        .eq('name', user.property_name)
        .eq('is_active', true)
        .single();
      
      if (propError) {
        console.error(`❌ Property error for ${user.email}:`, propError);
        failureCount++;
        continue;
      }
      
      // Step 2: Get or create department
      let { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('property_id', properties.id)
        .eq('name', user.department_name)
        .eq('is_active', true)
        .single();
      
      if (deptError && deptError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error(`❌ Department error for ${user.email}:`, deptError);
        failureCount++;
        continue;
      }
      
      let departmentId = departments?.id;
      
      if (!departmentId) {
        // Create department
        const { data: newDept, error: createError } = await supabase
          .from('departments')
          .insert({
            property_id: properties.id,
            name: user.department_name,
            is_active: true
          })
          .select('id')
          .single();
        
        if (createError) {
          console.error(`❌ Department creation error for ${user.email}:`, createError);
          failureCount++;
          continue;
        }
        
        departmentId = newDept.id;
        console.log(`✅ Created department: ${user.department_name}`);
      }
      
      // Step 3: Create user via admin function
      const { data: userData, error: userError } = await supabase.rpc('admin_create_user', {
        p_email: user.email,
        p_full_name: user.full_name,
        p_phone: user.phone,
        p_date_of_birth: user.date_of_birth || null,
        p_job_title: user.job_title,
        p_property_id: properties.id,
        p_department_id: departmentId,
        p_role: user.role
      });
      
      if (userError) {
        if (userError.message.includes('duplicate') || userError.message.includes('already exists')) {
          console.log(`⚠️  User already exists: ${user.email}`);
          successCount++;
        } else {
          console.error(`❌ User creation error for ${user.email}:`, userError);
          failureCount++;
        }
      } else {
        console.log(`✅ Successfully created user: ${user.full_name}`);
        successCount++;
      }
      
    } catch (error) {
      console.error(`❌ Unexpected error for ${user.email}:`, error);
      failureCount++;
    }
    
    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully created: ${successCount} users`);
  console.log(`❌ Failed to create: ${failureCount} users`);
  console.log(`📈 Success rate: ${((successCount / users.length) * 100).toFixed(1)}%`);
  
  if (failureCount === 0) {
    console.log('\n🎉 All users created successfully!');
  } else {
    console.log('\n⚠️  Some users failed. Check errors above.');
  }
}

// Check if admin_create_user function exists, if not, create it
async function ensureAdminFunction() {
  const { supabase } = window;
  
  console.log('🔧 Checking admin functions...');
  
  // Create admin user creation function if it doesn't exist
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION admin_create_user(
      p_email TEXT,
      p_full_name TEXT,
      p_phone TEXT,
      p_date_of_birth DATE DEFAULT NULL,
      p_job_title TEXT DEFAULT NULL,
      p_property_id UUID,
      p_department_id UUID,
      p_role TEXT DEFAULT 'staff'
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_user_id UUID;
    BEGIN
      -- Create auth user with invitation
      INSERT INTO auth.users (email, phone)
      VALUES (p_email, p_phone)
      RETURNING id INTO v_user_id;
      
      -- Create profile
      INSERT INTO profiles (id, email, full_name, phone, hire_date, is_active)
      VALUES (v_user_id, p_email, p_full_name, p_phone, CURRENT_DATE, true)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        updated_at = now();
      
      -- Assign role
      INSERT INTO user_roles (user_id, role)
      VALUES (v_user_id, p_role::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
      
      -- Assign to property
      INSERT INTO user_properties (user_id, property_id)
      VALUES (v_user_id, p_property_id)
      ON CONFLICT (user_id, property_id) DO NOTHING;
      
      -- Assign to department
      INSERT INTO user_departments (user_id, department_id)
      VALUES (v_user_id, p_department_id)
      ON CONFLICT (user_id, department_id) DO NOTHING;
      
      RETURN v_user_id;
    END;
    $$;
  `;
  
  try {
    const { error } = await supabase.rpc('exec', { sql: createFunctionSQL });
    if (error && !error.message.includes('already exists')) {
      console.warn('⚠️  Could not create admin function:', error);
    }
  } catch (error) {
    console.warn('⚠️  Function check failed, proceeding anyway...');
  }
}

// Execute the script
(async () => {
  console.log('🌐 Prime Hotels Intranet - Bulk User Creation');
  console.log('📝 Browser Console Script');
  console.log('🔧 Preparing environment...');
  
  await ensureAdminFunction();
  
  console.log('🚀 Starting user creation...');
  await createBulkUsers();
  
  console.log('\n✅ Script completed!');
  console.log('💡 Users will need to set their passwords via email invitation');
})();
